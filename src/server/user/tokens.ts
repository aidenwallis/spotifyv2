import { TRPCError } from "@trpc/server";
import { UserModel } from "../db";
import { SpotifyService } from "../spotify/service";
import { UserFetchFlags, UserService } from "./service";

export async function validateTokens(userService: UserService, spotifyService: SpotifyService, user: UserModel) {
  if (user.tokenExpiresAt && new Date(Date.now() - 5_000) < user.tokenExpiresAt) {
    // hasn't expired yet
    return user;
  }

  // token is either missing or needs to be refreshed

  if (!(user.tokenExpiresAt && user.accessToken && user.refreshToken)) {
    // we lost auth for the user.
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  // token can be refreshed
  try {
    const tokens = await spotifyService.refreshToken(user.refreshToken);
    await userService.updateTokens(user, tokens);
  } catch (error) {
    console.error("Failed to refresh and update token:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const newUser = await userService.getUser(user.id, UserFetchFlags.BypassCache);
  if (!newUser) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  return newUser;
}
