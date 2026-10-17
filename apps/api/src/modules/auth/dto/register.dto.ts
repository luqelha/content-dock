import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsRegistrationPassword } from '../../../common/validators/password-policy';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({
    example: 'A unique long passphrase!',
    description: 'At least 15 characters, at most 72 UTF-8 bytes',
    minLength: 15,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @IsRegistrationPassword()
  password: string;
}
