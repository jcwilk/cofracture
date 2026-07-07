use std::{
    collections::BTreeSet,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use presence_shared::{EndpointId, PresenceSender, PresenceTicket, TopicId};
use n0_future::StreamExt;
use tracing::level_filters::LevelFilter;
use tracing_subscriber_wasm::MakeConsoleWriter;
use wasm_bindgen::{prelude::wasm_bindgen, JsError, JsValue};
use wasm_streams::ReadableStream;

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    tracing_subscriber::fmt()
        .with_max_level(LevelFilter::DEBUG)
        .with_writer(MakeConsoleWriter::default().map_trace_level_to(tracing::Level::DEBUG))
        .without_time()
        .with_ansi(false)
        .init();
}

#[wasm_bindgen]
pub struct PresenceNode(presence_shared::PresenceNode);

#[wasm_bindgen]
impl PresenceNode {
    pub async fn spawn() -> Result<PresenceNode, JsError> {
        let inner = presence_shared::PresenceNode::spawn(None)
            .await
            .map_err(to_js_err)?;
        Ok(Self(inner))
    }

    pub fn endpoint_id(&self) -> String {
        self.0.endpoint_id().to_string()
    }

    pub async fn shutdown(&self) -> Result<(), JsError> {
        self.0.shutdown().await;
        Ok(())
    }

    pub async fn join_mesh(
        &self,
        mesh_id: String,
        bootstrap_candidates: Vec<String>,
    ) -> Result<Session, JsError> {
        let candidates = parse_bootstrap_candidates(bootstrap_candidates)?;
        let (sender, receiver) = self
            .0
            .join_mesh(&mesh_id, candidates)
            .await
            .map_err(to_js_err)?;
        let topic_id = presence_shared::topic_id_from_mesh_id(&mesh_id);
        self.session_from_join(topic_id, sender, receiver).await
    }

    pub async fn join(&self, ticket: String) -> Result<Session, JsError> {
        let ticket = PresenceTicket::deserialize(&ticket).map_err(to_js_err)?;
        let topic_id = ticket.topic_id;
        let (sender, receiver) = self.0.join(&ticket).await.map_err(to_js_err)?;
        self.session_from_join(topic_id, sender, receiver).await
    }

    async fn session_from_join(
        &self,
        topic_id: TopicId,
        sender: PresenceSender,
        receiver: n0_future::boxed::BoxStream<Result<presence_shared::Event>>,
    ) -> Result<Session, JsError> {
        let sender = SessionSender(sender);
        let neighbors = Arc::new(Mutex::new(BTreeSet::new()));
        let neighbors2 = neighbors.clone();
        let receiver = receiver.map(move |event| {
            if let Ok(event) = &event {
                match event {
                    presence_shared::Event::Joined { neighbors } => {
                        neighbors2.lock().unwrap().extend(neighbors.iter().cloned());
                    }
                    presence_shared::Event::NeighborUp { endpoint_id } => {
                        neighbors2.lock().unwrap().insert(*endpoint_id);
                    }
                    presence_shared::Event::NeighborDown { endpoint_id } => {
                        neighbors2.lock().unwrap().remove(endpoint_id);
                    }
                    _ => {}
                }
            }
            event
                .map_err(|err| JsValue::from(&err.to_string()))
                .map(|event| serde_wasm_bindgen::to_value(&event).unwrap())
        });
        let receiver = ReadableStream::from_stream(receiver).into_raw();

        Ok(Session {
            topic_id,
            me: self.0.endpoint_id(),
            neighbors,
            sender,
            receiver,
        })
    }
}

type SessionReceiver = wasm_streams::readable::sys::ReadableStream;

#[wasm_bindgen]
pub struct Session {
    topic_id: TopicId,
    me: EndpointId,
    neighbors: Arc<Mutex<BTreeSet<EndpointId>>>,
    sender: SessionSender,
    receiver: SessionReceiver,
}

#[wasm_bindgen]
impl Session {
    #[wasm_bindgen(getter)]
    pub fn sender(&self) -> SessionSender {
        self.sender.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn receiver(&mut self) -> SessionReceiver {
        self.receiver.clone()
    }

    pub fn id(&self) -> String {
        self.topic_id.to_string()
    }

    pub fn neighbors(&self) -> Vec<String> {
        self.neighbors
            .lock()
            .unwrap()
            .iter()
            .map(|x| x.to_string())
            .collect()
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SessionSender(PresenceSender);

#[wasm_bindgen]
impl SessionSender {
    pub async fn broadcast_presence(
        &self,
        re_min: f64,
        re_max: f64,
        im_min: f64,
        im_max: f64,
        color: String,
    ) -> Result<(), JsError> {
        let bounds = presence_shared::PresenceBounds {
            re_min,
            re_max,
            im_min,
            im_max,
        };
        self.0
            .broadcast_presence(bounds, color)
            .await
            .map_err(to_js_err)?;
        Ok(())
    }
}

fn parse_bootstrap_candidates(candidates: Vec<String>) -> Result<Vec<EndpointId>, JsError> {
    candidates
        .into_iter()
        .map(|id| {
            id.parse::<EndpointId>()
                .map_err(|err| JsError::new(&format!("invalid bootstrap endpoint id {id:?}: {err}")))
        })
        .collect()
}

fn to_js_err(err: impl Into<anyhow::Error>) -> JsError {
    let err: anyhow::Error = err.into();
    JsError::new(&err.to_string())
}
