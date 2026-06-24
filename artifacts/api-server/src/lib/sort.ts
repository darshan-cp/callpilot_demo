import type { Prisma } from "@workspace/db";

export type SortOrder = "asc" | "desc";

export function buildLeadOrderBy(
  sortBy: string,
  sortOrder: SortOrder,
): Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[] {
  const dir = sortOrder;
  switch (sortBy) {
    case "firstName":
      return [{ firstName: dir }, { lastName: dir }];
    case "company":
      return { company: dir };
    case "phoneNumber":
      return { phoneNumber: dir };
    case "status":
      return { status: dir };
    case "campaignName":
      return { campaign: { name: dir } };
    case "createdAt":
    default:
      return { createdAt: dir };
  }
}

export function buildResultOrderBy(
  sortBy: string,
  sortOrder: SortOrder,
): Prisma.CallResultOrderByWithRelationInput | Prisma.CallResultOrderByWithRelationInput[] {
  const dir = sortOrder;
  switch (sortBy) {
    case "firstName":
      return [{ lead: { firstName: dir } }, { lead: { lastName: dir } }];
    case "company":
      return { lead: { company: dir } };
    case "phoneNumber":
      return { lead: { phoneNumber: dir } };
    case "status":
      return { status: dir };
    case "confidenceScore":
      return { confidenceScore: dir };
    case "calledAt":
    default:
      return { calledAt: dir };
  }
}

export function buildCallLogOrderBy(
  sortBy: string,
  sortOrder: SortOrder,
): Prisma.CallResultOrderByWithRelationInput | Prisma.CallResultOrderByWithRelationInput[] {
  const dir = sortOrder;
  switch (sortBy) {
    case "firstName":
      return [{ lead: { firstName: dir } }, { lead: { lastName: dir } }];
    case "phoneNumber":
      return { lead: { phoneNumber: dir } };
    case "humanDetected":
      return { humanDetected: dir };
    case "status":
      return { status: dir };
    case "callDuration":
      return { callDuration: dir };
    case "endedReason":
      return { endedReason: dir };
    case "campaignName":
      return { campaign: { name: dir } };
    case "calledAt":
    default:
      return { calledAt: dir };
  }
}
