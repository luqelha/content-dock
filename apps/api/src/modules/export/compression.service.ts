import { Injectable } from '@nestjs/common';
import { mkdir, unlink } from 'fs/promises';
import * as path from 'path';
import { ZipArchive } from 'archiver';
import { PrismaService } from '../../database/prisma.service';
import { ExportJob } from './export-job';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { FileVaultService } from '../storage/file-vault.service';
import { randomUUID } from 'node:crypto';
import { archiveJobId } from './export-filename';

@Injectable()
export class CompressionService {
  private readonly exportPath = path.join(process.cwd(), 'storage', 'exports');
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: FileVaultService,
  ) {}

  async compressLogs(job: ExportJob): Promise<{ zipName: string; size: number }> {
    await mkdir(this.exportPath, { recursive: true });
    const zipName = `export-${job.jobId}-${randomUUID()}.zip`;
    if (archiveJobId(zipName) !== job.jobId) throw new Error('Invalid export job ID.');
    const filePath = path.join(this.exportPath, zipName);
    const { input, output } = this.vault.archiveWriter(filePath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const stream = new PassThrough();
    let timer: NodeJS.Timeout | undefined;
    let failed = false;
    let finished = false;
    const completion = new Promise<{ zipName: string; size: number }>((resolve, reject) => {
      const fail = (error: Error) => {
        if (failed || finished) return;
        failed = true;
        stream.destroy(error);
        archive.abort();
        input.destroy(error);
        output.destroy(error);
        reject(error);
      };
      timer = setTimeout(() => fail(new Error('Export time budget exceeded.')), 300000);
      archive.on('error', fail);
      input.on('error', fail);
      output.on('error', fail);
      stream.on('error', fail);
      output.on('close', () => {
        if (failed) return;
        finished = true;
        resolve({ zipName, size: archive.pointer() });
      });
      archive.pipe(input);
      archive.append(stream, { name: 'audit-logs.ndjson' });
      const write = async () => {
        const end = new Date(job.endDate);
        end.setUTCHours(23, 59, 59, 999);
        let cursor: string | undefined;
        let count = 0;
        let bytes = 0;
        while (!failed) {
          const rows = await this.prisma.auditLog.findMany({
            where: {
              tenantId: job.tenantId,
              createdAt: { gte: new Date(job.startDate), lte: end },
            },
            orderBy: { id: 'asc' },
            take: 500,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          for (const row of rows) {
            if (failed) return;
            const line = JSON.stringify(row) + '\n';
            bytes += Buffer.byteLength(line);
            if (++count > 100000 || bytes > 200 * 1024 * 1024)
              throw new Error('Export size budget exceeded.');
            if (!stream.write(line)) await once(stream, 'drain');
          }
          if (rows.length < 500) break;
          cursor = rows[rows.length - 1].id;
        }
        if (!failed) {
          stream.end();
          await archive.finalize();
        }
      };
      void write().catch(fail);
    });
    try {
      return await completion;
    } catch (error) {
      if (!output.closed) await new Promise<void>((resolve) => output.once('close', resolve));
      await unlink(filePath + '.enc').catch(() => undefined);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async removeArchive(zipName: string) {
    if (!archiveJobId(zipName)) throw new Error('Invalid export archive.');
    await unlink(path.join(this.exportPath, zipName + '.enc')).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
