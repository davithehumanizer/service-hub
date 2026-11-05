import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  SubmitApiToolDto,
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
} from '../dto/submit-api-tool.dto';
import { ApproveRejectApiToolDto } from '../dto/approve-reject-api-tool.dto';
import { ApproveApiToolDto } from '../dto/approve-api-tool.dto';

const validPayload = {
  name: 'iFixit API',
  shortDescription: 'Access repair guides and device information.',
  websiteUrl: 'https://www.ifixit.com',
  category: ApiToolCategory.REPAIR,
  authType: ApiToolAuthType.NONE,
  pricingModel: ApiToolPricingModel.FREE,
  isPubliclyAccessible: true,
  requiresAccount: false,
  requiresApiKey: false,
};

describe('ApiCatalog DTO validation', () => {
  // -------------------------------------------------------------------
  describe('SubmitApiToolDto', () => {
    it('should have static name "ApiCatalog.Submit"', () => {
      expect(SubmitApiToolDto.name).toBe('ApiCatalog.Submit');
    });

    it('should pass with all required fields', async () => {
      const dto = plainToInstance(SubmitApiToolDto, validPayload);
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all optional fields populated', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        fullDescription: 'A comprehensive repair database.',
        baseApiUrl: 'https://www.ifixit.com/api/2.0',
        logoUrl: 'https://www.ifixit.com/logo.png',
        tags: ['repair', 'guides', 'electronics'],
        authDetails: 'No auth required.',
        pricingDetails: 'Completely free for non-commercial use.',
        pricingUrl: 'https://www.ifixit.com/pricing',
        documentationUrl: 'https://www.ifixit.com/api/2.0/doc',
        swaggerUrl: 'https://www.ifixit.com/api/swagger',
        openApiSpecUrl: 'https://www.ifixit.com/api/openapi.json',
        apiVersion: 'v2',
        supportedFormats: ['json'],
        endpoints: [
          { method: 'GET', path: '/devices', description: 'List all devices' },
          { method: 'GET', path: '/guides', description: 'List all guides' },
        ],
      });
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should fail when name is missing', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        name: undefined,
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('name');
    });

    it('should fail when name is too short (< 2 chars)', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        name: 'A',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('name');
    });

    it('should fail when shortDescription is missing', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        shortDescription: undefined,
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('shortDescription');
    });

    it('should fail when shortDescription is too short (< 10 chars)', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        shortDescription: 'Short',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('shortDescription');
    });

    it('should fail when shortDescription exceeds 160 characters', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        shortDescription: 'x'.repeat(161),
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('shortDescription');
    });

    it('should fail when websiteUrl is not a valid URL', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        websiteUrl: 'not-a-url',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('websiteUrl');
    });

    it('should fail when category is an invalid enum value', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        category: 'invalid_category',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('category');
    });

    it('should fail when authType is an invalid enum value', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        authType: 'password',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('authType');
    });

    it('should fail when pricingModel is an invalid enum value', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        pricingModel: 'subscription',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('pricingModel');
    });

    it('should fail when optional logoUrl is provided but not a valid URL', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        logoUrl: 'not-a-url',
      });
      const errors = await validate(dto as unknown as object);
      const props = errors.map((e) => e.property);
      expect(props).toContain('logoUrl');
    });

    it('should pass when optional logoUrl is omitted', async () => {
      const { ...payloadWithoutLogo } = validPayload;
      const dto = plainToInstance(SubmitApiToolDto, payloadWithoutLogo);
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should fail when endpoint method is not a valid HTTP method', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        endpoints: [{ method: 'CONNECT', path: '/test', description: 'Test' }],
      });
      const errors = await validate(dto as unknown as object);
      expect(errors.some((e) => e.property === 'endpoints')).toBe(true);
    });

    it('should pass with valid endpoints', async () => {
      const dto = plainToInstance(SubmitApiToolDto, {
        ...validPayload,
        endpoints: [
          { method: 'GET', path: '/devices', description: 'List devices' },
          { method: 'POST', path: '/submit', description: 'Submit a device' },
        ],
      });
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  describe('ApproveRejectApiToolDto', () => {
    it('should have static name "ApiCatalog.ApproveReject"', () => {
      expect(ApproveRejectApiToolDto.name).toBe('ApiCatalog.ApproveReject');
    });

    it('should pass with no fields (all optional)', async () => {
      const dto = plainToInstance(ApproveRejectApiToolDto, {});
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should pass with a valid string reason', async () => {
      const dto = plainToInstance(ApproveRejectApiToolDto, {
        reason: 'Missing documentation link.',
      });
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should fail when reason is not a string', async () => {
      const dto = plainToInstance(ApproveRejectApiToolDto, { reason: 123 });
      const errors = await validate(dto as unknown as object);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  describe('ApproveApiToolDto', () => {
    it('should have static name "ApiCatalog.Approve"', () => {
      expect(ApproveApiToolDto.name).toBe('ApiCatalog.Approve');
    });

    it('should pass with no fields (isCommunity optional)', async () => {
      const dto = plainToInstance(ApproveApiToolDto, {});
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should pass with a boolean isCommunity', async () => {
      const dto = plainToInstance(ApproveApiToolDto, { isCommunity: false });
      const errors = await validate(dto as unknown as object);
      expect(errors).toHaveLength(0);
    });

    it('should fail when isCommunity is not a boolean', async () => {
      const dto = plainToInstance(ApproveApiToolDto, { isCommunity: 'yes' });
      const errors = await validate(dto as unknown as object);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
