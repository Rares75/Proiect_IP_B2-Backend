import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { db } from "../../src/db";
import { HelpRequestRepository } from "../../src/db/repositories/helpRequest.repository";

describe("HelpRequestRepository.deleteWithOfferRejection", () => {
	let transactionSpy: ReturnType<typeof spyOn> | undefined;

	afterEach(() => {
		transactionSpy?.mockRestore();
		transactionSpy = undefined;
	});

	test("runs the notification callback before deleting the help request", async () => {
		const repo = new HelpRequestRepository();
		const pendingRows = [{ id: 11, volunteerId: 22 }];
		const volunteerRows = [{ id: 22, userId: "vol-1" }];
		let deleteCalled = false;

		transactionSpy = spyOn(db as any, "transaction").mockImplementation(
			async (callback: (tx: any) => Promise<any>) => {
				let selectCall = 0;

				const tx = {
					select: () => ({
						from: () => ({
							where: async () => {
								selectCall += 1;
								return selectCall === 1 ? pendingRows : volunteerRows;
							},
						}),
					}),
					update: () => ({
						set: () => ({
							where: async () => undefined,
						}),
					}),
					delete: () => ({
						where: () => ({
							returning: async () => {
								deleteCalled = true;
								return [{ id: 1 }];
							},
						}),
					}),
				};

				return await callback(tx);
			},
		);

		let callbackSawDelete = false;
		const result = await repo.deleteWithOfferRejection(1, async () => {
			callbackSawDelete = deleteCalled;
		});

		expect(callbackSawDelete).toBe(false);
		expect(deleteCalled).toBe(true);
		expect(result).toEqual({
			deleted: true,
			pendingOffers: [
				{
					id: 11,
					volunteerId: 22,
					volunteerUserId: "vol-1",
				},
			],
		});
	});
});

