import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '../../../../src/modules/media/media.service';
import { PrismaService } from '../../../../src/database/prisma.service';
import { FileVaultService } from '../../../../src/modules/storage/file-vault.service';

const mockPrismaService = {};

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: FileVaultService, useValue: {} },
        {
          provide: PrismaService,
          useValue: { client: mockPrismaService },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
