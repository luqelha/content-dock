import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class ContentEntity {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier',
  })
  id: string;

  @ApiProperty({ example: 'My First Post', description: 'The title of the content' })
  title: string;

  @ApiProperty({ example: 'my-first-post', description: 'The unique slug' })
  slug: string;

  @ApiProperty({ example: 'Lorem ipsum...', description: 'The body/content text' })
  body: string;

  @ApiProperty({
    enum: ContentStatus,
    example: ContentStatus.DRAFT,
    description: 'The current status of the content',
  })
  status: ContentStatus;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'The publication timestamp',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  publishedAt: Date | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The author ID' })
  authorId: string;

  @ApiProperty({ example: 'tenant-123', description: 'The tenant ID' })
  tenantId: string;

  @ApiProperty({ example: 'cat-123', description: 'The category ID', type: String, nullable: true })
  categoryId: string | null;

  @ApiProperty({ type: String, format: 'date-time', example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
