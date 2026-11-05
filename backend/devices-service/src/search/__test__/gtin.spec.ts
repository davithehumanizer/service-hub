import { gtinVariants, isGtin } from '../gtin';

describe('isGtin', () => {
  it('recognises an EAN-13 and a GTIN-14, trimmed', () => {
    expect(isGtin('6936905900777')).toBe(true);
    expect(isGtin(' 18710103640353 ')).toBe(true);
  });

  it('rejects a model name or a short number', () => {
    expect(isGtin('WAN28290')).toBe(false);
    expect(isGtin('12345')).toBe(false);
    expect(isGtin('')).toBe(false);
  });
});

describe('gtinVariants', () => {
  it('offers the GTIN-14 cartons of an EAN-13', () => {
    // The Senseo HD7856: Icecat holds only the carton codes, so scanning the
    // unit's own barcode used to return nothing.
    const variants = gtinVariants('8710103640356');
    expect(variants[0]).toBe('8710103640356');
    expect(variants).toContain('18710103640353');
    expect(variants).toContain('68710103640358');
  });

  it('offers the EAN-13 and the other cartons of a GTIN-14', () => {
    const variants = gtinVariants('68710103640358');
    expect(variants[0]).toBe('68710103640358');
    expect(variants).toContain('8710103640356');
    // The catalogue stores this one under indicator 1, not 6.
    expect(variants).toContain('18710103640353');
  });

  it('does not repeat the code it was given', () => {
    const variants = gtinVariants('18710103640353');
    expect(new Set(variants).size).toBe(variants.length);
  });

  it('leaves anything that is not a GTIN alone', () => {
    expect(gtinVariants('WAN28290')).toEqual(['WAN28290']);
    expect(gtinVariants('12345')).toEqual(['12345']);
    expect(gtinVariants('')).toEqual(['']);
  });

  it('trims the code', () => {
    expect(gtinVariants('  4242002898537 ')[0]).toBe('4242002898537');
  });
});
