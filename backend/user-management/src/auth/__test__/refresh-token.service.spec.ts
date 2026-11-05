import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { RefreshTokenService } from '../refresh-token.service';
import { UserRefreshToken } from '../user-refresh-token.entity';

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

const inFuture = () => new Date(Date.now() + 60_000);
const inPast = () => new Date(Date.now() - 60_000);

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(UserRefreshToken),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('issue', () => {
    it('stores only the hash, never the raw token', async () => {
      const raw = await service.issue(7);

      expect(raw).toEqual(expect.any(String));
      const saved = repository.save.mock.calls[0][0] as UserRefreshToken;
      expect(saved.token_hash).toBe(sha256(raw));
      expect(JSON.stringify(saved)).not.toContain(raw);
      expect(saved.user_id).toBe(7);
      expect(saved.expires_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('produces a different token on every call', async () => {
      const first = await service.issue(1);
      const second = await service.issue(1);
      expect(first).not.toBe(second);
    });

    it('prunes the user expired tokens so the table stays bounded', async () => {
      await service.issue(7);

      expect(repository.delete).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 7 }),
      );
    });
  });

  describe('rotate', () => {
    it('consumes the presented token and returns a new one', async () => {
      repository.findOne.mockResolvedValue({
        id: 'a',
        user_id: 7,
        token_hash: sha256('raw'),
        expires_at: inFuture(),
        used_at: null,
        revoked: false,
      });

      const result = await service.rotate('raw');

      expect(result.userId).toBe(7);
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe('raw');
      const consumed = repository.save.mock.calls[0][0] as UserRefreshToken;
      expect(consumed.used_at).toBeInstanceOf(Date);
    });

    it('rejects an unknown token', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.rotate('nope')).rejects.toThrow(RpcException);
    });

    it('rejects an empty token without hitting the database', async () => {
      await expect(service.rotate('')).rejects.toThrow(RpcException);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      repository.findOne.mockResolvedValue({
        user_id: 7,
        expires_at: inPast(),
        used_at: null,
        revoked: false,
      });
      await expect(service.rotate('raw')).rejects.toThrow(RpcException);
    });

    it('revokes every session when a consumed token is replayed', async () => {
      repository.findOne.mockResolvedValue({
        user_id: 7,
        expires_at: inFuture(),
        used_at: new Date(),
        revoked: false,
      });

      await expect(service.rotate('raw')).rejects.toThrow(RpcException);
      expect(repository.update).toHaveBeenCalledWith(
        { user_id: 7, revoked: false },
        { revoked: true },
      );
    });

    it('rejects a revoked token', async () => {
      repository.findOne.mockResolvedValue({
        user_id: 7,
        expires_at: inFuture(),
        used_at: null,
        revoked: true,
      });
      await expect(service.rotate('raw')).rejects.toThrow(RpcException);
    });
  });

  describe('revoke', () => {
    it('revokes by hash', async () => {
      await service.revoke('raw');
      expect(repository.update).toHaveBeenCalledWith(
        { token_hash: sha256('raw') },
        { revoked: true },
      );
    });

    it('is a no-op for an empty token', async () => {
      await service.revoke('');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes all live tokens of the user', async () => {
      await service.revokeAllForUser(7);
      expect(repository.update).toHaveBeenCalledWith(
        { user_id: 7, revoked: false },
        { revoked: true },
      );
    });
  });
});
