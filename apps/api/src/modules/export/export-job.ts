import { isRecord } from '../../common/types/unknown-record';

export enum JobStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export type ExportStatus = `${JobStatus}`;

export function parseExportStatus(value: unknown): ExportStatus {
  switch (value) {
    case 'Pending':
    case 'Processing':
    case 'Completed':
    case 'Failed':
      return value;
    default:
      throw new Error('Invalid stored export status.');
  }
}

export interface ExportJob {
  jobId: string;
  tenantId: string;
  userId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  status: ExportStatus;
  progress: number;
  filename?: string;
  error?: string;
}

/** JSON from persistent storage is untrusted even when the column is typed Json. */
export function parseExportJob(value: unknown): ExportJob {
  if (!isRecord(value)) throw new Error('Invalid stored export job.');
  const text = (key: string): string => {
    const field = value[key];
    if (typeof field !== 'string' || !field) throw new Error('Invalid stored export job.');
    return field;
  };
  const optional = (key: string): string | undefined => {
    if (value[key] === undefined) return undefined;
    return text(key);
  };
  const startDate = text('startDate');
  const endDate = text('endDate');
  const createdAt = text('createdAt');
  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
  if (
    !Number.isFinite(days) ||
    days < 0 ||
    days > 366 ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof value.progress !== 'number' ||
    !Number.isFinite(value.progress) ||
    value.progress < 0 ||
    value.progress > 100
  ) {
    throw new Error('Invalid stored export job.');
  }
  return {
    jobId: text('jobId'),
    tenantId: text('tenantId'),
    userId: text('userId'),
    startDate,
    endDate,
    createdAt,
    status: parseExportStatus(value.status),
    progress: value.progress,
    ...(value.filename === undefined ? {} : { filename: optional('filename') }),
    ...(value.error === undefined ? {} : { error: optional('error') }),
  };
}
