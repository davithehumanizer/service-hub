import {
  LocalizableCategory,
  localizeCategories,
} from '../localize-categories';

describe('localizeCategories', () => {
  const holders = (): { categories: LocalizableCategory[] }[] => [
    { categories: [{ id: 173, name: 'Smart Phone / Pager' }] },
    { categories: [{ id: 9, name: 'Laptop' }] },
  ];

  it('translates the names and keeps the canonical one', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([
        { category_id: '173', translated_name: 'Smartphone / Pager' },
      ]);

    const [phone, laptop] = await localizeCategories(holders(), 'fr', query);

    expect(phone.categories).toEqual([
      {
        id: 173,
        name: 'Smartphone / Pager',
        canonicalName: 'Smart Phone / Pager',
      },
    ]);
    // No translation: the canonical name is the label.
    expect(laptop.categories).toEqual([
      { id: 9, name: 'Laptop', canonicalName: 'Laptop' },
    ]);
    expect(query.mock.calls[0][1]).toEqual([[173, 9], 'fr']);
  });

  it('reads no translation in English', async () => {
    const query = jest.fn();
    const [phone] = await localizeCategories(holders(), 'en', query);
    expect(phone.categories[0].canonicalName).toBe('Smart Phone / Pager');
    expect(query).not.toHaveBeenCalled();
  });
});
