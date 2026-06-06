import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

export const hasDatabase = Boolean(connectionString);

export const db = connectionString
  ? drizzle(neon(connectionString), { schema })
  : drizzle.mock({ schema });

export type Database = typeof db;
