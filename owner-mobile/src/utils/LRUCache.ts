// DSA Application 3: LRU (Least Recently Used) Cache
// Guarantees O(1) time complexity for reading and writing cached API responses
// with strict null-safety to prevent NullPointerException / TypeError.

class Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export default class LRUCache<V = any> {
  private capacity: number;
  private cache: Map<string, Node<string, V>>;
  private head: Node<string, V>;
  private tail: Node<string, V>;

  constructor(capacity = 20) {
    this.capacity = Math.max(1, capacity);
    this.cache = new Map();
    this.head = new Node<string, V>('__HEAD__', null as unknown as V);
    this.tail = new Node<string, V>('__TAIL__', null as unknown as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: string): V | null {
    const node = this.cache.get(key);
    if (!node) return null;
    this.remove(node);
    this.insert(node);
    return node.value;
  }

  put(key: string, value: V): void {
    const existing = this.cache.get(key);
    if (existing) {
      this.remove(existing);
    }
    const node = new Node<string, V>(key, value);
    this.insert(node);
    this.cache.set(key, node);

    if (this.cache.size > this.capacity) {
      const lru = this.head.next;
      if (lru && lru !== this.tail) {
        this.remove(lru);
        this.cache.delete(lru.key);
      }
    }
  }

  private remove(node: Node<string, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private insert(node: Node<string, V>): void {
    const prev = this.tail.prev;
    if (prev) {
      prev.next = node;
      node.prev = prev;
      node.next = this.tail;
      this.tail.prev = node;
    }
  }

  clear(): void {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
}
