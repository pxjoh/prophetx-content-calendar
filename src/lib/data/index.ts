import { memoryStore } from "./memory-store";
import type { DataStore } from "./types";

// Supabase-backed persistence lands here once `vercel integration add supabase`
// has been run and NEXT_PUBLIC_SUPABASE_URL is present — see
// supabase/migrations/20260724120000_init_schema.sql for the schema it will
// read/write. Until then every team member shares this process's in-memory
// sample data, which is fine for local development but resets on restart and
// is NOT shared across machines.
export function getDataStore(): DataStore {
  return memoryStore;
}

export const usingLiveDatabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export type * from "./types";
