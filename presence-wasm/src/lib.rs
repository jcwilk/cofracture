use std::{
    collections::BTreeSet,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use presence_shared::{EndpointId, PresenceSender, PresenceTicket, TopicId};
use n0_future::StreamExt;
use serde::{Deserialize, Serialize};
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

    pub async fn create(&self) -> Result<Session, JsError> {
        let ticket = PresenceTicket::new_random();
        self.join_inner(ticket).await
    }

    pub async fn join(&self, ticket: String) -> Result<Session, JsError> {
        let ticket = PresenceTicket::deserialize(&ticket).map_err(to_js_err)?;
        self.join_inner(ticket).await
    }

    async fn join_inner(&self, ticket: PresenceTicket) -> Result<Session, JsError> {
        let (sender, receiver) = self.0.join(&ticket).await.map_err(to_js_err)?;
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

        let mut ticket = ticket;
        ticket.bootstrap.insert(self.0.endpoint_id());

        Ok(Session {
            topic_id: ticket.topic_id,
            bootstrap: ticket.bootstrap,
            neighbors,
            me: self.0.endpoint_id(),
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
    bootstrap: BTreeSet<EndpointId>,
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

    pub fn ticket(&self, opts: JsValue) -> Result<String, JsError> {
        let opts: TicketOpts = serde_wasm_bindgen::from_value(opts)?;
        let mut ticket = PresenceTicket::new(self.topic_id);
        if opts.include_myself {
            ticket.bootstrap.insert(self.me);
        }
        if opts.include_bootstrap {
            ticket.bootstrap.extend(self.bootstrap.iter().copied());
        }
        if opts.include_neighbors {
            let neighbors = self.neighbors.lock().unwrap();
            ticket.bootstrap.extend(neighbors.iter().copied());
        }
        Ok(ticket.serialize())
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketOpts {
    pub include_myself: bool,
    pub include_bootstrap: bool,
    pub include_neighbors: bool,
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

fn to_js_err(err: impl Into<anyhow::Error>) -> JsError {
    let err: anyhow::Error = err.into();
    JsError::new(&err.to_string())
}
