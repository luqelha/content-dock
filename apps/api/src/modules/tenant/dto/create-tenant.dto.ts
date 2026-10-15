import { IsNotEmpty, IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'acme', description: 'Subdomain for the tenant' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, {
    message: 'Use a lowercase subdomain or hostname without a protocol or path',
  })
  domain?: string;
}
