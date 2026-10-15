const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const archivePattern = new RegExp(`^export-(${uuid})(?:-(${uuid}))?\\.zip$`);

/** Accept both historical and attempt-specific archives, never arbitrary paths. */
export function archiveJobId(filename: string): string | undefined {
  return archivePattern.exec(filename)?.[1];
}
