/** Collaboration scope used by the fractal page. */
export const PUBLIC_COLLABORATION_SCOPE = "public";

const directories = new Map<string, Set<string>>();

export function isPublicScope(scope: string | undefined): boolean {
  return scope === undefined || scope === PUBLIC_COLLABORATION_SCOPE;
}

/** Mesh identity shared by every session that joined this private scope. */
export function meshIdForPrivateScope(scope: string): string {
  let hex = "";
  let hash = 2166136261;
  const data = `${scope}|cofracture-private-scope`;
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < data.length; i++) {
      hash = Math.imul(hash ^ data.charCodeAt(i), 16777619) >>> 0;
    }
    hash = Math.imul(hash ^ round, 16777619) >>> 0;
    hex += hash.toString(16).padStart(8, "0");
  }
  return hex.slice(0, 32);
}

export function announceInScope(scope: string, endpointId: string): void {
  let peers = directories.get(scope);
  if (!peers) {
    peers = new Set();
    directories.set(scope, peers);
  }
  peers.add(endpointId);
}

export function forgetInScope(scope: string, endpointId: string): void {
  directories.get(scope)?.delete(endpointId);
}

export function endpointsInScope(scope: string): string[] {
  return [...(directories.get(scope) ?? [])];
}

export async function waitForScopePeers(
  scope: string,
  myEndpointId: string,
  timeoutMs: number,
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const others = endpointsInScope(scope).filter((id) => id !== myEndpointId);
    if (others.length > 0 || Date.now() >= deadline) return others;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 40);
    });
  }
}
