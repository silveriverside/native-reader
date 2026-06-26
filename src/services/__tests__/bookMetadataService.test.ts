import {
  isValidISBN13,
  lookupBookMetadataByISBN,
  lookupGoogleBooksByISBN,
  lookupOpenLibraryByISBN,
  normalizeISBN,
} from '@/services/bookMetadataService';

describe('bookMetadataService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function mockFetchJson(data: unknown, ok = true, status = 200) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok,
      status,
      json: async () => data,
    });
  }

  it('normalizes ISBN input', () => {
    expect(normalizeISBN('978-0-14-032872-1')).toBe('9780140328721');
    expect(normalizeISBN(' ISBN 978 7 115 54608 0 ')).toBe('9787115546080');
  });

  it('validates ISBN-13 check digit', () => {
    expect(isValidISBN13('9780140328721')).toBe(true);
    expect(isValidISBN13('9780140328720')).toBe(false);
    expect(isValidISBN13('0140328721')).toBe(false);
  });

  it('normalizes Open Library metadata', async () => {
    mockFetchJson({
      'ISBN:9780140328721': {
        title: 'Matilda',
        authors: [{ name: 'Roald Dahl' }],
        publishers: [{ name: 'Puffin' }],
        publish_date: '1988',
        number_of_pages: '240',
        cover: { medium: 'https://covers.openlibrary.org/b/id/1-M.jpg' },
        subjects: [{ name: 'Children' }],
      },
    });

    const result = await lookupOpenLibraryByISBN('978-0-14-032872-1');

    expect(result).toMatchObject({
      isbn: '9780140328721',
      title: 'Matilda',
      authors: ['Roald Dahl'],
      publisher: 'Puffin',
      publishedDate: '1988',
      totalPages: 240,
      coverUri: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      categories: ['Children'],
      source: 'open_library',
    });
  });

  it('returns null when Open Library has no matching ISBN', async () => {
    mockFetchJson({});

    await expect(lookupOpenLibraryByISBN('9780140328721')).resolves.toBeNull();
  });

  it('normalizes Google Books metadata', async () => {
    mockFetchJson({
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: 'Python Crash Course',
            authors: ['Eric Matthes'],
            publisher: 'No Starch Press',
            publishedDate: '2019',
            description: 'A hands-on introduction.',
            pageCount: 544,
            language: 'en',
            categories: ['Computers'],
            imageLinks: { thumbnail: 'https://books.google.com/cover.jpg' },
          },
        },
      ],
    });

    const result = await lookupGoogleBooksByISBN('9781593279288');

    expect(result).toMatchObject({
      isbn: '9781593279288',
      title: 'Python Crash Course',
      authors: ['Eric Matthes'],
      publisher: 'No Starch Press',
      publishedDate: '2019',
      description: 'A hands-on introduction.',
      totalPages: 544,
      language: 'en',
      categories: ['Computers'],
      coverUri: 'https://books.google.com/cover.jpg',
      source: 'google_books',
    });
  });

  it('falls back to Google Books when Open Library misses', async () => {
    mockFetchJson({});
    mockFetchJson({
      totalItems: 1,
      items: [{ volumeInfo: { title: 'Fallback Book', pageCount: 123 } }],
    });

    const result = await lookupBookMetadataByISBN('9781593279288');

    expect(result).toMatchObject({
      isbn: '9781593279288',
      title: 'Fallback Book',
      totalPages: 123,
      source: 'google_books',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid ISBN before network lookup', async () => {
    await expect(lookupOpenLibraryByISBN('9780140328720')).rejects.toThrow('无效的 ISBN-13');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
