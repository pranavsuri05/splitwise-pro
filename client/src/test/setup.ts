import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// @testing-library/react's automatic afterEach cleanup relies on detecting
// global test hooks, which this project disables (vitest.config.ts sets
// `globals: false`) — so it must be registered explicitly here instead.
afterEach(() => {
  cleanup()
})

// Node 22+'s own experimental global Web Storage implementation shadows
// jsdom's and is non-functional without a --localstorage-file backing
// file, so tests get a real, working in-memory Storage instead.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

beforeEach(() => {
  const storage = new MemoryStorage()
  vi.stubGlobal('localStorage', storage)
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
})
