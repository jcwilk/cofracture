export const ACTIVITY_KINDS = [
  "self",
  "discovered",
  "connected",
  "connect-failed",
  "removed",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** One activity fact for the console and for in-process subscribers. */
export interface ActivityRecord {
  kind: ActivityKind;
  identity: string;
  color: string;
  reason?: string;
}

export function formatActivityLine(record: ActivityRecord): string {
  const reason = record.reason ? ` ${record.reason}` : "";
  return `presence ${record.kind} ${record.identity} ${record.color}${reason}`;
}
