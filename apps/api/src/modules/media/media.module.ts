import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!/^(image\/(jpeg|png|gif|webp)|application\/pdf)$/.test(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPG, PNG, GIF, WebP images and PDFs are allowed.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
