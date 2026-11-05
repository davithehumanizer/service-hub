/**
 * A journey is Pending until its outcome is declared. Expiry is not a status:
 * it is derived from `tokenExpiresAt`, so nothing has to run to keep it true.
 */
export enum JourneyStatus {
  Pending = 'Pending',
  Declared = 'Declared',
}
