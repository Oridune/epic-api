export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private capacity: number;

  constructor(capacity = 1000, map: Map<K, V> = new Map()) {
    this.cache = map;
    this.capacity = capacity;
  }

  public getMap(): Map<K, V> {
    return this.cache;
  }

  public get size(): number {
    return this.cache.size;
  }

  public get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    const value = this.cache.get(key)!;

    // Move key to the end to mark it as recently used
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      // Remove the least recently used item (first item in the Map)
      const lruKey = this.cache.keys().next().value;
      lruKey && this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
  }

  public has(key: K): boolean {
    return this.cache.has(key);
  }

  public delete(key: K): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
