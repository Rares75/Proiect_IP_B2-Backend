# How the Server Works

A quick guide for contributors on the architecture, conventions, and patterns used in this codebase. Read this before touching anything.

---

## Folder Structure

```
server/src/
├── controllers/        # HTTP layer — handles incoming requests
├── services/           # Business logic — validates data, orchestrates operations
├── repositories/       # Data access layer — the only place that talks to the DB
├── db/
│   ├── index.ts        # Drizzle DB connection
│   └── schema.ts       # All table definitions and relations
├── services/auth/      # Better Auth setup and custom plugins
├── mailers/            # Email templates and sending logic
├── utils/              # Logger, error handler, etc.
├── app.ts              # Hono app — mounts all controllers
└── index.ts            # Entry point — starts the Bun server
```

---

## The Three Layers

Every feature in this backend goes through three layers in this order:

```
Request → Controller → Service → Repository → Database
```

Never skip layers. A controller should not touch the DB. A repository should not have business logic.

---

## Controllers

Controllers live in `src/controllers/` and are the **entry point for all HTTP requests**. Their only job is to:

1. Parse and validate the raw request (query params, body, etc.)
2. Call the appropriate service method
3. Return an HTTP response

They do **not** contain business logic. They do **not** touch the database.

### Example — `TaskController.ts`

---

## Controllers

Controllers live in `src/controllers/` and are the **entry point for all HTTP requests**. Their only job is to:

1. Parse and validate the raw request (query params, body, etc.)
2. Call the appropriate service method
3. Return an HTTP response

They do **not** contain business logic. They do **not** touch the database.

---

## Controller Pattern (Decorator-Based)

Controllers are defined using the `@Controller` decorator. Each controller must expose a static `controller` property, which is an instance of `Hono`.

The decorator automatically registers the controller to the global app, so **no manual `.route()` calls are needed in `app.ts`**.

### Example — `TestController.ts`

```ts
import { Hono } from "hono";
import { Controller } from "../utils/Controller";

@Controller("/test")
export class TestController {
  static controller = new Hono()
    .get("/1", (c) => {
      return c.text("test");
    })
    .get("/some", (c) => {
      return c.json("some", 200);
    });
}
```

---

## How it works

- The global app is stored on `globalThis`
- When the controller file is imported, the decorator runs
- The decorator registers the controller using:

```ts
app.route(basePath, controller);
```

---

## Important Notes

### 1. Controllers must be imported

Controllers are only registered when their files are executed. This means they must be imported somewhere in your app.

---

### 2. No manual registration in `app.ts`

❌ Do NOT do this anymore:

```ts
app.route("/test", testController);
```

✅ The decorator handles everything automatically.

---

### 3. Avoid merge conflicts

To prevent merge conflicts, do **not** maintain a central `index.ts` file with all controllers.

```ts
// app.ts
import { readdirSync, statSync } from "fs";
import { join } from "path";

async function loadControllers(dir: string) {
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);

    if (statSync(fullPath).isDirectory()) {
      await loadControllers(fullPath);
    } else if (file.endsWith(".ts")) {
      await import(fullPath);
    }
  }
}
```

---

## Summary

- Use `@Controller('/path')` on classes
- Define routes inside a static `controller: Hono`
- Do not manually register routes
- Ensure controller files are imported (prefer auto-loading)

---

## Services

Services live in `src/services/` and contain the **business logic** of the application. Their job is to:

1. Validate incoming data against business rules
2. Coordinate between repositories (and other services if needed)
3. Return clean, processed results to the controller

They do **not** parse HTTP requests. They do **not** write raw SQL.

### Example — `TaskService.ts`

```ts
import { taskRepository } from "@server/repositories/TaskRepository";
import { handleError } from "@server/utils/handleError";
import type { TaskType } from "@server/db/schema";

export class TaskService {
  async createTask(data: Partial<TaskType>) {
    // Business rule: a task needs at least a title and assignee
    if (!data.title || !data.assigneeId) {
      throw new Error("Title and assigneeId are required");
    }

    try {
      const task = await taskRepository.create(data);
      return task;
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  async getTaskById(id: string) {
    try {
      return await taskRepository.getOne(id);
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  async getAllTasks() {
    try {
      return await taskRepository.getAll();
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  async updateTask(id: string, data: Partial<TaskType>) {
    try {
      return await taskRepository.update(id, data);
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  async deleteTask(id: string) {
    try {
      await taskRepository.delete(id);
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }
}

export const taskService = new TaskService();
```

