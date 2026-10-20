/* "Report a problem" (Allan, 2026-10-20): a button on every page opens a new issue on the GitHub repository, with the
 * page, its language and view already written in, and a short template for what happened. */
export const REPO = 'https://github.com/allan-valin/casus';

export function issueUrl({ href, site, language, view, ui }) {
  const title = `[${site} · ${language} · ${view}] `;
  const body = [`Page: ${href}`, `Interface: ${ui}`, '', 'What happened:', '', 'What I expected:', '', '(A screenshot helps.)'].join('\n');
  return `${REPO}/issues/new?${new URLSearchParams({ title, body })}`;
}
