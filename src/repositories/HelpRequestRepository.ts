import { db } from "../db/index";
import { helpRequest, type HelpRequestType } from "../db/schema";

export class HelpRequestRepository {
  async create(data: Partial<HelpRequestType>): Promise<HelpRequestType | null> {
    const [result] = await db
      .insert(helpRequest)
      .values(data as any)
      .returning();
    return result ?? null;
  }
}

export const helpRequestRepository = new HelpRequestRepository();