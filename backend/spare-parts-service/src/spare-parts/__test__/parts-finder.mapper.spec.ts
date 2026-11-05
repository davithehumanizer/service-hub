/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  mapPartsFinderSparePart,
  PartsFinderSparePart,
} from '../parts-finder.mapper';
import { partsFinderSparePart as realResponse } from './fixtures/partsfinder-spare-part';

describe('mapPartsFinderSparePart', () => {
  describe('against a response captured from the live API', () => {
    const mapped = mapPartsFinderSparePart(
      realResponse as unknown as PartsFinderSparePart,
    );

    it('exposes objectID, which the frontend and the catalogue link both use', () => {
      expect(mapped.objectID).toBe('01a0158a-24a8-7d30-895d-aa5365383d7b');
      expect(mapped.objectID).toBe(mapped.id);
    });

    it('keeps the model tree the detail page reads', () => {
      expect(mapped.model.name).toBe('LED backlight strip');
      expect(mapped.model.brand.name).toBe('Samsung');
      expect(mapped.model.type.name).toBe('TV LED Backlight Strip');
    });

    it('labels the brand status, which the API sends as a bare slug', () => {
      // `Type` has no name in the API, only a slug, so the badge rendered empty.
      expect(mapped.model.brand.status.name).toBe('Active');
      expect(mapped.model.brand.status.slug).toBe('brand-status-active');
    });

    it('flattens the repairer address collection to the single address expected', () => {
      expect(mapped.repairer.name).toBeDefined();
      // This repairer has no address on file, so the field is present and null
      // rather than missing — the map block checks for null, not undefined.
      expect(mapped.repairer.address).toBeNull();
      expect(mapped._geo).toBeUndefined();
    });

    it('carries the media links through untouched', () => {
      // Objects, not bare strings: the search index and the API agree on this
      // shape so a consumer never has to ask which one answered.
      expect(mapped.mediaObjects).toEqual([
        {
          url: 'https://data.spareparts.care2repair.eu/media/01a01a79-3623-7694-a00f-979fb9bef3f7',
          mimeType: 'image/jpeg',
          originalFilename: '41ICkyGh8BL._AC_UF1000,1000_QL80_',
        },
      ]);
    });

    it('keeps prices readable and re-nests the pricing target', () => {
      expect(mapped.prices[0].unitAmount).toBe('19.90');
      expect(mapped.prices[0].currency).toBe('eur');
      expect(mapped.prices[0].productPricingTarget).toEqual({
        slug: 'both',
        name: 'both',
      });
    });

    it('gives the status a legible label, which the API omits', () => {
      expect(mapped.status.slug).toBe('spare-part-status-new');
      expect(mapped.status.name).toBe('New');
    });
  });

  describe('shapes the API can also return', () => {
    it('builds _geo when the repairer has a located address', () => {
      const mapped = mapPartsFinderSparePart({
        id: 'x',
        repairer: {
          id: 'r',
          name: 'Somewhere',
          addresses: [{ latitude: '50.62', longitude: '3.05', locality: 'Lille' }],
        },
      });

      expect(mapped._geo).toEqual({ lat: '50.62', lng: '3.05' });
      expect(mapped.repairer.address.locality).toBe('Lille');
    });

    it('survives a payload with nothing but an id', () => {
      const mapped = mapPartsFinderSparePart({ id: 'x' });

      expect(mapped.objectID).toBe('x');
      expect(mapped.prices).toEqual([]);
      expect(mapped.mediaObjects).toEqual([]);
      expect(mapped.repairer).toBeNull();
      expect(mapped.status).toBeNull();
    });

    it('leaves an already-nested pricing target alone', () => {
      const mapped = mapPartsFinderSparePart({
        id: 'x',
        prices: [{ productPricingTarget: { slug: 'b2c', name: 'B2C' } }],
      });

      expect(mapped.prices[0].productPricingTarget).toEqual({
        slug: 'b2c',
        name: 'B2C',
      });
    });

    it('prefers a real status name over the derived one', () => {
      const mapped = mapPartsFinderSparePart({
        id: 'x',
        status: { slug: 'spare-part-status-good', name: 'Bon état' },
      });

      expect(mapped.status.name).toBe('Bon état');
    });
  });
});
