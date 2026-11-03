import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: '🌍 Welcome to ContentDock API!',
      status: 'healthy',
      version: '1.0.0',
    };
  }
}
