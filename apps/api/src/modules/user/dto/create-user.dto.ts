import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsRegistrationPassword } from '../../../common/validators/password-policy';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({ example: 'A unique long passphrase!', minLength: 15, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @IsRegistrationPassword()
  password: string;
}
