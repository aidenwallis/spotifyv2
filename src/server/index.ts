import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { callback, redirect } from "./auth/routes";
import { initDB } from "./db";
import { Dependencies } from "./deps";
import { currentlyPlaying } from "./spotify/routes";
import { createContext, tRouter } from "./trpc";
import { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.get("/auth/callback", (c) => {
  const deps = new Dependencies(initDB(c.env.DB), c.env.KV, c.env);
  return callback(c, deps);
});

app.get("/auth/redirect", (c) => {
  const deps = new Dependencies(initDB(c.env.DB), c.env.KV, c.env);
  return redirect(c, deps);
});

app.use(
  "/trpc/*",
  cors({
    origin: ["http://localhost:5173", "https://bachitter.dev"],
    allowMethods: ["GET", "POST"],
    allowHeaders: ["Authorization, Content-Type"],
    maxAge: 600,
  })
);

const addCORS = (v: Response) => {
  const r = v.clone();
  r.headers.append("Access-Control-Allow-Origin", "*");
  r.headers.append("Access-Control-Allow-Methods", "GET, POST");
  r.headers.append("Access-Control-Allow-Headers", "Authorization,Content-Type");
  r.headers.append("Access-Control-Max-Age", "600");
  return r;
};

app.get("/trpc/*", (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req,
    router: tRouter,
    createContext: createContext(c),
  });
});

app.post("/trpc/*", (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req,
    router: tRouter,
    createContext: createContext(c),
  });
});

app.get("/current/:apiToken", (c) => {
  const deps = new Dependencies(initDB(c.env.DB), c.env.KV, c.env);

  return currentlyPlaying(c, deps);
});

app.all("*", () => new Response("", { status: 404 }));

export default app;
