import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Router } from "itty-router";

import { callback, redirect } from "./auth/routes";
import { initDB } from "./db";
import { Dependencies } from "./deps";
import { currentlyPlaying } from "./spotify/routes";
import { createContext, tRouter } from "./trpc";
import { Env } from "./types";

const router = Router();

router.get("/auth/callback", callback);
router.get("/auth/redirect", redirect);

const addCORS = (v: Response) => {
  const r = v.clone();
  r.headers.append("Access-Control-Allow-Origin", "*");
  r.headers.append("Access-Control-Allow-Methods", "GET, POST");
  r.headers.append("Access-Control-Allow-Headers", "Authorization,Content-Type");
  r.headers.append("Access-Control-Max-Age", "600");
  return r;
};

router.post("/trpc/*", (request: Request, deps: Dependencies) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: request,
    router: tRouter,
    createContext: createContext(deps),
  });
});

router.get("/trpc/*", (request: Request, deps: Dependencies) => {
  console.log("test");
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: request,
    router: tRouter,
    createContext: createContext(deps),
  });
});

router.get("/current/:apiToken", currentlyPlaying);

router.all("*", () => new Response("", { status: 404 }));

export default {
  fetch: async (request: Request, env: Env) => {
    if (request.method === "OPTIONS") {
      return addCORS(new Response("", { status: 204 }));
    }

    const deps = new Dependencies(initDB(env.DB), env.KV, env);

    let resp = (await router
      .handle(request, deps)
      .catch((error) => new Response(error.message || "Server Error", { status: error.status || 500 }))) as Response;
    if (!resp) {
      resp = new Response("", { status: 404 });
    }

    return addCORS(resp);
  },
};
