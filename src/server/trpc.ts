import { GetInferenceHelpers, inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { AuthService } from "./auth/service";
import { Dependencies } from "./deps";
import { UserFetchFlags, UserService } from "./user/service";
import { z } from "zod";
import { SpotifyService } from "./spotify/service";
import { UserModel } from "./db";
import { validateTokens } from "./user/tokens";

const t = initTRPC.context<Context>().create();

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const tokenOutput = (user: UserModel) => ({
  accessToken: user.accessToken,
  expiresAt: user.tokenExpiresAt,
});

export const tRouter = t.router({
  currentUser: t.procedure.use(isAuthed).query(({ ctx }) => new UserService(ctx.deps).currentUser(ctx.userId)),

  getSpotifyToken: t.procedure
    .input(
      z.object({
        overlayToken: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userService = new UserService(ctx.deps);
      const spotifyService = new SpotifyService(ctx.deps);
      const user = await userService.getByOverlayToken(input.overlayToken);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return tokenOutput(await validateTokens(userService, spotifyService, user));
    }),

  resetToken: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        type: z.enum(["apiToken", "overlayToken"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.deps);
      const user = await userService.getUser(ctx.userId, UserFetchFlags.BypassCache);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      switch (input.type) {
        case "apiToken": {
          await userService.resetToken(user, "api_token");
          break;
        }

        case "overlayToken": {
          await userService.resetToken(user, "overlay_token");
          break;
        }
      }

      return userService.currentUser(ctx.userId, UserFetchFlags.BypassCache);
    }),
});

export function createContext(deps: Dependencies) {
  const authService = new AuthService(deps.env);

  const resolveUserId = async (req: Request) => {
    const header = req.headers.get("Authorization");
    if (!header) {
      return null;
    }

    const [method, token] = header.split(" ");
    if (!(method && token) || method !== "Bearer") {
      return null;
    }

    return await authService.verifyToken(token);
  };

  return async ({ req }: FetchCreateContextFnOptions) => {
    return { deps, userId: await resolveUserId(req) };
  };
}

export type AppRouter = typeof tRouter;
export type Context = inferAsyncReturnType<ReturnType<typeof createContext>>;
