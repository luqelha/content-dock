import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ContentEntity } from './content.entity';
import { CategoryEntity } from './category.entity';
import type { ContentSummary, ContentFull } from './content-list.contract';

export class ContentAuthorEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ type: String, nullable: true }) firstName: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName: string | null;
}

export class ContentSummaryEntity
  extends OmitType(ContentEntity, ['body'] as const)
  implements ContentSummary
{
  @ApiProperty({ type: () => CategoryEntity, nullable: true }) category: CategoryEntity | null;
  @ApiProperty({ type: () => ContentAuthorEntity }) author: ContentAuthorEntity;
}

export class ContentFullEntity extends ContentSummaryEntity implements ContentFull {
  @ApiProperty() body: string;
}
