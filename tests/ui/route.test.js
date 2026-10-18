import { describe, it, expect } from 'vitest';
import { langFromPath } from '../../src/app/lib/route.js';

const two = [{ code: 'la', path: '/' }, { code: 'grc', path: '/grc/' }];

describe('langFromPath', () => {
  it('the root is Latin, the reader view', () => {
    expect(langFromPath('/', '/')).toEqual({ code: 'la', view: 'reader' });
    expect(langFromPath('/casus/', '/casus/')).toEqual({ code: 'la', view: 'reader' });
  });
  it('a language segment under the base selects it, and /game/ the drill', () => {
    expect(langFromPath('/casus/grc/', '/casus/', two)).toEqual({ code: 'grc', view: 'reader' });
    expect(langFromPath('/casus/grc/game/', '/casus/', two)).toEqual({ code: 'grc', view: 'game' });
    expect(langFromPath('/grc', '/', two)).toEqual({ code: 'grc', view: 'reader' });
  });
  it('an unknown segment falls back to Latin', () => {
    expect(langFromPath('/casus/nope/', '/casus/', two)).toEqual({ code: 'la', view: 'reader' });
  });
});
