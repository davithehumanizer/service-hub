import { icecatNamingProperties } from '../icecat-naming';

describe('icecatNamingProperties', () => {
  it('keeps the family, series and title of the product', () => {
    // From a real Icecat product sheet.
    expect(
      icecatNamingProperties({
        Title:
          'Samsung Galaxy S24 Ultra 17.3 cm (6.8") Dual SIM 5G USB Type-C 12 GB 256 GB 5000 mAh Violet',
        ProductFamily: { Value: 'Galaxy' },
        ProductSeries: { Value: 'S24 Ultra' },
      }),
    ).toEqual([
      { property_name: 'ProductFamily', property_value: 'Galaxy' },
      { property_name: 'ProductSeries', property_value: 'S24 Ultra' },
      {
        property_name: 'Title',
        property_value:
          'Samsung Galaxy S24 Ultra 17.3 cm (6.8") Dual SIM 5G USB Type-C 12 GB 256 GB 5000 mAh Violet',
      },
    ]);
  });

  it('leaves out what the sheet does not give', () => {
    expect(
      icecatNamingProperties({ ProductFamily: { Value: ' ' }, Title: 42 }),
    ).toEqual([]);
    expect(icecatNamingProperties({})).toEqual([]);
  });
});