The service is instantiated and exported as a singleton (`taskService`). The controller imports that singleton — it never calls `new TaskService()` itself.

---

## Repositories

Repositories live in `src/repositories/` and are the **only place in the codebase that directly interacts with the database**. Keep it that way.

Their job is simple: execute database queries and return typed results. No business logic. No validation. Just CRUD.

All repositories implement the `IRepository<T>` interface from `IRepository.ts`:

```ts
export interface IRepository<T> {
  getOne: (id: string) => Promise<T | null>;
  getAll: () => Promise<T[]>;
  create: (data: Partial<T>) => Promise<T | null>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<any>;
}
```

### Example — `TaskRepository.ts`

```ts
import { db } from "@server/db";
import { task, type TaskType } from "@server/db/schema";
import { eq } from "drizzle-orm";
import type { IRepository } from "./IRepository";

export class TaskRepository implements IRepository<TaskType> {
  async getOne(id: string): Promise<TaskType | null> {
    const [result] = await db.select().from(task).where(eq(task.id, id));
    return result ?? null;
  }

  async getAll(): Promise<TaskType[]> {
    return await db.select().from(task);
  }

  async create(data: Partial<TaskType>): Promise<TaskType | null> {
    const [result] = await db
      .insert(task)
      .values(data as any)
      .returning();
    return result ?? null;
  }

  async update(id: string, data: Partial<TaskType>): Promise<TaskType> {
    const [result] = await db
      .update(task)
      .set(data as any)
      .where(eq(task.id, id))
      .returning();
    if (!result) throw new Error(`Task with id ${id} not found`);
    return result;
  }

  async delete(id: string): Promise<any> {
    await db.delete(task).where(eq(task.id, id));
    return { affected: 1 };
  }
}

export const taskRepository = new TaskRepository();
```

If you need a query that goes beyond the basic interface (e.g. filtering by status, geo queries, joins), add a custom method directly to the class — don't hack it through the service layer.

---

## Database — Drizzle ORM

### Connection

The DB connection lives in `src/db/index.ts`. It reads `DATABASE_URL` from env and initializes Drizzle with the full schema:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema,
});
```

Import `db` from here in your repositories — never create a second connection.

### Defining a table

All tables are defined in `src/db/schema.ts`. Here's what adding a new table looks like:

```ts
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations, type InferSelectModel } from "drizzle-orm";
import { user } from "./schema"; // reference other tables for foreign keys

export const task = pgTable("task", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assigneeId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Relations — used by Drizzle's relational query API
export const taskRelations = relations(task, ({ one }) => ({
  assignee: one(user, {
    fields: [task.assigneeId],
    references: [user.id],
  }),
}));

// Export the inferred type so repositories and services can use it
export type TaskType = InferSelectModel<typeof task>;
```

### Running migrations

After changing the schema, generate and apply a migration:

```bash
bun db   # generates a migration file and migrates the database
bun db:generate # only generates the migration
bun db:migrate    # migrates the database to the latest schema
```

Never edit the generated migration files by hand. If you mess up a migration, generate a new one that fixes it.

---

## Quick Reference — What goes where?

| Question                                | Answer                                        |
| --------------------------------------- | --------------------------------------------- |
| Where do I parse query params?          | Controller                                    |
| Where do I validate business rules?     | Service                                       |
| Where do I write SQL / Drizzle queries? | Repository                                    |
| Where do I add a new table?             | `db/schema.ts`                                |
| Where do I register a new route?        | `app.ts` (append at the bottom)               |
| Where do I add a custom DB query?       | Add a method to the relevant Repository class |

---

## Environment Variables

All required env vars are validated on startup via `src/env.ts` using Zod. If a required var is missing, the server will not start. Add any new vars to the schema there, and to your `.env` file locally.

## Scripts

To first run the application , you will need to install docker desktop for running the local database.Then run :

```bash
bun run dev (or bun dev it's the same thing)
```
