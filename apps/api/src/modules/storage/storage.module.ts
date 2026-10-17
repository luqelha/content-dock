import { Global, Module } from '@nestjs/common';
import { FileVaultService } from './file-vault.service';
import { FilesController } from './files.controller';
import { StorageRetentionService } from './storage-retention.service';
@Global()
@Module({
  providers: [FileVaultService, StorageRetentionService],
  controllers: [FilesController],
  exports: [FileVaultService],
})
export class StorageModule {}
