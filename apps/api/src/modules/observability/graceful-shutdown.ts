import { INestApplication, Logger } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { ExportService } from '../export/export.service';

export function installGracefulShutdown(
  app: INestApplication,
  telemetry: TelemetryService,
  exports: ExportService,
) {
  const logger = new Logger('Shutdown');
  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    telemetry.beginDrain();
    exports.stopDispatch();
    const grace = Number(process.env.SHUTDOWN_GRACE_MS || 330000);
    const hardDeadline = setTimeout(() => process.exit(1), grace + 5000);
    hardDeadline.unref();
    logger.log({ event: 'SHUTDOWN_DRAIN_STARTED', signal });
    try {
      const drained = await telemetry.waitForIdle(grace);
      telemetry.shutdownTotal.inc({ outcome: drained ? 'clean' : 'timed_out' });
      logger.log({ event: 'SHUTDOWN_DRAIN_FINISHED', outcome: drained ? 'clean' : 'timed_out' });
      await app.close();
      process.exit(drained ? 0 : 1);
    } catch {
      logger.error({ event: 'SHUTDOWN_FAILED' });
      process.exit(1);
    }
  };
  process.once('SIGTERM', () => void stop('SIGTERM'));
  process.once('SIGINT', () => void stop('SIGINT'));
}
