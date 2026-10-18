import { describe, it, expect } from 'vitest';
import { withBase } from '../../src/app/lib/paths.js';

describe('withBase', () => {
  it('leaves an absolute path alone when the site is served at the root', () => {
    expect(withBase('/data', '/')).toBe('/data');
    expect(withBase('/samples/index.json', '/')).toBe('/samples/index.json');
  });

  it('prefixes the Pages sub-path without a double slash', () => {
    expect(withBase('/data', '/casus/')).toBe('/casus/data');
    expect(withBase('/samples/x.txt', '/casus')).toBe('/casus/samples/x.txt');
  });

  it("defaults to Vite's BASE_URL", () => {
    expect(withBase('/data')).toBe('/data');
  });
});
