import { z } from "zod";

const id = z.string().min(1);
const date = z.iso.datetime();
const count = z.number().int().nonnegative();
export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;
export const exportStatusSchema = z.enum([
  "Pending",
  "Processing",
  "Completed",
  "Failed",
]);
export type ExportStatus = z.infer<typeof exportStatusSchema>;
export const roleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

export const categorySchema = z.object({
  id,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: id.nullable(),
  tenantId: id,
  createdAt: date,
  updatedAt: date,
});
const authorSchema = z.object({
  id,
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});
export const contentSchema = z.object({
  id,
  title: z.string(),
  slug: z.string(),
  body: z.string(),
  status: contentStatusSchema,
  publishedAt: date.nullable(),
  authorId: id,
  tenantId: id,
  categoryId: id.nullable(),
  createdAt: date,
  updatedAt: date,
});
export const contentFullSchema = contentSchema.extend({
  category: categorySchema.nullable(),
  author: authorSchema,
});
export const contentSummarySchema = contentFullSchema
  .omit({ body: true })
  .extend({
    body: z.never().optional(),
  });
export type ContentSummary = z.infer<typeof contentSummarySchema>;
export const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  take: z.number().int().positive(),
  itemCount: count,
  pageCount: count,
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
});
export const contentSummaryPageSchema = z.object({
  data: contentSummarySchema.array(),
  meta: pageMetaSchema,
});
export const contentFullPageSchema = z.object({
  data: contentFullSchema.array(),
  meta: pageMetaSchema,
});
export const mediaSchema = z.object({
  id,
  url: z.string(),
  type: z.string(),
  tenantId: id,
  createdAt: date,
});
export type MediaItem = z.infer<typeof mediaSchema>;
export const profileSchema = z.object({
  id,
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: date,
  updatedAt: date,
});
export const avatarSchema = z.object({ avatarUrl: z.string() });
export const tenantSchema = z.object({
  id,
  name: z.string(),
  domain: z.string().nullable(),
  createdAt: date,
  updatedAt: date,
});
export const tenantsSchema = tenantSchema.extend({ role: roleSchema }).array();
export const memberSchema = z.object({
  userId: id,
  role: roleSchema,
  user: authorSchema.omit({ id: true }).extend({ createdAt: date }),
});
export const membershipSchema = z.object({
  id,
  tenantId: id,
  userId: id,
  role: roleSchema,
});
export const messageSchema = z.object({ message: z.string() });
export const invitationSchema = z.object({
  token: id,
  email: z.string(),
  role: roleSchema,
  expiresAt: date,
});
export const acceptedInvitationSchema = z.object({ tenantId: id });
export const exportAcceptedSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({ jobId: id, status: exportStatusSchema }),
});
export const exportJobSchema = z.object({
  jobId: id,
  tenantId: id,
  userId: id,
  startDate: z.string(),
  endDate: z.string(),
  createdAt: date,
  status: exportStatusSchema,
  progress: z.number().min(0).max(100),
  filename: z.string().optional(),
  error: z.string().optional(),
});
export const exportResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: exportJobSchema,
});
export const dashboardSchema = z.object({
  totalContent: count,
  activeUsers: count,
  categoriesCount: count,
  mediaCount: count,
  published: count,
  drafts: count,
  recentContent: z
    .object({
      id,
      title: z.string(),
      status: contentStatusSchema,
      updatedAt: date,
      category: z.object({ name: z.string() }).nullable(),
      author: authorSchema.omit({ id: true }),
    })
    .array(),
});
export const auditPageSchema = z.object({
  data: z
    .object({
      id,
      action: z.string(),
      entity: z.string().nullable(),
      entityId: id.nullable(),
      userId: id.nullable(),
      ipAddress: z.string().nullable(),
      createdAt: date,
      details: z.unknown(),
    })
    .array(),
  meta: z.object({
    total: count,
    totalPages: count,
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
});

export class ContractError extends Error {
  constructor() {
    super("The service returned an invalid response. Please try again.");
    this.name = "ContractError";
  }
}

/** Treat parsed JSON as unknown until it satisfies the consumer's schema. */
export function parseContract<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ContractError();
  return result.data;
}

export function apiMessage(value: unknown, fallback: string): string {
  const result = z
    .object({ message: z.union([z.string(), z.string().array()]) })
    .safeParse(value);
  return result.success
    ? Array.isArray(result.data.message)
      ? result.data.message.join(". ")
      : result.data.message
    : fallback;
}

export function exportIsTerminal(status: ExportStatus): boolean {
  switch (status) {
    case "Pending":
    case "Processing":
      return false;
    case "Completed":
    case "Failed":
      return true;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
