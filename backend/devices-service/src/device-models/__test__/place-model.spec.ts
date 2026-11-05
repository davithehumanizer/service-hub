import { normalizeModel } from '../normalize-model';
import { DEFAULT_RULES, NormalizationRules } from '../normalization-rules';
import { KnownModels, placeModel, resellerCandidates } from '../place-model';

const rules: NormalizationRules = {
  ...DEFAULT_RULES,
  brandAliases: {
    samsung: 'Samsung',
    lenovo: 'Lenovo',
    apple: 'Apple',
    hp: 'HP',
    ...DEFAULT_RULES.brandAliases,
  },
};
const n = (brand: string, model: string) => normalizeModel(brand, model, rules);

// Models already known: a manufacturer's Galaxy S23 and ThinkPad (Intel),
// and an iPhone 12 Pro only resellers list.
const known: KnownModels = {
  fromManufacturer: (key) =>
    ['samsung|galaxy s23', 'lenovo|thinkpad t14 gen 1 intel'].includes(key),
  exists: (key) =>
    [
      'samsung|galaxy s23',
      'lenovo|thinkpad t14 gen 1 intel',
      'apple|iphone 12 pro',
    ].includes(key),
};
const place = (brand: string, model: string) =>
  placeModel(n(brand, model), brand, known);

describe('placeModel', () => {
  it("files a manufacturer's entry under its own key", () => {
    expect(place('Samsung', 'Galaxy S23')).toEqual({
      placement: 'manufacturer',
      key: 'samsung|galaxy s23',
      brand: 'Samsung',
    });
  });

  it("attaches a reseller's entry to the manufacturer's model, without its 5G", () => {
    expect(place('Forza Refurbished', 'Samsung Galaxy S23 5G')).toEqual({
      placement: 'attached',
      key: 'samsung|galaxy s23',
      brand: 'Samsung',
    });
  });

  it('picks the Intel model from the processor of the cut configuration', () => {
    expect(
      place('A2C', 'Lenovo ThinkPad T14 Gen 1 i5 16GB 256GB SSD'),
    ).toMatchObject({
      placement: 'attached',
      key: 'lenovo|thinkpad t14 gen 1 intel',
    });
  });

  it('files a clean reseller name under the real maker when no manufacturer lists it', () => {
    expect(place('Forza Refurbished', 'Apple iPhone 11')).toEqual({
      placement: 'maker-model',
      key: 'apple|iphone 11',
      brand: 'Apple',
    });
  });

  it('lets a cut name join a model of the real maker', () => {
    expect(place('Teqcycle', 'Apple iPhone 12 Pro 256GB Blue')).toMatchObject({
      placement: 'maker-model',
      key: 'apple|iphone 12 pro',
    });
  });

  it('keeps under the reseller a cut name that matches no model', () => {
    expect(place('T1A', 'L-T440S-SCA-P018 W10P REFURBISHED, 8GB')).toEqual({
      placement: 'reseller-own',
      key: 't1a|l t440s sca p018',
      brand: 'T1A',
    });
  });

  it('keeps under the reseller a name with no maker, even when its model exists', () => {
    // A second identical entry finds the model the first one made: it is
    // still the reseller's own, not a model of a real maker.
    const placed = placeModel(n('T1A', 'L-T440S-SCA-P018'), 'T1A', {
      fromManufacturer: () => false,
      exists: (key) => key === 't1a|l t440s sca p018',
    });
    expect(placed).toEqual({
      placement: 'reseller-own',
      key: 't1a|l t440s sca p018',
      brand: 'T1A',
    });
  });

  it('leaves an incomplete name on its own', () => {
    expect(place('Lenovo', '15')).toEqual({
      placement: 'isolated',
      key: null,
      brand: 'Lenovo',
    });
  });
});

describe('resellerCandidates', () => {
  it('tries the exact key first, each candidate once', () => {
    expect(
      resellerCandidates(n('A2C', 'Lenovo ThinkPad T14 Gen 1 i5 16GB')),
    ).toEqual(['lenovo|thinkpad t14 gen 1', 'lenovo|thinkpad t14 gen 1 intel']);
    expect(resellerCandidates(n('Lenovo', '15'))).toEqual([]);
  });
});
