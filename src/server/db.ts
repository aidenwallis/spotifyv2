import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export interface User {
  id: string;
  name: string;
  avatar: string | null;
  spotify_id: string;
  api_token: string;
  overlay_token: string;
  access_token: string | null;
  refresh_token: string | null;
  scopes: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export class UserModel {
  readonly id: string;
  readonly name: string;
  readonly avatar: string | null;
  readonly spotifyId: string;
  readonly apiToken: string;
  readonly overlayToken: string;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly scopes: string[];
  readonly tokenExpiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.avatar = user.avatar;
    this.spotifyId = user.spotify_id;
    this.apiToken = user.api_token;
    this.overlayToken = user.overlay_token;
    this.accessToken = user.access_token;
    this.refreshToken = user.refresh_token;
    this.scopes = this.parseScopes(user.scopes);
    this.tokenExpiresAt = user.token_expires_at ? new Date(user.token_expires_at) : null;
    this.createdAt = new Date(user.created_at);
    this.updatedAt = new Date(user.updated_at);
  }

  private parseScopes(v: string): string[] {
    try {
      return JSON.parse(v) as string[];
    } catch (error) {
      return [];
    }
  }
}

export interface Database {
  users: User;
}

export const initDB = (db: D1Database) => new Kysely<Database>({ dialect: new D1Dialect({ database: db }) });
export type DB = ReturnType<typeof initDB>;
