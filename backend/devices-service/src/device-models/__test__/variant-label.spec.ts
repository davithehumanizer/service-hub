import { variantLabels, variantParts } from '../variant-label';

const labels = (variants: Record<string, string>[], categories?: string[]) => [
  ...variantLabels(
    variants.map((properties, id) => ({ id, properties })),
    categories,
  ).values(),
];

describe('variantLabels', () => {
  it('labels a phone with what its variants differ in only', () => {
    const shared = {
      'Processor family': 'Qualcomm Snapdragon',
      'Processor model': '8 Gen 2',
      'Display diagonal': '6.1',
    };
    expect(
      labels([
        {
          ...shared,
          'Internal storage capacity': '128',
          'Product colour': 'Black',
        },
        {
          ...shared,
          'Internal storage capacity': '256',
          'Product colour': 'Cream colour',
        },
        {
          ...shared,
          'Internal storage capacity': '256',
          'Product colour': 'Black',
        },
      ]),
    ).toEqual(['128 GB · Black', '256 GB · Cream colour', '256 GB · Black']);
  });

  it('tells phones apart by their RAM, which is in RAM capacity', () => {
    const shared = {
      'Internal storage capacity': '512',
      'Product colour': 'Black',
    };
    expect(
      labels([
        { ...shared, 'RAM capacity': '8' },
        { ...shared, 'RAM capacity': '12' },
        // Both given: RAM capacity says what the RAM is.
        { ...shared, 'RAM capacity': '6', 'Internal memory': '0.1' },
      ]),
    ).toEqual(['8 GB RAM', '12 GB RAM', '6 GB RAM']);
  });

  it('names processors as one would, with or without their family', () => {
    expect(
      labels([
        { 'Processor family': 'Intel Core i5', 'Processor model': 'i5-8350U' },
        { 'Processor family': 'AMD Ryzen 5', 'Processor model': '5600U' },
        {
          'Processor family': 'Intel® Core™ Ultra 7',
          'Processor model': '155H',
        },
      ]),
    ).toEqual(['i5-8350U', 'Ryzen 5 5600U', 'Core Ultra 7 155H']);
  });

  it('writes capacities with their unit, and leaves out what says none', () => {
    expect(
      labels([
        {
          'Internal memory': '0.512',
          'Total storage capacity': '1500',
          'Discrete graphics card model': 'NVIDIA GeForce MX130',
        },
        {
          'Internal memory': '16',
          'Total storage capacity': '512',
          'Discrete graphics card model': 'Not available',
        },
      ]),
    ).toEqual([
      '512 MB RAM · 1.5 TB · NVIDIA GeForce MX130',
      '16 GB RAM · 512 GB',
    ]);
  });

  it("reads Internal memory as a printer's in MB, a television's not at all", () => {
    const memories = [
      { 'Internal memory': '128' },
      { 'Internal memory': '1536' },
    ];
    expect(labels(memories, ['Printer'])).toEqual(['128 MB RAM', '1.5 GB RAM']);
    expect(labels(memories, ['Laptop'])).toEqual(['128 GB RAM', '1536 GB RAM']);
    // A television's is storage, in MB: not what a label tells.
    expect(
      labels(memories, ['Flat Display Panel Television (LCD, LED, Plasma)']),
    ).toEqual([null, null]);
  });

  it('reads memory below 1 GB as Icecat writes it, 0.5 or 0.064', () => {
    expect(
      labels([
        { 'Internal memory': '0.5' },
        { 'Internal memory': '0.064' },
        { 'Internal memory': '0.75' },
      ]),
    ).toEqual(['512 MB RAM', '64 MB RAM', '768 MB RAM']);
  });

  it('keeps a sum of drives in GB, and drops a zero and an inch spelt out', () => {
    expect(
      labels([
        {
          'Internal memory': '0',
          'Total storage capacity': '1256',
          'Display diagonal': '6.31 inch',
        },
        {
          'Internal memory': '8',
          'Total storage capacity': '1000',
          'Display diagonal': '6.1',
        },
      ]),
    ).toEqual(['1256 GB · 6.31"', '8 GB RAM · 1 TB · 6.1"']);
  });

  it('shows four parts, and one more for variants four leave identical', () => {
    const base = {
      'Processor model': 'i5-8350U',
      'Internal memory': '8',
      'Total storage capacity': '256',
      'Display diagonal': '15.6',
      'Operating system installed': 'Windows 10 Pro',
    };
    expect(
      labels([
        { ...base, 'Keyboard language': 'German' },
        { ...base, 'Keyboard language': 'Belgian' },
        {
          ...base,
          'Processor model': 'i7-8650U',
          'Internal memory': '16',
          'Total storage capacity': '512',
          'Display diagonal': '15',
          'Operating system installed': 'Windows 11 Pro',
          'Keyboard language': 'German',
        },
      ]),
    ).toEqual([
      'i5-8350U · 8 GB RAM · 256 GB · 15.6" · Windows 10 Pro · German',
      'i5-8350U · 8 GB RAM · 256 GB · 15.6" · Windows 10 Pro · Belgian',
      'i7-8650U · 16 GB RAM · 512 GB · 15"',
    ]);
  });

  it('labels nothing for one variant, or variants nothing tells apart', () => {
    expect(labels([{ 'Product colour': 'Black' }])).toEqual([null]);
    expect(
      labels([
        { 'Product colour': 'Black' },
        { 'Product colour': 'Black' },
        {},
      ]),
    ).toEqual([null, null, null]);
  });
});

describe('variantParts', () => {
  const parts = (variants: Record<string, string>[], categories?: string[]) => [
    ...variantParts(
      variants.map((properties, id) => ({ id, properties })),
      categories,
    ).values(),
  ];

  it('keeps every part the variants differ in, by key, beyond the four a label shows', () => {
    const laptop = (
      cpu: string,
      ram: string,
      ssd: string,
      colour: string,
      inches: string,
    ) => ({
      'Processor model': cpu,
      'Internal memory': ram,
      'Internal storage capacity': ssd,
      'Product colour': colour,
      'Display diagonal': inches,
    });
    expect(
      parts([
        laptop('i5-8350U', '8', '256', 'Black', '14'),
        laptop('i7-8650U', '16', '512', 'Silver', '15.6'),
      ]),
    ).toEqual([
      {
        processor: 'i5-8350U',
        ram: '8 GB',
        storage: '256 GB',
        colour: 'Black',
        display: '14"',
      },
      {
        processor: 'i7-8650U',
        ram: '16 GB',
        storage: '512 GB',
        colour: 'Silver',
        display: '15.6"',
      },
    ]);
  });

  it('leaves out what a variant does not say, and has no parts for one variant', () => {
    expect(
      parts([
        { 'Product colour': 'Black', 'Internal storage capacity': '128' },
        { 'Product colour': 'Green', 'Internal storage capacity': '256' },
        { 'Product colour': 'Green' },
      ]),
    ).toEqual([
      { colour: 'Black', storage: '128 GB' },
      { colour: 'Green', storage: '256 GB' },
      { colour: 'Green' },
    ]);
    expect(parts([{ 'Product colour': 'Black' }])).toEqual([{}]);
  });
});
