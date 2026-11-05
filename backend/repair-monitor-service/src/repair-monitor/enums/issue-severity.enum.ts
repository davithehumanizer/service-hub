/** How badly the device is affected, as captured by the wizard. */
export enum IssueSeverity {
  /** Works despite the problem: a cracked screen, a weak battery. */
  Working = 'working',
  Partial = 'partial',
  Broken = 'broken',
}
