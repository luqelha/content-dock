import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { WorkerController } from './worker.controller';
import { CompressionService } from './compression.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: process.env.QUEUE_NAME || 'log_export_queue',
          persistent: true,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [ExportController, WorkerController],
  providers: [ExportService, CompressionService],
})
export class ExportModule {}
