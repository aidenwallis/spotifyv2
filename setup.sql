-- This file is temporary until wrangler supports migrations!
CREATE TABLE IF NOT EXISTS users (
  id TEXT NOT NULL PRIMARY KEY,
  avatar TEXT NOT NULL,
  name TEXT DEFAULT NULL,
  spotify_id TEXT NOT NULL,
  api_token TEXT NOT NUll,
  overlay_token TEXT NOT NULL,
  access_token TEXT DEFAULT NULL,
  refresh_token TEXT DEFAULT NULL,
  scopes TEXT NOT NULL,
  token_expires_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL 
);

CREATE UNIQUE INDEX IF NOT EXISTS users_spotify_id ON users (spotify_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_overlay_token ON users (overlay_token);
