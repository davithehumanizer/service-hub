import { normalizeModel, toKey } from '../normalize-model';
import { DEFAULT_RULES, NormalizationRules } from '../normalization-rules';

// As the callers build them: every known brand added as itself.
const rules: NormalizationRules = {
  ...DEFAULT_RULES,
  brandAliases: {
    ...Object.fromEntries(
      [
        'Samsung',
        'Lenovo',
        'HP',
        'Apple',
        'ASUS',
        'MSI',
        'Philips',
        'Honor',
        'Sony',
        'Saeco',
        'Bosch',
      ].map((b) => [b.toLowerCase(), b]),
    ),
    ...DEFAULT_RULES.brandAliases,
  },
};

const model = (brand: string, name: string, productCode = '', category = '') =>
  normalizeModel(brand, name, rules, productCode, category);

// Real catalogue entries.
describe('normalizeModel', () => {
  describe('manufacturer names', () => {
    it('drops the brand repeated at the start of the model', () => {
      const repeated = model('Samsung', 'Samsung Galaxy S23 Ultra');
      expect(repeated.name).toBe('Galaxy S23 Ultra');
      expect(repeated.key).toBe(model('Samsung', 'Galaxy S23 Ultra').key);
    });

    it('treats DELL and Dell as one brand', () => {
      const upper = model('DELL', 'Latitude 5590');
      expect(upper.brand).toBe('Dell');
      expect(upper.key).toBe(model('Dell', 'Latitude 5590').key);
    });

    it('keeps the suffixes that name another model', () => {
      const s23 = model('Samsung', 'Galaxy S23').key;
      for (const other of [
        'Galaxy S23 FE',
        'Galaxy S23+',
        'Galaxy S23 Ultra',
      ]) {
        expect(model('Samsung', other).key).not.toBe(s23);
      }
      expect(model('Lenovo', 'ThinkPad T14 Gen 6 (Intel)').key).not.toBe(
        model('Lenovo', 'ThinkPad T14 Gen 6 (AMD)').key,
      );
    });

    it('is not refurbished, nor from a reseller', () => {
      const plain = model('Lenovo', 'ThinkPad T16 Gen 3');
      expect(plain).toMatchObject({
        name: 'ThinkPad T16 Gen 3',
        isRefurbished: false,
        fromReseller: false,
      });
    });
  });

  describe('names that carry the configuration', () => {
    it.each([
      ['ASUS', 'UX310UA-FC339T', 'UX310UA'],
      ['ASUS', 'TP401MA-BZ318R-3Y', 'TP401MA'],
      ['ASUS', 'Eee PC 701 4G Green', 'Eee PC 701 4G Green'],
      ['MSI', 'GL63 9SDK-611', 'GL63 9SDK'],
      ['MSI', 'GS63VR 7RG(Stealth Pro)-051TR', 'GS63VR 7RG'],
      ['MSI', 'Modern 15 B7M-289FR', 'Modern 15 B7M'],
      ['MSI', 'GT72-6QDG16H21 Dominator G', 'GT72-6QDG16H21 Dominator G'],
      ['Philips', 'HD9622/21', 'HD9622'],
      ['Philips', 'XU3100/01R1', 'XU3100'],
    ])('%s %s → %s', (brand, name, expected) => {
      expect(model(brand, name).name).toBe(expected);
    });
  });

  describe('HP names', () => {
    it.each([
      ['Computadora portátil EliteBook 830 G6', '', 'EliteBook 830 G6'],
      [
        'Equipo de escritorio mini HP ProDesk 600 G5 8MT97UC',
        '8MT97UC',
        'ProDesk 600 G5',
      ],
      ['Workstation Z4 G4', '', 'Z4 G4'],
      ['Z2 SFF G4 Workstation', '', 'Z2 SFF G4'],
      ['Pavilion p7-1179c Desktop PC QX340AA', 'QX340AA', 'Pavilion p7-1179c'],
    ])('%s → %s', (name, productCode, expected) => {
      expect(model('HP', name, productCode).name).toBe(expected);
    });

    it('groups a workstation named with and without its type', () => {
      expect(model('HP', 'Workstation Z4 G4').key).toBe(
        model('HP', 'Z4 G4').key,
      );
    });
  });

  describe('resellers', () => {
    it.each([
      ['Forza Refurbished', 'Apple iPhone 11', 'Apple', 'iPhone 11', false],
      [
        'Flex IT',
        'HP EliteBook 850 G4 (Refurbished)',
        'HP',
        'EliteBook 850 G4',
        false,
      ],
      [
        'upcycle it',
        'Dell Inc. Latitude 5590 (Refurbished) B',
        'Dell',
        'Latitude 5590',
        false,
      ],
      [
        'T1A',
        'Lenovo ThinkPad L13 Gen 2 Refurbished',
        'Lenovo',
        'ThinkPad L13 Gen 2',
        false,
      ],
      [
        'BSI-Refurbished',
        'Lenovo ThinkCentre M720S i5 8th Gen (BSI Certified Refurbished)',
        'Lenovo',
        'ThinkCentre M720S',
        true,
      ],
      [
        'A2C',
        'A2C Lenovo ThinkPad T14s I5 10th Gen 16GB RAM 256GB SSD 14" FHD W11Pro 1 Year Return to Base Warranty',
        'Lenovo',
        'ThinkPad T14s',
        true,
      ],
      [
        'Circular Computing',
        'HP - EliteBook 840 G5 Laptop - 14" FHD (1920x1080) - Intel Core i5 8th Gen 8250U - 8GB RAM - 256GB SSD - Windows 10 Professional - Full UK (UK Layout) - Remanufactured',
        'HP',
        'EliteBook 840 G5',
        true,
      ],
      [
        'i-go Life',
        'Galaxy S23, 128GB, Phantom Black, Grade A (Samsung SM-S911BZKDEUB)',
        'Samsung',
        'Galaxy S23',
        true,
      ],
      [
        'Flex IT',
        'EliteBook 840 G5 (Refurbished)',
        'HP',
        'EliteBook 840 G5',
        false,
      ],
    ])('%s: %s', (reseller, name, brand, expected, cut) => {
      expect(model(reseller, name)).toMatchObject({
        brand,
        name: expected,
        isRefurbished: true,
        fromReseller: true,
        cutAtConfiguration: cut,
        makerUnknown: false,
      });
    });

    it('finds the maker after a label such as "BSI certified"', () => {
      for (const name of [
        'BSI certified Dell Latitude 5590',
        'Circular Computing BSI certified Dell Latitude 5590',
      ]) {
        expect(model('Circular Computing', name)).toMatchObject({
          brand: 'Dell',
          name: 'Latitude 5590',
        });
      }
    });

    it('matches "G1" and "Gen 2i" with the names Lenovo gives', () => {
      expect(model('Refurb', 'Lenovo Thinkpad T14 G1').key).toBe(
        model('Lenovo', 'ThinkPad T14 Gen 1').key,
      );
      expect(model('T1A', 'Lenovo ThinkPad T14s Gen 2i').name).toBe(
        'ThinkPad T14s Gen 2 (Intel)',
      );
      expect(model('Lenovo', 'IdeaPad G50').name).toBe('IdeaPad G50');
    });

    it('reads the processor maker in the configuration it cuts off', () => {
      expect(
        model('A2C', 'Lenovo ThinkPad T14 Gen 1 Ryzen 5 16GB').cpuVendor,
      ).toBe('amd');
      expect(model('A2C', 'Lenovo ThinkPad T14 Gen 1 i5 16GB').cpuVendor).toBe(
        'intel',
      );
    });

    it('keeps the size Apple names its laptops by', () => {
      expect(model('Forza Refurbished', 'MacBook Pro 13"').name).toBe(
        'MacBook Pro 13"',
      );
      expect(model('Forza Refurbished', 'MacBook Pro 13"').key).not.toBe(
        model('Forza Refurbished', 'MacBook Pro 15"').key,
      );
    });

    it('lands on the key of the manufacturer model', () => {
      expect(
        model('upcycle it', 'Dell Inc. Latitude 5590 (Refurbished) B').key,
      ).toBe(model('DELL', 'Latitude 5590').key);
    });

    it('keeps the reseller as brand when no maker can be found', () => {
      expect(model('Refurb', 'Mystery Box 3000')).toMatchObject({
        brand: 'Refurb',
        makerUnknown: true,
        key: 'refurb|mystery box 3000',
      });
    });
  });

  describe('names too incomplete to group on', () => {
    it.each([
      ['Lenovo', '15'],
      ['Lenovo', '3'],
      ['Samsung', 'S7'],
      ['HP', ''],
      ['HP', 'G4'],
      ['Lenovo', 'Yoga'],
      ['Sony', 'Z'],
      ['Forza Refurbished', 'Apple MacBook Pro'],
    ])('%s "%s" gets no key', (brand, name) => {
      expect(model(brand, name).key).toBeNull();
    });

    it('accepts short names for brands that use them whole', () => {
      expect(model('Honor', '8X').key).toBe('honor|8x');
      expect(model('Honor', '10').key).toBe('honor|10');
    });

    it('groups a short or numeric name only within its category', () => {
      const p50 = model('Lenovo', 'P50', '', 'Laptop');
      expect(p50).toMatchObject({
        key: 'lenovo|p50|laptop',
        groupedByCategory: true,
      });
      // Lenovo gives 510S to an IdeaCentre desktop and an IdeaPad laptop.
      expect(model('Lenovo', '510S', '', 'Desktop computer').key).not.toBe(
        model('Lenovo', '510S', '', 'Laptop').key,
      );
      expect(
        model('Lenovo', 'ThinkPad P50', '', 'Laptop').groupedByCategory,
      ).toBe(false);
    });

    it('does not group a Dell number at all, even within its category', () => {
      // "5590" is a Latitude and an Inspiron, both laptops.
      expect(model('DELL', '5590', '', 'Laptop').key).toBeNull();
      expect(model('DELL', '15R', '', 'Laptop').key).toBeNull();
      expect(model('DELL', 'Latitude 5590', '', 'Laptop').key).toBe(
        'dell|latitude 5590',
      );
    });
  });
});

