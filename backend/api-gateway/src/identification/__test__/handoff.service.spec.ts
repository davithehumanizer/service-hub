import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HandoffService } from '../handoff.service';
import { IdentificationResponseDto } from '../dto/identification-response.dto';

describe('HandoffService', () => {
  let service: HandoffService;

  const mockResult: IdentificationResponseDto = {
    success: true,
    data: {
      Product: 'Laptop',
      Brand: 'Dell',
      Model: 'XPS 15',
      ReleaseDate: '2021',
    },
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    service = new HandoffService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a session with a pairingId, token and future expiry', () => {
    const session = service.create();

    expect(session.pairingId).toBeDefined();
    expect(session.token).toBeDefined();
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('returns pending status right after creation', () => {
    const { pairingId, token } = service.create();

    expect(service.getStatus(pairingId, token)).toEqual({
      status: 'pending',
      data: null,
    });
  });

  it('rejects an unknown pairingId', () => {
    expect(() => service.getStatus('does-not-exist', 'whatever')).toThrow(
      NotFoundException,
    );
  });

  it('rejects a mismatched token', () => {
    const { pairingId } = service.create();

    expect(() => service.getStatus(pairingId, 'wrong-token')).toThrow(
      ForbiddenException,
    );
  });

  it('completes a session and exposes the result via status', () => {
    const { pairingId, token } = service.create();

    service.complete(pairingId, token, mockResult);

    expect(service.getStatus(pairingId, token)).toEqual({
      status: 'completed',
      data: mockResult,
    });
  });

  it('is single-use: completing twice throws', () => {
    const { pairingId, token } = service.create();
    service.complete(pairingId, token, mockResult);

    expect(() => service.complete(pairingId, token, mockResult)).toThrow(
      ConflictException,
    );
  });

  it('assertConsumable throws once the session has been used', () => {
    const { pairingId, token } = service.create();
    service.complete(pairingId, token, mockResult);

    expect(() => service.assertConsumable(pairingId, token)).toThrow(
      ConflictException,
    );
  });

  it('expires sessions after the TTL', () => {
    jest.useFakeTimers();
    const { pairingId, token } = service.create();

    jest.advanceTimersByTime(3 * 60 * 1000 + 1);

    expect(() => service.getStatus(pairingId, token)).toThrow(
      NotFoundException,
    );
  });
});
