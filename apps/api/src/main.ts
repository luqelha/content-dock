import { NestFactory } from '@nestjs/core';
import { createApplicationValidationPipe } from './common/pipes/application-validation.pipe';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { TelemetryService } from './modules/observability/telemetry.service';
import { ObservedRmqServer } from './modules/observability/observed-rmq.server';
import { installGracefulShutdown } from './modules/observability/graceful-shutdown';
import { ExportService } from './modules/export/export.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const telemetry = app.get(TelemetryService);
  app.use(telemetry.middleware);

  // Enable CORS
  app.enableCors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',') });
  if (process.env.TRUST_PROXY === '1') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  installGracefulShutdown(app, telemetry, app.get(ExportService));

  // Enable Compression
  app.use(compression());

  // Prefix all routes with /api
  app.setGlobalPrefix('api');

  // Register Global Exception Filters
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaClientExceptionFilter());

  // Register Global Validation Pipe
  app.useGlobalPipes(createApplicationValidationPipe());

  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('Atlas Platform API')
    .setDescription('The Atlas Platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Connect Microservice for RabbitMQ Worker
  app.connectMicroservice({
    strategy: new ObservedRmqServer(
      {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: process.env.QUEUE_NAME || 'log_export_queue',
        queueOptions: {
          durable: true,
        },
        prefetchCount: 1,
        noAck: false,
      },
      telemetry,
    ),
  });

  // Start the private liveness listener even when the broker delays startup.
  await app.init();
  await app.startAllMicroservices();

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Atlas Platform is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
