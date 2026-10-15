import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
export class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
}
export class UpdateMemberDto {
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
}
export class AcceptInvitationDto {
  @ApiProperty() @IsString() @Length(64, 64) token: string;
}
