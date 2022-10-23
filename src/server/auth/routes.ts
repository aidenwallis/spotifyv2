import { AuthService } from "./service";
import { getSha256 } from "../utils";
import { parse, serialize } from "cookie";
import { SpotifyService } from "../spotify/service";
import { UserService } from "../user/service";
import { Dependencies } from "../deps";

const stateCookieName = "state";
const sessionCookieName = "session";

export async function redirect(_: Request, deps: Dependencies) {
  const service = new SpotifyService(deps);
  const state = service.generateState();
  const hashedState = await getSha256(state);
  return new Response("", {
    headers: {
      Location: service.getAuthURL(state),
      "Set-Cookie": serialize(stateCookieName, hashedState, {
        httpOnly: true,
        maxAge: 3600,
      }),
    },
    status: 307,
  });
}

export async function callback(req: Request, deps: Dependencies) {
  const authService = new AuthService(deps.env);
  const spotifyService = new SpotifyService(deps);
  const userService = new UserService(deps);

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return new Response("No code specified.", { status: 400 });
  }

  const state = searchParams.get("state");
  if (!state) {
    return new Response("No state specified.", { status: 400 });
  }

  const cookieState = parse(req.headers.get("Cookie") || "");
  if (!cookieState[stateCookieName] || (await getSha256(state)) !== cookieState[stateCookieName]) {
    return new Response("Invalid state", { status: 400 });
  }

  const tokens = await spotifyService.exchangeToken(code);
  const spotifyUser = await spotifyService.getUser(tokens.access_token);
  const user = await userService.upsertUser(spotifyUser, tokens);

  const token = await authService.signToken(user);

  return new Response("", {
    headers: {
      Location: "/",
      "Set-Cookie": serialize(sessionCookieName, token, {
        domain: "localhost",
        httpOnly: false,
        path: "/",
        maxAge: 3600,
      }),
    },
    status: 307,
  });
}
