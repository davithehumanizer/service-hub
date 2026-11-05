/**
 * Where a repair record came from. The imported open dataset and what our own
 * users declare must stay tellable apart in any analysis.
 */
export enum RecordSource {
  ImportedDataset = 'ImportedDataset',
  Platform = 'Platform',
}
