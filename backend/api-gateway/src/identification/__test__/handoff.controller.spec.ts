/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { HandoffController } from '../handoff.controller';
import { HandoffService } from '../handoff.service';
import { IdentificationService } from '../identification.service';

describe('HandoffController', () => {
  let controller: HandoffController;
  let handoffService: jest.Mocked<HandoffService>;
  let identificationService: jest.Mocked<IdentificationService>;

  const mockFile = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake image data'),
    size: 1024,
  } as any;

  const mockResult = {
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
    handoffService = {
      create: jest.fn(),
      getStatus: jest.fn(),
      complete: jest.fn(),
      assertConsumable: jest.fn(),
    } as any;
    identificationService = {
      identifyImage: jest.fn(),
    } as any;

    controller = new HandoffController(handoffService, identificationService);
  });

  it('delegates session creation to HandoffService', () => {
    handoffService.create.mockReturnValue({
      pairingId: 'p1',
      token: 't1',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    expect(controller.create()).toEqual({
      pairingId: 'p1',
      token: 't1',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('rejects a status poll without a token', () => {
    expect(() => controller.status('p1', undefined as any)).toThrow(
      BadRequestException,
    );
    expect(handoffService.getStatus).not.toHaveBeenCalled();
  });

  it('returns the session status when a token is provided', () => {
    handoffService.getStatus.mockReturnValue({ status: 'pending', data: null });

    expect(controller.status('p1', 't1')).toEqual({
      status: 'pending',
      data: null,
    });
    expect(handoffService.getStatus).toHaveBeenCalledWith('p1', 't1');
  });

  it('rejects a photo submission without a token', async () => {
    await expect(
      controller.submitPhoto('p1', undefined as any, mockFile),
    ).rejects.toThrow(BadRequestException);
    expect(identificationService.identifyImage).not.toHaveBeenCalled();
  });

  it('rejects a photo submission without a file', async () => {
    await expect(controller.submitPhoto('p1', 't1', null)).rejects.toThrow(
      BadRequestException,
    );
    expect(identificationService.identifyImage).not.toHaveBeenCalled();
  });

  it('checks the session is consumable before running identification', async () => {
    handoffService.assertConsumable.mockImplementation(() => {
      throw new BadRequestException('already used');
    });

    await expect(
      controller.submitPhoto('p1', 't1', mockFile),
    ).rejects.toThrow();
    expect(identificationService.identifyImage).not.toHaveBeenCalled();
  });

  it('identifies the photo and completes the session', async () => {
    identificationService.identifyImage.mockResolvedValue(mockResult as any);

    const response = await controller.submitPhoto('p1', 't1', mockFile);

    expect(handoffService.assertConsumable).toHaveBeenCalledWith('p1', 't1');
    expect(identificationService.identifyImage).toHaveBeenCalledWith(mockFile);
    expect(handoffService.complete).toHaveBeenCalledWith(
      'p1',
      't1',
      mockResult,
    );
    expect(response).toEqual({ success: true });
  });

  it('rejects a barcode submission without a token', () => {
    expect(() =>
      controller.submitBarcode('p1', '', { code: '4242002898537' }),
    ).toThrow(BadRequestException);
    expect(handoffService.complete).not.toHaveBeenCalled();
  });

  it('hands the scanned code back without identifying anything', () => {
    const response = controller.submitBarcode('p1', 't1', {
      code: '4242002898537',
    });

    expect(handoffService.assertConsumable).toHaveBeenCalledWith('p1', 't1');
    // The desktop searches on it, so no ML pipeline runs for a scan.
    expect(identificationService.identifyImage).not.toHaveBeenCalled();
    expect(handoffService.complete).toHaveBeenCalledWith(
      'p1',
      't1',
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ GTIN: '4242002898537' }),
      }),
    );
    expect(response).toEqual({ success: true });
  });
});
