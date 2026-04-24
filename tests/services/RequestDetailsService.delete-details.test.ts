import { beforeEach, describe, expect, test } from "bun:test";
import { RequestDetailsService } from "../../src/services/RequestDetailsService";

describe("RequestDetailsService.deleteHelpRequestDetails", () => {
  let helpRequestRepository: {
    findById: (id: number) => Promise<{ id: number; status: string } | undefined>;
  };
  let requestDetailsRepository: {
    findByHelpRequestId: (id: number) => Promise<{ id: number; helpRequestId: number } | undefined>;
    deleteByHelpRequestId: (id: number) => Promise<boolean>;
  };
  let requestDetailsService: RequestDetailsService;

  beforeEach(() => {
    helpRequestRepository = {
      findById: async () => undefined,
    };

    requestDetailsRepository = {
      findByHelpRequestId: async () => undefined,
      deleteByHelpRequestId: async () => false,
    };

    requestDetailsService = new RequestDetailsService();
    (
      requestDetailsService as RequestDetailsService & {
        getHelpRequestRepository: () => Promise<typeof helpRequestRepository>;
        getRequestDetailsRepository: () => Promise<typeof requestDetailsRepository>;
      }
    ).getHelpRequestRepository = async () => helpRequestRepository;
    (
      requestDetailsService as RequestDetailsService & {
        getHelpRequestRepository: () => Promise<typeof helpRequestRepository>;
        getRequestDetailsRepository: () => Promise<typeof requestDetailsRepository>;
      }
    ).getRequestDetailsRepository = async () => requestDetailsRepository;
  });

  test("returns 404 when task does not exist", async () => {
    const result = await requestDetailsService.deleteHelpRequestDetails(123);

    expect(result).toEqual({
      status: 404,
      body: { message: "Task not found." },
    });
  });

  test("returns 409 when task has a forbidden status", async () => {
    helpRequestRepository.findById = async () =>
      ({
        id: 10,
        status: "MATCHED",
      });

    const result = await requestDetailsService.deleteHelpRequestDetails(10);

    expect(result).toEqual({
      status: 409,
      body: {
        message:
          "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
      },
    });
  });

  test("returns 409 when task has no details", async () => {
    helpRequestRepository.findById = async () =>
      ({
        id: 11,
        status: "OPEN",
      });
    requestDetailsRepository.findByHelpRequestId = async () => undefined;

    const result = await requestDetailsService.deleteHelpRequestDetails(11);

    expect(result).toEqual({
      status: 409,
      body: { message: "Task has no details." },
    });
  });

  test("returns 500 when repository does not confirm deletion", async () => {
    helpRequestRepository.findById = async () =>
      ({
        id: 12,
        status: "OPEN",
      });
    requestDetailsRepository.findByHelpRequestId = async () =>
      ({
        id: 99,
        helpRequestId: 12,
      });
    requestDetailsRepository.deleteByHelpRequestId = async () => false;

    const result = await requestDetailsService.deleteHelpRequestDetails(12);

    expect(result).toEqual({
      status: 500,
      body: { message: "Task details could not be deleted." },
    });
  });

  test("returns 204 when details are deleted successfully", async () => {
    let deletedId: number | undefined;

    helpRequestRepository.findById = async () =>
      ({
        id: 12,
        status: "OPEN",
      });
    requestDetailsRepository.findByHelpRequestId = async () =>
      ({
        id: 99,
        helpRequestId: 12,
      });
    requestDetailsRepository.deleteByHelpRequestId = async (id: number) => {
      deletedId = id;
      return true;
    };

    const result = await requestDetailsService.deleteHelpRequestDetails(12);

    expect(result).toEqual({
      status: 204,
    });
    expect(deletedId).toBe(12);
  });
});
