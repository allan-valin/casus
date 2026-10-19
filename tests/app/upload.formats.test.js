// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { readTextFile } from '../../src/app/lib/upload.js';

const fileOf = (name, data) => ({ name, arrayBuffer: async () => (data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : new TextEncoder().encode(data).buffer), text: async () => (typeof data === 'string' ? data : new TextDecoder().decode(data)) });
async function zip(files) { const z = new JSZip(); for (const [n, c] of Object.entries(files)) z.file(n, c); return z.generateAsync({ type: 'uint8array' }); }

describe('documents read as text (Allan, 2026-10-19: Word and PDF are what people upload)', () => {
  it('Word .docx: paragraphs in order', async () => {
    const doc = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Byl pozdní </w:t></w:r><w:r><w:t>večer.</w:t></w:r></w:p><w:p><w:r><w:t>První máj.</w:t></w:r></w:p></w:body></w:document>';
    expect(await readTextFile(fileOf('a.docx', await zip({ 'word/document.xml': doc })))).toBe('Byl pozdní večer.\nPrvní máj.');
  });
  it('OpenDocument .odt', async () => {
    const xml = '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:h>Título</text:h><text:p>Minha terra tem palmeiras.</text:p></office:text></office:body></office:document-content>';
    expect(await readTextFile(fileOf('a.odt', await zip({ 'content.xml': xml })))).toBe('Título\nMinha terra tem palmeiras.');
  });
  it('EPUB: the chapters in reading order', async () => {
    const files = {
      'META-INF/container.xml': '<container><rootfiles><rootfile full-path="OEBPS/c.opf"/></rootfiles></container>',
      'OEBPS/c.opf': '<package><manifest><item id="b" href="two.xhtml"/><item id="a" href="one.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
      'OEBPS/one.xhtml': '<html><body><p>Erste Seite.</p></body></html>', 'OEBPS/two.xhtml': '<html><body><p>Zweite Seite.</p></body></html>',
    };
    expect(await readTextFile(fileOf('b.epub', await zip(files)))).toBe('Erste Seite.\nZweite Seite.');
  });
  it('HTML: the text, without scripts', async () => {
    expect(await readTextFile(fileOf('p.html', '<html><head><script>x()</script></head><body><h1>Titel</h1><p>Ein <b>kurzer</b> Satz.</p></body></html>'))).toBe('Titel\nEin kurzer Satz.');
  });
  it('subtitles: no numbers or timings', async () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nHola amigo.\n\n2\n00:00:03,000 --> 00:00:04,000\n<i>Adiós.</i>\n';
    expect(await readTextFile(fileOf('s.srt', srt))).toBe('Hola amigo.\nAdiós.');
  });
  it('PDF: the text of every page', async () => {
    const pdf = (await import('node:fs')).readFileSync(`${process.cwd()}/tests/fixtures/hello.pdf`);
    const text = await readTextFile(fileOf('h.pdf', new Uint8Array(pdf)), { loadPdf: () => import('pdfjs-dist/legacy/build/pdf.mjs') });
    expect(text.replace(/\s+/g, ' ').trim()).toBe('Hello Casus');
  });
  it('anything else is refused with what is accepted', async () => {
    await expect(readTextFile(fileOf('x.doc', 'binary'))).rejects.toThrow(/\.docx/);
    await expect(readTextFile(fileOf('x.png', 'binary'))).rejects.toThrow(/PDF/);
  });
});
