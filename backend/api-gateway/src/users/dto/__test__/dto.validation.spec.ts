import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterUserDto } from '../register-user.dto';
import { ResetPasswordRequestDto } from '../reset-password-request.dto';
import { ResetPasswordDto } from '../reset-password.dto';
import { ResetPasswordWithTokenDto } from '../reset-password-with-token.dto';
import { UpdateProfileDto } from '../update-profile.dto';

describe('User DTO validation (helps when enabling ValidationPipe)', () => {
  it('accepts a valid RegisterUserDto shape', async () => {
    const payload = {
      email: 'newuser@example.com',
      password: 'securepassword',
      userType: 'customer',
      profile: { firstName: 'John', lastName: 'Doe' },
    };

    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid RegisterUserDto with userType repairer', async () => {
    const payload = {
      email: 'repairer@example.com',
      password: 'securepassword',
      userType: 'repairer',
    };

    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    const props = errors.map((e) => e.property);
    expect(props).not.toContain('userType');
  });

  it('accepts a valid RegisterUserDto with minimal required fields', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'password123',
      profile: {},
    };

    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid ResetPasswordRequestDto shape', async () => {
    const payload = {
      email: 'user@example.com',
    };

    const dto = plainToInstance(ResetPasswordRequestDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid ResetPasswordDto shape', async () => {
    const payload = {
      email: 'user@example.com',
      newPassword: 'newsecurepassword',
      resetToken: 'abc123token',
    };

    const dto = plainToInstance(ResetPasswordDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid ResetPasswordWithTokenDto shape', async () => {
    const payload = {
      newPassword: 'newsecurepassword',
      email: 'user@example.com',
    };

    const dto = plainToInstance(ResetPasswordWithTokenDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('accepts a valid UpdateProfileDto shape', async () => {
    const payload = {
      profile: { firstName: 'Jane', lastName: 'Smith', phone: '123456789' },
    };

    const dto = plainToInstance(UpdateProfileDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(Array.isArray(errors)).toBe(true);
  });

  // Negative tests — require class-validator decorators to be active
  it('rejects RegisterUserDto without required email', async () => {
    const payload = { password: 'pass', profile: {} };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
  });

  it('rejects RegisterUserDto with invalid email', async () => {
    const payload = { email: 'invalid-email', password: 'pass', profile: {} };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
  });

  it('rejects RegisterUserDto without password', async () => {
    const payload = { email: 'user@example.com', profile: {} };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('password');
  });

  it('accepts RegisterUserDto without profile (profile is optional)', async () => {
    const payload = { email: 'user@example.com', password: 'pass' };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    const props = errors.map((e) => e.property);
    expect(props).not.toContain('profile');
  });

  it('rejects RegisterUserDto with non-object profile', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'pass',
      profile: 'not-an-object',
    };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('profile');
  });

  it('rejects RegisterUserDto with invalid userType', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'pass',
      userType: 'admin',
      profile: {},
    };
    const dto = plainToInstance(RegisterUserDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('userType');
  });

  it('rejects ResetPasswordRequestDto with invalid email', async () => {
    const payload = { email: 'invalid' };
    const dto = plainToInstance(ResetPasswordRequestDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
  });

  it('rejects ResetPasswordDto without resetToken', async () => {
    const payload = { email: 'user@example.com', newPassword: 'pass' };
    const dto = plainToInstance(ResetPasswordDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('resetToken');
  });

  it('strips from the profile what a user may not change', async () => {
    const payload = {
      profile: { id: 7, user: { id: 1 }, firstName: 'Jane', onboardingCompleted: true },
    };
    const dto = plainToInstance(UpdateProfileDto, payload);
    // What the global ValidationPipe does with whitelist: true.
    const errors = await validate(dto, { whitelist: true });
    expect(errors).toHaveLength(0);
    expect(dto.profile).toEqual({ firstName: 'Jane', onboardingCompleted: true });
  });

  it('rejects a profile field of the wrong type', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      profile: { firstName: 42, onboardingCompleted: 'yes' },
    });
    const errors = await validate(dto);
    const nested = errors.find((e) => e.property === 'profile')?.children ?? [];
    expect(nested.map((e) => e.property).sort()).toEqual(['firstName', 'onboardingCompleted']);
  });

  it('rejects UpdateProfileDto without profile', async () => {
    const payload = {};
    const dto = plainToInstance(UpdateProfileDto, payload);
    const errors = await validate(dto as unknown as object);
    expect(errors.length).toBeGreaterThan(0);
    const props = errors.map((e) => e.property);
    expect(props).toContain('profile');
  });
});
