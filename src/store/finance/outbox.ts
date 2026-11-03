import type { SyncStep } from "./types";

export interface OutboxGroup {
  id: string;
  uid: string;
  steps: SyncStep[];
  cursor: number;
  /** A step failed: the steps before `cursor` are being rolled back. */
  undoing?: boolean;
}

export const OUTBOX_KEY = "mf-outbox";
let memory: OutboxGroup[] = [];
// Set when localStorage rejected a write, so reads don't return stale data.
let memoryOnly = false;

const storage = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const loadOutbox = (): OutboxGroup[] => {
  const store = storage();
  if (!store || memoryOnly) return memory;
  try {
    const raw = store.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxGroup[]) : [];
  } catch {
    return [];
  }
};

export const saveOutbox = (groups: OutboxGroup[]): void => {
  const store = storage();
  memory = groups;
  if (!store) return;
  try {
    if (groups.length === 0) store.removeItem(OUTBOX_KEY);
    else store.setItem(OUTBOX_KEY, JSON.stringify(groups));
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
};
