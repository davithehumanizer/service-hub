export interface IdentificationResult {
  Product: string;
  Brand: string;
  Model: string;
  ReleaseDate: string;
  EndOfLifeDate?: string;
  GTIN?: string;
}

export interface IdentificationResponse {
  success: boolean;
  data: IdentificationResult | null;
  error?: string;
  notFound?: boolean;
  timestamp: string;
  imageUrl?: string;
}

export interface HandoffSession {
  pairingId: string;
  token: string;
  expiresAt: string;
}

export interface HandoffStatusResponse {
  status: 'pending' | 'completed';
  data: IdentificationResponse | null;
}
