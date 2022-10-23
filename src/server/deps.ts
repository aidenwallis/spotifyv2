import { DB } from "./db";
import { Env } from "./types";

export class Dependencies {
  constructor(readonly db: DB, readonly kv: KVNamespace, readonly env: Env) {}
}
