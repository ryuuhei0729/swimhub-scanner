// Minimal KV binding type for environments without @cloudflare/workers-types.
// When @cloudflare/workers-types is installed, its KVNamespace interface merges with this.
declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  }

  interface CloudflareEnv {
    RATE_LIMIT_KV: KVNamespace;
  }
}

export {};
