import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

const Controller = () => (_target: unknown) => {};

mock.module("../../src/utils/controller", () => ({
  Controller,
}));

const { RequestDetailsController } = await import(
  "../../src/controllers/requestDetailsController"
);

type TaskStatus =
  | "OPEN"
  | "MATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

type TaskRecord = {
  id: number;
  status: TaskStatus;
  requestDetails: { id: number; helpRequestId: number } | null;
};

describe("DELETE /tasks/:id/details", () => {
  let app: Hono;
  let store: Map<number, TaskRecord>;

  const deleteDetails = (id: string | number) =>
    app.request(`http://localhost/tasks/${id}/details`, {
      method: "DELETE",
    });

  const getTask = (id: string | number) =>
    app.request(`http://localhost/tasks/${id}`, {
      method: "GET",
    });

  beforeEach(() => {
    store = new Map<number, TaskRecord>();

    const requestDetailsService = {
      deleteHelpRequestDetails: async (id: number) => {
        const task = store.get(id);

        if (!task) {
          return {
            status: 404 as const,
            body: { message: "Task not found." },
          };
        }

        if (
          ["MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"].includes(
            task.status,
          )
        ) {
          return {
            status: 409 as const,
            body: {
              message:
                "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
            },
          };
        }

        if (!task.requestDetails) {
          return {
            status: 409 as const,
            body: { message: "Task has no details." },
          };
        }

        store.set(id, {
          ...task,
          requestDetails: null,
        });

        return {
          status: 204 as const,
        };
      },
    };

    app = new Hono();
    app.route(
      "/tasks",
      new RequestDetailsController(requestDetailsService as any).controller,
    );
    app.get("/tasks/:id", (c) => {
      const id = Number(c.req.param("id"));
      const found = store.get(id);

      if (!found) {
        return c.json({ message: "Task not found." }, 404);
      }

      return c.json(
        {
          id: found.id,
          status: found.status,
          requestDetails: found.requestDetails,
        },
        200,
      );
    });
  });

  test("returns 204 and subsequent GET shows requestDetails null", async () => {
    store.set(1, {
      id: 1,
      status: "OPEN",
      requestDetails: {
        id: 101,
        helpRequestId: 1,
      },
    });

    const deleteResponse = await deleteDetails(1);
    expect(deleteResponse.status).toBe(204);

    const getResponse = await getTask(1);
    const body = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(body.requestDetails).toBeNull();
  });

  test("returns 409 when task has no details", async () => {
    store.set(2, {
      id: 2,
      status: "OPEN",
      requestDetails: null,
    });

    const response = await deleteDetails(2);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ message: "Task has no details." });
  });

  test("returns 404 when task does not exist", async () => {
    const response = await deleteDetails(999);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: "Task not found." });
  });

  test("returns 409 when task status is MATCHED", async () => {
    store.set(3, {
      id: 3,
      status: "MATCHED",
      requestDetails: {
        id: 103,
        helpRequestId: 3,
      },
    });

    const response = await deleteDetails(3);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      message:
        "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
    });
  });

  test("returns 409 when task status is IN_PROGRESS", async () => {
    store.set(4, {
      id: 4,
      status: "IN_PROGRESS",
      requestDetails: {
        id: 104,
        helpRequestId: 4,
      },
    });

    const response = await deleteDetails(4);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      message:
        "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
    });
  });

  test("returns 409 when task status is COMPLETED", async () => {
    store.set(5, {
      id: 5,
      status: "COMPLETED",
      requestDetails: {
        id: 105,
        helpRequestId: 5,
      },
    });

    const response = await deleteDetails(5);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      message:
        "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
    });
  });
});
