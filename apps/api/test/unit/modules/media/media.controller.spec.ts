import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../../../../src/modules/media/media.controller';
import { MediaService } from '../../../../src/modules/media/media.service';
import { PrismaService } from '../../../../src/database/prisma.service';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { Reflector } from '@nestjs/core';

describe('MediaController', () => {
  let controller: MediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: RedisService,
          useValue: {},
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
