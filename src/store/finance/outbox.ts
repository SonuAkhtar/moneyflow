import type { SyncStep } from "./types";

export interface OutboxGroup {
  id: string;
  uid: string;
  steps: SyncStep[];
  cursor: number;
}

const KEY = "mf-outbox";
let memory: OutboxGroup[] = [];

const storage = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const loadOutbox = (): OutboxGroup[] => {
  const store = storage();
  if (!store) return memory;
  try {
    const raw = store.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxGroup[]) : [];
  } catch {
    return [];
  }
};

export const saveOutbox = (groups: OutboxGroup[]): void => {
  const store = storage();
  if (!store) {
    memory = groups;
    return;
  }
  try {
    if (groups.length === 0) store.removeItem(KEY);
    else store.setItem(KEY, JSON.stringify(groups));
  } catch {
    memory = groups;
  }
};
