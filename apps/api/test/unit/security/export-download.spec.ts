import { PassThrough, Readable } from 'node:stream';
import * as fs from 'fs';
import { ExportController } from '../../../src/modules/export/export.controller';

describe('Export download compatibility and authorization', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const req = { tenant: { id: 'tenant' }, user: { userId: 'owner' } };
  let getJobStatus: jest.Mock;
  let archiveReader: jest.Mock;
  let controller: ExportController;
  beforeEach(() => {
    getJobStatus = jest.fn().mockResolvedValue({ status: 'Completed' });
    archiveReader = jest.fn(() => Readable.from(Buffer.from('zip fixture')));
    controller = new ExportController({ getJobStatus } as any, { archiveReader } as any);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([undefined, `export-${id}.zip`, `export-${id}-${id}.zip`])(
    'streams a valid legacy/attempt archive %s under the existing public filename',
    async (filename) => {
      getJobStatus.mockResolvedValue({ status: 'Completed', filename });
      const response = Object.assign(new PassThrough(), { setHeader: jest.fn() });
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      await controller.download(id, response as any, req);
      expect(getJobStatus).toHaveBeenCalledWith(id, 'tenant', 'owner');
      expect(archiveReader).toHaveBeenCalledWith(
        expect.stringContaining(filename || `export-${id}.zip`),
      );
      expect(Buffer.concat(chunks).toString()).toBe('zip fixture');
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="export-${id}.zip"`,
      );
    },
  );
  it.each(['../private.zip', 'export-22222222-2222-4222-8222-222222222222.zip'])(
    'rejects an unsafe or foreign archive name %s',
    async (filename) => {
      getJobStatus.mockResolvedValue({ status: 'Completed', filename });
      await expect(controller.download(id, { setHeader: jest.fn() } as any, req)).rejects.toThrow(
        'not found',
      );
      expect(archiveReader).not.toHaveBeenCalled();
    },
  );
  it('does not open storage when ownership lookup fails', async () => {
    getJobStatus.mockRejectedValue(new Error('not found'));
    await expect(controller.download(id, {} as any, req)).rejects.toThrow('not found');
    expect(archiveReader).not.toHaveBeenCalled();
  });
  it('does not stream incomplete or missing archives', async () => {
    getJobStatus.mockResolvedValueOnce({ status: 'Processing' });
    await expect(controller.download(id, {} as any, req)).rejects.toThrow('not ready');
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(controller.download(id, { setHeader: jest.fn() } as any, req)).rejects.toThrow(
      'expired',
    );
    expect(archiveReader).not.toHaveBeenCalled();
  });
});
