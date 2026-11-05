import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'crypto';
import { IdentificationResponseDto } from './dto/identification-response.dto';

type HandoffStatus = 'pending' | 'completed';

interface HandoffSession {
  tokenHash: Buffer;
  status: HandoffStatus;
  result: IdentificationResponseDto | null;
  expiresAt: number;
  timeout: NodeJS.Timeout;
}

export interface CreateHandoffResult {
  pairingId: string;
  token: string;
  expiresAt: string;
}

export interface HandoffStatusResult {
  status: HandoffStatus;
  data: IdentificationResponseDto | null;
}

// Single-instance, in-memory pairing sessions: the api-gateway runs as a
// single container in this deployment (no load balancer across replicas),
// and these sessions only need to survive a few minutes, so a Map avoids
// standing up a DB connection for the gateway just for this.
const TTL_MS = 3 * 60 * 1000;

@Injectable()
export class HandoffService {
  private readonly sessions = new Map<string, HandoffSession>();

  create(): CreateHandoffResult {
    const pairingId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest();
    const expiresAt = Date.now() + TTL_MS;

    const timeout = setTimeout(() => {
      this.sessions.delete(pairingId);
    }, TTL_MS);
    timeout.unref?.();

    this.sessions.set(pairingId, {
      tokenHash,
      status: 'pending',
      result: null,
      expiresAt,
      timeout,
    });

    return { pairingId, token, expiresAt: new Date(expiresAt).toISOString() };
  }

  getStatus(pairingId: string, token: string): HandoffStatusResult {
    const session = this.getValidSession(pairingId, token);
    return { status: session.status, data: session.result };
  }

  complete(
    pairingId: string,
    token: string,
    result: IdentificationResponseDto,
  ): void {
    const session = this.getValidSession(pairingId, token);
    if (session.status === 'completed') {
      throw new ConflictException('This handoff session has already been used');
    }
    session.status = 'completed';
    session.result = result;
  }

  /** Throws if the session can't accept a photo right now (used before the costly ML call). */
  assertConsumable(pairingId: string, token: string): void {
    const session = this.getValidSession(pairingId, token);
    if (session.status === 'completed') {
      throw new ConflictException('This handoff session has already been used');
    }
  }

  private getValidSession(pairingId: string, token: string): HandoffSession {
    const session = this.sessions.get(pairingId);
    if (!session) {
      throw new NotFoundException('Handoff session not found or expired');
    }
    if (Date.now() > session.expiresAt) {
      clearTimeout(session.timeout);
      this.sessions.delete(pairingId);
      throw new NotFoundException('Handoff session not found or expired');
    }

    const tokenHash = createHash('sha256')
      .update(token || '')
      .digest();
    if (
      tokenHash.length !== session.tokenHash.length ||
      !timingSafeEqual(tokenHash, session.tokenHash)
    ) {
      throw new ForbiddenException('Invalid handoff token');
    }

    return session;
  }
}
