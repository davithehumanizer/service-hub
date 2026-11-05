import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTutorialSubscriptionDto } from '../create-tutorial-subscription.dto';

describe('CreateTutorialSubscriptionDto validation', () => {
  it('accepts a valid payload with all fields', async () => {
    const payload = {
      email: 'user@example.com',
      deviceId: 'device-uuid-123',
      issueTypes: ['screen_broken', 'battery'],
      locale: 'fr',
    };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid payload with only required fields', async () => {
    const payload = { email: 'user@example.com', locale: 'en' };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid email', async () => {
    const payload = { email: 'not-an-email', locale: 'en' };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('email');
  });

  it('rejects a missing locale', async () => {
    const payload = { email: 'user@example.com' };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('locale');
  });

  it('rejects an unsupported locale', async () => {
    const payload = { email: 'user@example.com', locale: 'es' };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('locale');
  });

  it('rejects a non-array issueTypes', async () => {
    const payload = {
      email: 'user@example.com',
      locale: 'en',
      issueTypes: 'screen_broken',
    };

    const dto = plainToInstance(CreateTutorialSubscriptionDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('issueTypes');
  });
});
