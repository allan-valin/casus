/* Text-file upload (Allan, 2026-10-18): a .txt or .md file read in the page as if pasted.
 * UTF-8; a byte-order mark is dropped and line endings become \n. A file with NUL bytes is
 * not text and is refused, so a wrong pick says so instead of filling the page with noise. */
function asText(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {           // older engines (and jsdom) only have FileReader
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'utf-8');
  });
}

export async function readTextFile(file) {
  const text = await asText(file);
  if (text.includes('\u0000')) throw new Error(`${file.name} is not a text file`);
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}
