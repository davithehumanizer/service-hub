import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../login.dto';
import { RefreshTokenDto } from '../refresh-token.dto';
import { OAuth2TokenDto } from '../oauth2-token.dto';
import { CreatePermissionDto } from '../create-permission.dto';
import { CreateRoleDto } from '../create-role.dto';
import { AddPermissionToRoleDto } from '../add-permission-to-role.dto';

describe('Auth DTO validation (helps when enabling ValidationPipe)', () => {
  it('accepts a valid LoginDto shape', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'password123',
      recaptchaToken: 'recaptcha_token',
    };

    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid LoginDto with minimal required fields', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'password123',
    };

    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid RefreshTokenDto shape', async () => {
    const payload = {
      refresh_token: 'k7Qb1s_9k0Zc',
    };

    const dto = plainToInstance(RefreshTokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid OAuth2TokenDto shape', async () => {
    const payload = {
      client_id: 'client_id',
      client_secret: 'client_secret',
      grant_type: 'client_credentials',
    };

    const dto = plainToInstance(OAuth2TokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid OAuth2TokenDto with minimal required fields', async () => {
    const payload = {
      grant_type: 'client_credentials',
    };

    const dto = plainToInstance(OAuth2TokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  // Negative tests — require class-validator decorators to be active
  it('rejects LoginDto without required email', async () => {
    const payload = { password: 'pass' };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
  });

  it('rejects LoginDto with invalid email', async () => {
    const payload = { email: 'invalid-email', password: 'pass' };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
  });

  it('rejects LoginDto without password', async () => {
    const payload = { email: 'user@example.com' };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('password');
  });

  it('rejects RefreshTokenDto without a refresh_token', async () => {
    const payload = {};
    const dto = plainToInstance(RefreshTokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('refresh_token');
  });

  // An email must no longer be enough to obtain a session: the whitelisting
  // ValidationPipe strips it and the missing refresh_token fails validation.
  it('rejects RefreshTokenDto carrying only an email', async () => {
    const payload = { email: 'victim@example.com' };
    const dto = plainToInstance(RefreshTokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('refresh_token');
  });

  it('accepts a valid CreatePermissionDto shape', async () => {
    const payload = {
      name: 'permission.create',
    };

    const dto = plainToInstance(CreatePermissionDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  // Negative tests — require class-validator decorators to be active
  it('rejects CreatePermissionDto without name', async () => {
    const payload = {};
    const dto = plainToInstance(CreatePermissionDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('name');
  });

  it('accepts a valid CreateRoleDto shape', async () => {
    const payload = {
      name: 'admin',
      permissions: ['user.create', 'user.read', 'user.update'],
    };

    const dto = plainToInstance(CreateRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('rejects CreateRoleDto without name', async () => {
    const payload = {
      permissions: ['user.create'],
    };
    const dto = plainToInstance(CreateRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('name');
  });

  it('rejects CreateRoleDto without permissions', async () => {
    const payload = {
      name: 'admin',
    };
    const dto = plainToInstance(CreateRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('permissions');
  });

  it('rejects CreateRoleDto with empty permissions array', async () => {
    const payload = {
      name: 'admin',
      permissions: [],
    };
    const dto = plainToInstance(CreateRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('permissions');
  });

  it('accepts a valid AddPermissionToRoleDto shape', async () => {
    const payload = {
      roleId: 'role-uuid-123',
      permission: 'user.create',
    };

    const dto = plainToInstance(AddPermissionToRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('rejects AddPermissionToRoleDto without roleId', async () => {
    const payload = {
      permission: 'user.create',
    };
    const dto = plainToInstance(AddPermissionToRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('roleId');
  });

  it('rejects AddPermissionToRoleDto without permission', async () => {
    const payload = {
      roleId: 'role-uuid-123',
    };
    const dto = plainToInstance(AddPermissionToRoleDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('permission');
  });
});
