export interface ExportJob {
  jobId: string;
  tenantId: string;
  userId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  status: string;
  progress: number;
  filename?: string;
  error?: string;
}
