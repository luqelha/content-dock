import { Prisma } from '@prisma/client';

export const contentSummarySelect = {
  id: true,
  title: true,
  slug: true,
  status: true,
  publishedAt: true,
  authorId: true,
  tenantId: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: true,
  author: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.ContentSelect;

export type ContentSummary = Prisma.ContentGetPayload<{ select: typeof contentSummarySelect }>;
export type ContentFull = ContentSummary & { body: string };
