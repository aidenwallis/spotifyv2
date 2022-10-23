import { Database } from "./db";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;

  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REDIRECT_URL: string;

  CURRENT_JWT_SECRET: string;
}
