import type { db } from "../";

export type DatabaseClient = Pick<typeof db, "insert" | "select" | "update">;
