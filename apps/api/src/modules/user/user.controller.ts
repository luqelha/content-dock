import { uploadFormat } from '../storage/upload-formats';
import type { AuthenticatedRequest } from '../../common/types/http-request';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileVaultService } from '../storage/file-vault.service';
import { validateUpload } from '../storage/validate-upload';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelfGuard } from '../../common/guards/self.guard';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private readonly userService: UserService,
    private readonly vault: FileVaultService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Disabled: use workspace invitations', deprecated: true })
  @ApiResponse({
    status: 403,
    description: 'Use workspace invitations to add members.',
  })
  create() {
    throw new ForbiddenException('Use workspace invitations to add members.');
  }

  @Get()
  @ApiOperation({ summary: 'Disabled: use workspace members', deprecated: true })
  @ApiResponse({ status: 403, description: 'Use workspace members.' })
  findAll() {
    throw new ForbiddenException('Use the workspace members endpoint.');
  }

  @Get('profile/:id')
  @UseGuards(SelfGuard)
  @ApiOperation({ summary: 'Get your own profile by ID' })
  @ApiResponse({ status: 200, description: 'Return user profile.', type: UserEntity })
  getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }

  @Get(':id')
  @UseGuards(SelfGuard)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Return a user.', type: UserEntity })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload a user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadAvatar(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const userId = req.user.userId;
    const previousAvatar = (await this.userService.findOne(userId)).avatarUrl;

    const extension = uploadFormat(file.mimetype, true)?.extension;
    if (!extension) throw new BadRequestException('Unsupported image type.');
    file.filename = `avatar-${userId}-${uuidv4()}.${extension}`;
    await this.vault.save(file.filename, await validateUpload(file, true));
    this.prisma.afterRollback(() => this.vault.remove(file.filename));
    const url = `/uploads/${file.filename}`;
    try {
      await this.userService.updateAvatar(userId, url);
    } catch (error) {
      await this.vault.remove(file.filename);
      throw error;
    }

    await this.prisma.afterCommit(async () => {
      try {
        if (previousAvatar?.startsWith('/uploads/'))
          await this.vault.remove(previousAvatar.slice('/uploads/'.length));
      } catch {
        this.logger.warn({ event: 'AVATAR_CLEANUP_DEFERRED' });
      }
      // Other concurrent uploads may still be uncommitted: retention handles orphans.
    });

    return { avatarUrl: url };
  }

  @Patch(':id')
  @UseGuards(SelfGuard)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
    type: UserEntity,
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disabled: remove workspace membership', deprecated: true })
  @ApiResponse({ status: 403, description: 'Remove workspace membership instead.' })
  remove() {
    throw new ForbiddenException('Remove membership through the workspace members endpoint.');
  }
}
