/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import {
  RepairersService,
  MARKER_LIMIT,
} from '../services/repairers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repairer } from '../repairer.entity';
import { RepairerDevice } from '../repairer-device.entity';
import { Brackets } from 'typeorm';
import { RepairerSearchService } from '../../search/repairer-search.service';

/** Brussels-ish rectangle, well clear of the antimeridian. */
const BOUNDS = { north: 51, south: 50, east: 5, west: 4 };

describe('RepairersService.findMarkers', () => {
  let service: RepairersService;
  let qb: any;

  /** The SQL fragments passed to andWhere, for asserting on the query shape. */
  const whereClauses = (): string[] =>
    qb.andWhere.mock.calls
      .map((call: any[]) => call[0])
      .filter((c: unknown) => typeof c === 'string');

  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairersService,
        {
          provide: getRepositoryToken(Repairer),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
        {
          provide: getRepositoryToken(RepairerDevice),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: RepairerSearchService,
          useValue: { searchRepairersPaginated: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RepairersService>(RepairersService);
  });

  it('converts decimal coordinates to numbers', async () => {
    // The driver hands `decimal` columns back as strings. Passing those to
    // Leaflet puts every pin at (0, 0) instead of failing, so the conversion
    // is the difference between a working map and a cluster off Africa.
    qb.getCount.mockResolvedValue(1);
    qb.getRawMany.mockResolvedValue([
      {
        id: 'abc',
        lat: '50.850300',
        lng: '4.351700',
        partner_type: 'repairer',
      },
    ]);

    const result = await service.findMarkers(BOUNDS);

    expect(result.markers).toEqual([
      { id: 'abc', lat: 50.8503, lng: 4.3517, partner_type: 'repairer' },
    ]);
    expect(typeof result.markers[0].lat).toBe('number');
  });

  it('reports the real total when the response is capped', async () => {
    qb.getCount.mockResolvedValue(1234);
    qb.getRawMany.mockResolvedValue([]);

    const result = await service.findMarkers(BOUNDS, undefined, 500);

    expect(result.total).toBe(1234);
    expect(result.truncated).toBe(true);
    expect(qb.limit).toHaveBeenCalledWith(500);
  });

  it('is not truncated when everything fits', async () => {
    qb.getCount.mockResolvedValue(12);

    const result = await service.findMarkers(BOUNDS);

    expect(result.truncated).toBe(false);
    expect(qb.limit).toHaveBeenCalledWith(MARKER_LIMIT);
  });

  it('filters on a plain longitude interval away from the antimeridian', async () => {
    await service.findMarkers(BOUNDS);

    expect(whereClauses()).toContain(
      'repairer.longitude BETWEEN :west AND :east',
    );
  });

  it('splits the longitude test in two when the rectangle crosses the antimeridian', async () => {
    // west ends up east of east. A plain BETWEEN matches nothing here, which
    // would empty the map with no error rather than wrap around.
    await service.findMarkers({ north: 51, south: 50, east: -170, west: 170 });

    expect(whereClauses()).not.toContain(
      'repairer.longitude BETWEEN :west AND :east',
    );
    const bracketArgs = qb.andWhere.mock.calls
      .map((call: any[]) => call[0])
      .filter((c: unknown) => c instanceof Brackets);
    expect(bracketArgs).toHaveLength(1);
  });

  it('normalises longitudes reported outside [-180, 180]', async () => {
    // Panning across a second copy of the world gives Leaflet values like 364.
    await service.findMarkers({ north: 51, south: 50, east: 365, west: 364 });

    const call = qb.andWhere.mock.calls.find(
      (c: any[]) => c[0] === 'repairer.longitude BETWEEN :west AND :east',
    );
    expect(call[1].west).toBeCloseTo(4);
    expect(call[1].east).toBeCloseTo(5);
  });

  it('tolerates north and south given the wrong way round', async () => {
    await service.findMarkers({ north: 50, south: 51, east: 5, west: 4 });

    const call = qb.andWhere.mock.calls.find(
      (c: any[]) => c[0] === 'repairer.latitude BETWEEN :south AND :north',
    );
    expect(call[1]).toEqual({ south: 50, north: 51 });
  });

  it('matches a device type without duplicating the repairer', async () => {
    // A join would return one row per matching device, drawing the same
    // repairer several times on the same spot.
    await service.findMarkers(BOUNDS, { device_type: 'Laptop' });

    const clause = whereClauses().find((c) => c.includes('EXISTS'));
    expect(clause).toBeDefined();
    expect(clause).toContain('repairer_devices');
  });

  it('resolves a country name to its ISO code', async () => {
    await service.findMarkers(BOUNDS, { country: 'Belgium' });

    const call = qb.andWhere.mock.calls.find(
      (c: any[]) => c[0] === 'UPPER(repairer.country) = :country',
    );
    expect(call[1].country).toBe('BE');
  });

  it('excludes rows with no coordinates', async () => {
    await service.findMarkers(BOUNDS);

    expect(qb.where).toHaveBeenCalledWith('repairer.latitude IS NOT NULL');
    expect(whereClauses()).toContain('repairer.longitude IS NOT NULL');
  });
});
