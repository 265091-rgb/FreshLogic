interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<any>>();
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = TTL): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateCache(...keys: string[]): void {
  keys.forEach((k) => store.delete(k));
}

export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
