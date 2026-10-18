import { describe, it, expect } from 'vitest';
import { readTextFile } from '../../src/app/lib/upload.js';

describe('readTextFile', () => {
  it('reads UTF-8, strips a byte-order mark and normalises line endings', async () => {
    expect(await readTextFile(new File(['﻿Rosa.\r\nBona.\rUrbs.'], 'a.txt'))).toBe('Rosa.\nBona.\nUrbs.');
  });
  it('keeps Greek and macrons intact', async () => {
    expect(await readTextFile(new File(['ἐν ἀρχῇ ἦν ὁ λόγος. Rōma.'], 'b.md'))).toBe('ἐν ἀρχῇ ἦν ὁ λόγος. Rōma.');
  });
  it('rejects a file that is not text', async () => {
    await expect(readTextFile(new File([new Uint8Array([0, 1, 2, 0, 255])], 'x.bin'))).rejects.toThrow(/not a text file/);
  });
});
