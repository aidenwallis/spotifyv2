import { CurrentlyPlayingResponse } from "../../spotify";
import { Dependencies } from "../deps";
import { Env } from "../types";
import { randomToken } from "../utils";

export interface ExchangeTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface SpotifyImage {
  width: number;
  height: number;
  url: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  images: SpotifyImage[];
}

export class RatelimitedResponse extends Error {
  constructor() {
    super("ratelimited");
  }
}

let ratelimitEndsAt = 0;

export class SpotifyService {
  private readonly env: Env;
  private readonly kv: KVNamespace;

  constructor(deps: Dependencies) {
    this.env = deps.env;
    this.kv = deps.kv;
  }

  public getAuthURL(state: string) {
    return (
      "https://accounts.spotify.com/authorize?" +
      new URLSearchParams([
        ["response_type", "code"],
        ["client_id", this.env.SPOTIFY_CLIENT_ID],
        ["scope", "user-read-currently-playing"],
        ["state", state],
        ["redirect_uri", this.env.SPOTIFY_REDIRECT_URL],
      ]).toString()
    );
  }

  public generateState() {
    return randomToken(16);
  }

  public async getUser(accessToken: string) {
    const r = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await r.json();
    if (r.status !== 200) {
      throw new Error(`Non 200 http status code returned: ${r.status} - ${JSON.stringify(body)}`);
    }

    return body as SpotifyUser;
  }

  public async getCurrentlyPlaying(userId: string, accessToken: string) {
    if (ratelimitEndsAt > Date.now()) {
      throw new RatelimitedResponse();
    }

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const body = await r.json();
    if (r.status !== 200) {
      if (r.status == 429) {
        const retryAfter = parseInt(r.headers.get("Retry-After") || "");
        ratelimitEndsAt = Date.now() + retryAfter * 1000;
        throw new RatelimitedResponse();
      }
      throw new Error(`Non 200 http status code returned: ${r.status} - ${JSON.stringify(body)}`);
    }

    return body as CurrentlyPlayingResponse;
  }

  public async exchangeToken(code: string) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams([
        ["code", code],
        ["redirect_uri", this.env.SPOTIFY_REDIRECT_URL],
        ["grant_type", "authorization_code"],
      ]).toString(),
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const body = await r.json();

    if (r.status !== 200) {
      throw new Error(`Non 200 http status code returned: ${r.status} - ${JSON.stringify(body)}`);
    }

    return body as ExchangeTokenResponse;
  }

  public async refreshToken(refreshToken: string) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams([
        ["grant_type", "refresh_token"],
        ["refresh_token", refreshToken],
      ]).toString(),
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const body = await r.json();
    if (r.status !== 200) {
      throw new Error(`Non 200 http status code returned: ${r.status} - ${JSON.stringify(body)}`);
    }
    return body as ExchangeTokenResponse;
  }

  private getAuthHeader() {
    return `Basic ${btoa(this.env.SPOTIFY_CLIENT_ID + ":" + this.env.SPOTIFY_CLIENT_SECRET)}`;
  }
}
