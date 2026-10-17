import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Array response is retained; clients advance page when the current page is full. */
export class ListPageDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  @IsOptional()
  page = 1;
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take = 50;
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;
  get skip() {
    return (this.page - 1) * this.take;
  }
}
