import { ServerRMQ } from '@nestjs/microservices';
import type { RmqOptions } from '@nestjs/microservices';
import { TelemetryService } from './telemetry.service';

/** Track the channel setup callback, not merely an open TCP connection. */
export class ObservedRmqServer extends ServerRMQ {
  private generation = 0;
  constructor(
    options: NonNullable<RmqOptions['options']>,
    private readonly telemetry: TelemetryService,
  ) {
    super(options);
    this.status.subscribe((status) =>
      this.telemetry.dependency('broker', status === 'connected' || status === 'unblocked'),
    );
  }
  async setupChannel(
    channel: { on: (event: string, callback: () => void) => unknown },
    callback: (...args: unknown[]) => unknown,
  ) {
    const generation = ++this.generation;
    this.telemetry.dependency('consumer', false);
    const unavailable = () => {
      if (generation === this.generation) this.telemetry.dependency('consumer', false);
    };
    channel.on('close', unavailable);
    channel.on('error', unavailable);
    try {
      await super.setupChannel(channel, (...args: unknown[]) => {
        if (generation === this.generation) this.telemetry.dependency('consumer', true);
        callback(...args);
      });
    } catch (error) {
      unavailable();
      throw error;
    }
  }
  async close() {
    this.telemetry.dependency('consumer', false);
    await super.close();
  }
}
