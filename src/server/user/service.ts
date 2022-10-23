import { TRPCError } from "@trpc/server";
import { findLargestImage } from "../../spotify";
import { DB, User, UserModel } from "../db";
import { Dependencies } from "../deps";
import { ExchangeTokenResponse, SpotifyUser } from "../spotify/service";
import { hasBits } from "../utils";
export const UserFetchFlags = {
  BypassCache: 1 << 0,
} as const;

export const shouldBypassCache = (flags?: number) => flags && hasBits(flags, UserFetchFlags.BypassCache);
const userIdKey = (id: string) => `users:ids::${id}`;
const userApiTokenKey = (apiToken: string) => `users::api-tokens::${apiToken}`;
const userOverlayTokenKey = (overlayToken: string) => `users:overlay-tokens::${overlayToken}`;

export class UserService {
  private db: DB;
  private kv: KVNamespace;

  constructor(deps: Dependencies) {
    this.db = deps.db;
    this.kv = deps.kv;
  }

  async getUser(id: string, flags?: number) {
    if (!shouldBypassCache(flags)) {
      const user = await this.cachedUser(userIdKey(id));
      if (user) {
        return user;
      }
    }

    const result = await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst();
    await this.cacheUser(result);
    return result ? new UserModel(result) : null;
  }

  async getByApiToken(token: string, flags?: number) {
    if (!shouldBypassCache(flags)) {
      const user = await this.cachedUser(userApiTokenKey(token));
      if (user) {
        return user;
      }
    }

    const result = await this.db.selectFrom("users").where("api_token", "=", token).selectAll().executeTakeFirst();
    await this.cacheUser(result);
    return result ? new UserModel(result) : null;
  }

  async getByOverlayToken(token: string, flags?: number) {
    if (!shouldBypassCache(flags)) {
      const user = await this.cachedUser(userOverlayTokenKey(token));
      if (user) {
        return user;
      }
    }

    const result = await this.db.selectFrom("users").where("overlay_token", "=", token).selectAll().executeTakeFirst();
    await this.cacheUser(result);
    return result ? new UserModel(result) : null;
  }

  async currentUser(userId: string, flags?: number) {
    const user = await this.getUser(userId, flags);
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      apiToken: user.apiToken,
      overlayToken: user.overlayToken,
    };
  }

  async upsertUser(user: SpotifyUser, tokens: ExchangeTokenResponse) {
    const scopes = JSON.stringify(tokens.scope.split(" "));
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await this.db
      .insertInto("users")
      .values({
        id: crypto.randomUUID(),
        name: user.display_name,
        avatar: findLargestImage(user.images),
        spotify_id: user.id,
        api_token: crypto.randomUUID(),
        overlay_token: crypto.randomUUID(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scopes: scopes,
        token_expires_at: tokenExpiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .onConflict((oc) =>
        oc.columns(["spotify_id"]).doUpdateSet({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scopes: scopes,
          token_expires_at: tokenExpiresAt,
        })
      )
      .execute();

    const out = new UserModel(
      await this.db.selectFrom("users").selectAll().where("spotify_id", "=", user.id).executeTakeFirstOrThrow()
    );
    await this.invalidateCache(out);
    return out;
  }

  async resetToken(user: UserModel, column: "api_token" | "overlay_token") {
    await this.db
      .updateTable("users")
      .set({ [column]: crypto.randomUUID() })
      .where("id", "=", user.id)
      .executeTakeFirst();
    await this.invalidateCache(user);
  }

  async updateTokens(user: UserModel, tokens: ExchangeTokenResponse) {
    const fields: {
      access_token?: string;
      refresh_token?: string;
      scopes?: string;
      token_expires_at?: string;
    } = {};
    tokens.access_token && (fields.access_token = tokens.access_token);
    tokens.refresh_token && (fields.refresh_token = tokens.refresh_token);
    tokens.scope && (fields.scopes = JSON.stringify(tokens.scope.split(" ")));
    tokens.expires_in && (fields.token_expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString());
    await this.db.updateTable("users").set(fields).where("id", "=", user.id).executeTakeFirst();
    await this.invalidateCache(user);
  }

  private async cachedUser(key: string): Promise<UserModel | null> {
    const resp = await this.kv.get<User>(key, "json");
    return resp ? new UserModel(resp) : null;
  }

  private async cacheUser(result?: User) {
    if (!result) {
      return;
    }

    const model = new UserModel(result);
    if (!model.tokenExpiresAt || new Date() >= model.tokenExpiresAt) {
      return;
    }

    const expiration = Math.floor(model.tokenExpiresAt.getTime() / 1000) - 1;
    const body = JSON.stringify(result);

    await Promise.allSettled([
      this.kv.put(userIdKey(result.id), body, { expiration }),
      this.kv.put(userApiTokenKey(result.api_token), body, { expiration }),
      this.kv.put(userOverlayTokenKey(result.overlay_token), body, { expiration }),
    ]);
  }

  private async invalidateCache(user: UserModel) {
    await Promise.allSettled([
      this.kv.delete(userIdKey(user.id)),
      this.kv.delete(userApiTokenKey(user.apiToken)),
      this.kv.delete(userOverlayTokenKey(user.overlayToken)),
    ]);
  }
}
