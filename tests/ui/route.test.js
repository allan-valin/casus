import { describe, it, expect } from 'vitest';
import { langFromPath, drillsPath } from '../../src/app/lib/route.js';

const two = [{ code: 'la', path: '/' }, { code: 'grc', path: '/grc/' }];

describe('langFromPath', () => {
  it('the root is Latin, the reader view', () => {
    expect(langFromPath('/', '/')).toEqual({ code: 'la', view: 'reader' });
    expect(langFromPath('/casus/', '/casus/')).toEqual({ code: 'la', view: 'reader' });
  });
  it('a language segment under the base selects it, and /game/ the drill', () => {
    expect(langFromPath('/casus/grc/', '/casus/', two)).toEqual({ code: 'grc', view: 'reader' });
    // the letters drill became the drills page (Allan, 2026-10-18); old /game/ links land there
    expect(langFromPath('/casus/grc/game/', '/casus/', two)).toEqual({ code: 'grc', view: 'drills' });
    expect(langFromPath('/casus/grc/drills/', '/casus/', two)).toEqual({ code: 'grc', view: 'drills' });
    expect(langFromPath('/casus/drills/', '/casus/', two)).toEqual({ code: 'la', view: 'drills' });
    expect(langFromPath('/grc', '/', two)).toEqual({ code: 'grc', view: 'reader' });
  });
  it('an unknown segment falls back to Latin', () => {
    expect(langFromPath('/casus/nope/', '/casus/', two)).toEqual({ code: 'la', view: 'reader' });
  });
});

describe('drillsPath', () => {
  it('each language\u2019s drills live under its own path, Latin at /drills/', () => {
    expect(drillsPath({ code: 'la', path: '/' })).toBe('/drills/');
    expect(drillsPath({ code: 'grc', path: '/grc/' })).toBe('/grc/drills/');
  });
});
