import { beforeEach, describe, expect, test } from "bun:test";
import { helpRequestRepository } from "../../src/db/repositories/helpRequests.repository";
import { helpRequestService } from "../../src/services/HelpRequestService";

describe("HelpRequestService.deleteHelpRequestDetails", () => {
  const originalFindById = helpRequestRepository.findById;
  const originalFindDetailsByHelpRequestId = helpRequestRepository.findDetailsByHelpRequestId;
  const originalDeleteDetailsByHelpRequestId = helpRequestRepository.deleteDetailsByHelpRequestId;

  beforeEach(() => {
    helpRequestRepository.findById = originalFindById;
    helpRequestRepository.findDetailsByHelpRequestId = originalFindDetailsByHelpRequestId;
    helpRequestRepository.deleteDetailsByHelpRequestId = originalDeleteDetailsByHelpRequestId;
  });

  test("returns 404 when task does not exist", async () => {
    helpRequestRepository.findById = async () => undefined;

    const result = await helpRequestService.deleteHelpRequestDetails(123);

    expect(result).toEqual({
      status: 404,
      body: { error: "Task not found." },
    });
  });

  test("returns 409 when task has a forbidden status", async () => {
    helpRequestRepository.findById = async () =>
      ({
        id: 10,
        status: "MATCHED",
      }) as Awaited<ReturnType<typeof originalFindById>>;

    const result = await helpRequestService.deleteHelpRequestDetails(10);

    expect(result).toEqual({
      status: 409,
      body: {
        error: "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
      },
    });
  });

  test("returns 409 when task has no details", async () => {
    helpRequestRepository.findById = async () =>
      ({
        id: 11,
        status: "OPEN",
      }) as Awaited<ReturnType<typeof originalFindById>>;
    helpRequestRepository.findDetailsByHelpRequestId = async () => undefined;

    const result = await helpRequestService.deleteHelpRequestDetails(11);

    expect(result).toEqual({
      status: 409,
      body: { error: "Task has no details." },
    });
  });

  test("returns 204 when details are deleted successfully", async () => {
    let deletedId: number | undefined;

    helpRequestRepository.findById = async () =>
      ({
        id: 12,
        status: "OPEN",
      }) as Awaited<ReturnType<typeof originalFindById>>;
    helpRequestRepository.findDetailsByHelpRequestId = async () =>
      ({
        id: 99,
        helpRequestId: 12,
      }) as Awaited<ReturnType<typeof originalFindDetailsByHelpRequestId>>;
    helpRequestRepository.deleteDetailsByHelpRequestId = async (id: number) => {
      deletedId = id;
      return true;
    };

    const result = await helpRequestService.deleteHelpRequestDetails(12);

    expect(result).toEqual({
      status: 204,
    });
    expect(deletedId).toBe(12);
  });
});
