import { describe, it, expect } from 'vitest';
import { issueUrl } from '../../src/app/lib/report.js';

describe('report a problem (Allan, 2026-10-20): a new GitHub issue with the page filled in', () => {
  it('opens a new issue on the casus repository with the page, language and view in title and body', () => {
    const u = new URL(issueUrl({ href: 'https://allan-valin.github.io/casus/ru/learn/', site: 'Casus', language: 'Russian', view: 'learn', ui: 'pt' }));
    expect(u.origin + u.pathname).toBe('https://github.com/allan-valin/casus/issues/new');
    expect(u.searchParams.get('title')).toContain('Russian');
    expect(u.searchParams.get('title')).toContain('learn');
    const body = u.searchParams.get('body');
    expect(body).toContain('https://allan-valin.github.io/casus/ru/learn/');
    expect(body).toContain('Interface: pt');
  });
});
