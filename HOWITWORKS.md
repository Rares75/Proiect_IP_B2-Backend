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

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { taskService } from "@server/services/TaskService";
import * as z from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string(),
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
});

export const taskController = new Hono()
  // GET /tasks — list all tasks
  .get("/", async (c) => {
    const tasks = await taskService.getAllTasks();
    return c.json({ data: tasks }, 200);
  })

  // GET /tasks/:id — get one task by ID
  .get("/:id", async (c) => {
    const { id } = c.req.param();
    const task = await taskService.getTaskById(id);
    if (!task) return c.json({ message: "Task not found" }, 404);
    return c.json({ data: task }, 200);
  })

  // POST /tasks — create a new task
  .post("/", zValidator("json", createTaskSchema), async (c) => {
    const body = c.req.valid("json");
    const task = await taskService.createTask(body);
    return c.json({ data: task }, 201);
  })

  // PUT /tasks/:id — full update
  .put("/:id", zValidator("json", updateTaskSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const updated = await taskService.updateTask(id, body);
    return c.json({ data: updated }, 200);
  })

  // PATCH /tasks/:id — partial update (same structure as PUT here, just semantically different)
  .patch("/:id", zValidator("json", updateTaskSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const updated = await taskService.updateTask(id, body);
    return c.json({ data: updated }, 200);
  })

  // DELETE /tasks/:id — remove a task
  .delete("/:id", async (c) => {
    const { id } = c.req.param();
    await taskService.deleteTask(id);
    return c.json({ message: "Task deleted" }, 200);
  });
```

### Registering a controller in `app.ts`

Once you create a controller, register it in `app.ts`. **To avoid merge conflicts**, always append your route at the end of the chain rather than inserting it in the middle:

```ts
// app.ts
import { taskController } from "./controllers/TaskController";

export const app = new Hono()
  // ... existing middleware ...
  .route("/auth", authController)
  .route("/users", userController)
  .route("/avatar", avatarController)
  .route("/pulse", pulseController)
  .route("/tasks", taskController); // 👈 add yours at the bottom
```

Each person adds their controller at the end of the chain. This makes merges almost conflict-free since everyone is appending rather than editing the same lines.

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