// Found by running the rules over the 1.12 M production entries.
describe('normalizeModel, cases from the full catalogue', () => {
  it('keeps the product code when it is the model number', () => {
    // 418 Eee PC and 38 Saeco machines were merged into one model each.
    const eee = model('ASUS', 'Eee PC 1002HA', '1002HA');
    expect(eee.name).toBe('Eee PC 1002HA');
    expect(eee.key).not.toBe(model('ASUS', 'Eee PC 1000H', '1000H').key);
    expect(
      model('Saeco', 'Automatic espresso machine RI9724/47', 'RI9724/47').key,
    ).not.toBe(
      model('Saeco', 'Automatic espresso machine RI9755/47', 'RI9755/47').key,
    );
  });

  it('keeps how Lenovo writes its own names, while matching "G2" and "Gen 2"', () => {
    const own = model('Lenovo', 'ThinkBook 15 G2 ITL');
    expect(own.name).toBe('ThinkBook 15 G2 ITL');
    expect(own.key).toBe(model('T1A', 'Lenovo ThinkBook 15 Gen 2 ITL').key);
  });

  it('keeps a model letter that is not a refurbishment grade', () => {
    expect(
      model('Forza Refurbished', 'Samsung Galaxy Tab A (Refurbished)').name,
    ).toBe('Galaxy Tab A');
  });

  it('reads the processor named first in the configuration', () => {
    expect(
      model(
        'A2C',
        'Lenovo ThinkPad T14 Gen 1 Ryzen 5 PRO 4650U 16GB Intel Wi-Fi 6',
      ).cpuVendor,
    ).toBe('amd');
  });

  it('recognises Apple whatever the canonical spelling', () => {
    const upper: NormalizationRules = {
      ...rules,
      brandAliases: { ...rules.brandAliases, apple: 'APPLE' },
    };
    expect(
      normalizeModel('Forza Refurbished', 'Apple MacBook Pro 13"', upper).name,
    ).toBe('MacBook Pro 13"');
  });

  it('gives no key to a name with nothing left once made a key', () => {
    expect(
      model('Bosch', '- дребна електродомакинска техника-Прахосмукачки').key,
    ).toBeNull();
  });
});

describe('toKey', () => {
  it('ignores case, accents and punctuation, and keeps "+"', () => {
    expect(toKey('ThinkPad T14 Gen 6 (Intel)')).toBe(
      'thinkpad t14 gen 6 intel',
    );
    expect(toKey('Portátil  EliteBook')).toBe('portatil elitebook');
    expect(toKey('Galaxy S23 +')).toBe('galaxy s23+');
  });
});
