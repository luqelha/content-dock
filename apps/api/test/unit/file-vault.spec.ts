import { FileVaultService } from '../../src/modules/storage/file-vault.service';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('File vault', () => {
  let vault: FileVaultService;
  let directory: string;
  const oldKey = process.env.STORAGE_ENCRYPTION_KEY;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'atlas-vault-test-'));
    process.env.STORAGE_ENCRYPTION_KEY = 'a'.repeat(64);
    const cwd = jest.spyOn(process, 'cwd').mockReturnValue(directory);
    vault = new FileVaultService();
    cwd.mockRestore();
  });
  afterEach(() => {
    if (oldKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
    else process.env.STORAGE_ENCRYPTION_KEY = oldKey;
    rmSync(directory, { recursive: true, force: true });
  });
  it('stores ciphertext and authenticates file contents', async () => {
    const plain = Buffer.from('A private workspace file');
    await vault.save('sample.png', plain);
    const stored = readFileSync(join(directory, 'storage/uploads/sample.png.enc'));
    expect(stored.includes(plain)).toBe(false);
    expect(await vault.read('sample.png')).toEqual(plain);
    stored[stored.length - 1] ^= 1;
    expect(() => vault.decrypt(stored)).toThrow();
  });
  it('uses a unique nonce and refuses file traversal', async () => {
    expect(vault.encrypt(Buffer.from('same'))).not.toEqual(vault.encrypt(Buffer.from('same')));
    await expect(vault.read('../private.png')).rejects.toThrow('File not found');
    await expect(vault.read('..\\private.png')).rejects.toThrow('File not found');
  });
  it('round trips a streaming encrypted archive', async () => {
    const path = join(directory, 'archive.zip');
    const plain = Buffer.from('PK encrypted archive fixture');
    const { input, output } = vault.archiveWriter(path);
    const closed = new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
    input.end(plain);
    await closed;
    expect(readFileSync(path + '.enc').includes(plain)).toBe(false);
    const parts: Buffer[] = [];
    for await (const chunk of vault.archiveReader(path)) parts.push(Buffer.from(chunk));
    expect(Buffer.concat(parts)).toEqual(plain);
  });
});
