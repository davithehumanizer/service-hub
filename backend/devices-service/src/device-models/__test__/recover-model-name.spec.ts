import { recoverModelName } from '../recover-model-name';

// URLs and descriptions as Icecat stored them for production entries.
describe('recoverModelName', () => {
  describe('Dell', () => {
    it.each([
      [
        '7390',
        'https://www.dell.com/en-us/work/shop/cty/new-latitude-7390/spd/latitude-13-7390-laptop',
        'Latitude 7390',
      ],
      // A series page still names the family; the number is the entry's.
      [
        '5570',
        'https://www.dell.com/ae/p/inspiron-15-5000/pd',
        'Inspiron 5570',
      ],
      [
        '3250',
        'https://www.dell.com/uk/p/vostro-3200-series-small-desktop/pd',
        'Vostro 3250',
      ],
      // The entry has no number: the URL gives it.
      [
        '15',
        'https://www.dell.com/us/business/p/vostro-15-3558-laptop/pd',
        'Vostro 3558',
      ],
      ['15', 'https://www.dell.com/us/eep/p/xps-15-9550-laptop/pd', 'XPS 9550'],
    ])('%s ← %s', (model, url, expected) => {
      expect(recoverModelName('Dell', model, url)).toBe(expected);
    });

    it.each([
      // A series number names no model.
      ['15', 'https://www.dell.com/ae/p/inspiron-15-5000/pd'],
      ['15', 'https://www.dell.com/'],
      ['15', 'https://www.dell.com/ae/p/g-series-15-3579-laptop/pd'],
      // The entry's own "14" is not in a page about a 15-inch model.
      ['14', 'https://www.dell.com/us/business/p/vostro-15-3558-laptop/pd'],
    ])('%s ← %s: none', (model, url) => {
      expect(recoverModelName('Dell', model, url)).toBeNull();
    });
  });

  it('reads the Xperia and the Galaxy from their product pages', () => {
    expect(
      recoverModelName(
        'Sony',
        'Z5',
        'https://www.sonymobile.com/gb/products/phones/xperia-z5/specifications/',
      ),
    ).toBe('Xperia Z5');
    expect(
      recoverModelName(
        'Samsung',
        'S7',
        'https://www.samsung.com/uk/consumer/mobile-devices/smartphones/galaxy-s/galaxy-s7/',
      ),
    ).toBe('Galaxy S7');
    expect(
      recoverModelName(
        'Samsung',
        'S8+',
        'https://www.samsung.com/uk/smartphones/galaxy-s8-plus/',
      ),
    ).toBe('Galaxy S8+');
  });

  describe('Lenovo', () => {
    it.each([
      [
        '15',
        'https://www.lenovo.com/lt/lt/laptops/thinkbook/thinkbook-series/Lenovo-ThinkBook-15-G2-ITL/p/XXTBXTMI500',
        '',
        'ThinkBook 15 G2 ITL',
      ],
      [
        'P8',
        'https://psref.lenovo.com/Detail/ThinkStation_P8?M=30HH003LUS ',
        '',
        'ThinkStation P8',
      ],
      [
        '72',
        'http://shopap.lenovo.com/sg/en/desktops/thinkcentre/edge-series-towers/edge-72/',
        '',
        'ThinkCentre Edge 72',
      ],
      [
        'Helix',
        'http://shop.lenovo.com/us/en/tablets/thinkpad/thinkpad-helix/',
        '',
        'ThinkPad Helix',
      ],
      [
        'P7',
        'https://www.lenovo.com/',
        '<b>ThinkStation P7</b><br>Built for the most demanding workloads',
        'ThinkStation P7',
      ],
    ])('%s ← %s', (model, url, description, expected) => {
      expect(recoverModelName('Lenovo', model, url, description)).toBe(
        expected,
      );
    });

    it('ignores a page that names another model', () => {
      expect(
        recoverModelName(
          'Lenovo',
          '14',
          'https://www.lenovo.com/lt/lt/laptops/thinkbook/thinkbook-series/Lenovo-ThinkBook-15-G2-ITL/p/XXTBXTMI500',
        ),
      ).toBeNull();
      expect(
        recoverModelName(
          'Lenovo',
          'Yoga',
          'https://www.lenovo.com/',
          '<b>Four Awesome Modes. One Incredible Device.</b>',
        ),
      ).toBeNull();
    });
  });

  it('stops a slug where it starts listing the configuration', () => {
    expect(
      recoverModelName(
        'Samsung',
        '15',
        'https://www.samsung.com/us/computing/galaxy-books/galaxy-book-pro-15-intel-core-i5-256gb-np950xdb-ke2us/',
      ),
    ).toBe('Galaxy Book Pro 15');
    expect(
      recoverModelName(
        'Samsung',
        'Go',
        'https://www.samsung.com/us/computing/chromebooks/galaxy-chromebook-go-14-silver-wifi-xe340xda-ka1us/',
      ),
    ).toBe('Galaxy Chromebook GO 14');
  });

  it('recovers nothing when the page only repeats the name', () => {
    expect(
      recoverModelName(
        'Lenovo',
        'Yoga',
        'http://shop.lenovo.com/us/en/laptops/thinkpad/yoga-series/yoga/',
      ),
    ).toBeNull();
  });

  it('recovers nothing for brands it does not know', () => {
    expect(recoverModelName('HP', 'G4', 'https://www8.hp.com')).toBeNull();
  });
});
