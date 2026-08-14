import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ description: 'The name of the category' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'The slug for the category (must be unique per tenant)' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : value,
  )
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'A brief description of the category' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'The ID of the parent category if nested' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
