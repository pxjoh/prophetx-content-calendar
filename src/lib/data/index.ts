import { memoryStore } from "./memory-store";
import { supabaseStore } from "./supabase-store";
import type { DataStore } from "./types";

export const usingLiveDatabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Supabase is provisioned (see supabase/migrations/20260724120000_init_schema.sql
// for the schema) and used automatically once its env vars are present.
// Otherwise every team member shares this process's in-memory sample data,
// which is fine for local development but resets on restart and is NOT
// shared across machines.
export function getDataStore(): DataStore {
  return usingLiveDatabase ? supabaseStore : memoryStore;
}

export type * from "./types";
