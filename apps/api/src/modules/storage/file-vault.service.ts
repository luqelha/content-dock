import { Injectable, NotFoundException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
  createReadStream,
  openSync,
  readSync,
  closeSync,
  statSync,
} from 'fs';
import { readFile, writeFile, unlink, readdir } from 'fs/promises';
import { join, basename } from 'path';

/** New media is encrypted with AES-256-GCM; legacy uploads require the same access checks. */
@Injectable()
export class FileVaultService {
  private readonly root = join(process.cwd(), 'storage');
  private readonly key: Buffer;
  constructor() {
    mkdirSync(join(this.root, 'uploads'), { recursive: true });
    const configured = process.env.STORAGE_ENCRYPTION_KEY;
    if (configured) {
      if (!/^[a-f0-9]{64}$/i.test(configured))
        throw new Error('STORAGE_ENCRYPTION_KEY must contain 64 hexadecimal characters.');
      this.key = Buffer.from(configured, 'hex');
    } else {
      if (process.env.NODE_ENV === 'production')
        throw new Error('STORAGE_ENCRYPTION_KEY is required in production.');
      const keyPath = join(this.root, '.development-key');
      if (!existsSync(keyPath)) {
        try {
          writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: 'wx' });
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
        }
      }
      this.key = readFileSync(keyPath);
    }
  }
  encrypt(buffer: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  }
  decrypt(buffer: Buffer) {
    const decipher = createDecipheriv('aes-256-gcm', this.key, buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
  }
  async save(filename: string, data: Buffer) {
    await writeFile(this.path(filename) + '.enc', this.encrypt(data), { flag: 'wx', mode: 0o600 });
  }
  async read(filename: string) {
    const file = this.path(filename);
    if (existsSync(file + '.enc')) return this.decrypt(await readFile(file + '.enc'));
    if (existsSync(file)) return readFile(file);
    throw new NotFoundException('File not found.');
  }
  async remove(filename: string) {
    const file = this.path(filename);
    await unlink(existsSync(file + '.enc') ? file + '.enc' : file).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  async removeOtherAvatars(userId: string, currentFilename: string) {
    const prefix = `avatar-${userId}-`;
    const files = await readdir(join(this.root, 'uploads'));
    for (const file of files) {
      const filename = file.endsWith('.enc') ? file.slice(0, -4) : file;
      if (filename.startsWith(prefix) && filename !== currentFilename) {
        await unlink(join(this.root, 'uploads', file));
      }
    }
  }
  archiveWriter(path: string) {
    const iv = randomBytes(12);
    const input = createCipheriv('aes-256-gcm', this.key, iv);
    const output = createWriteStream(path + '.enc', { mode: 0o600 });
    output.write(iv);
    input.pipe(output, { end: false });
    input.on('end', () => output.end(input.getAuthTag()));
    input.on('error', (error) => output.destroy(error));
    return { input, output };
  }
  archiveReader(path: string) {
    const encrypted = path + '.enc';
    const size = statSync(encrypted).size;
    if (size < 28) throw new NotFoundException('Invalid archive.');
    const fd = openSync(encrypted, 'r');
    const iv = Buffer.alloc(12);
    const tag = Buffer.alloc(16);
    try {
      readSync(fd, iv, 0, 12, 0);
      readSync(fd, tag, 0, 16, size - 16);
    } finally {
      closeSync(fd);
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const source = createReadStream(encrypted, { start: 12, end: size - 17 });
    source.on('error', (error) => decipher.destroy(error));
    decipher.on('close', () => source.destroy());
    return source.pipe(decipher);
  }
  private path(filename: string) {
    if (filename !== basename(filename) || !/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename))
      throw new NotFoundException('File not found.');
    return join(this.root, 'uploads', filename);
  }
}
