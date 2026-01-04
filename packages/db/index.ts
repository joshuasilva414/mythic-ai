import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Re-export schema and drizzle-orm utilities
export * from "./schema";
export * from "drizzle-orm";

// Type exports
export type Database = ReturnType<typeof createDatabase>;

export interface DatabaseConfig {
  url: string;
  authToken: string;
}

/**
 * Factory function to create a database instance.
 * Use this for runtime-agnostic database access.
 *
 * For Node.js/Next.js:
 *   import { createClient } from "@libsql/client";
 *
 * For Cloudflare Workers:
 *   import { createClient } from "@libsql/client/web";
 */
export function createDatabase(client: Client) {
  return drizzle(client, { schema });
}

/**
 * Creates a libsql client for Node.js environments.
 * For Cloudflare Workers, import createClient from "@libsql/client/web" instead.
 */
export function createNodeClient(config: DatabaseConfig) {
  return createClient({
    url: config.url,
    authToken: config.authToken,
  });
}

// Backward-compatible singleton for Node.js apps (Next.js, scripts, etc.)
// Uses lazy initialization to avoid crashes in non-Node.js environments (e.g., Cloudflare Workers)
let _db: ReturnType<typeof createDatabase> | null = null;

export function getDb(): ReturnType<typeof createDatabase> {
  if (_db) return _db;

  // Only create the Node.js client if process.env is available
  if (typeof process !== "undefined" && process.env?.TURSO_DATABASE_URL) {
    const nodeClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    _db = drizzle(nodeClient, { schema });
    return _db;
  }

  throw new Error(
    "Database not initialized. In Cloudflare Workers, use createDatabase() with a web client instead."
  );
}

// For backward compatibility - this getter allows `import { db } from 'db'` to work in Node.js
// but will throw an error if accessed in Workers
export const db = new Proxy({} as ReturnType<typeof createDatabase>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
