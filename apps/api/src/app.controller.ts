import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './modules/redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get('health')
  async health() {
    try {
      const [identity] = await Promise.all([
        this.prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`,
        this.redis.getClient().ping(),
      ]);
      return {
        status: 'ok',
        database: 'up',
        redis: 'up',
        ...(process.env.NODE_ENV === 'test'
          ? { environment: 'test', testDatabase: identity[0].name }
          : {}),
      };
    } catch {
      throw new ServiceUnavailableException('A required service is unavailable.');
    }
  }

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
