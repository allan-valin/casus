#!/usr/bin/env node
/* Speaks Macedonian through the Bulgarian Piper voice with src/lang/mk/phonemes.js — the same path the browser takes —
 * into WAV files, to compare by ear. node tools/talk_audio/say_mk.mjs out-prefix "Добар ден." "…" [--pitch 1.25] */
import ort from 'onnxruntime-node';
import fs from 'node:fs';
import os from 'node:os';
import { phonemeIds, mkPhonemes } from '../../src/lang/mk/phonemes.js';

const args = process.argv.slice(2);
const pi = args.indexOf('--pitch');
const pitch = pi >= 0 ? Number(args.splice(pi, 2)[1]) : 1;
const [prefix, ...texts] = args;
const model = `${os.homedir()}/.local/share/casus/piper/bg_BG-dimitar-medium.onnx`;
const cfg = JSON.parse(fs.readFileSync(`${model}.json`, 'utf8'));
const s = await ort.InferenceSession.create(model);
for (const [n, text] of texts.entries()) {
  const ids = BigInt64Array.from(phonemeIds(text, cfg.phoneme_id_map).map(BigInt));
  const out = await s.run({ input: new ort.Tensor('int64', ids, [1, ids.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale, cfg.inference.noise_w]), [3]) });
  const a = out[s.outputNames[0]].data;
  const sr = Math.round(cfg.audio.sample_rate * pitch);          // played faster = higher, as the browser does
  const buf = Buffer.alloc(44 + a.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + a.length * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(a.length * 2, 40);
  a.forEach((x, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 30000), 44 + i * 2));
  fs.writeFileSync(`${prefix}-${n + 1}.wav`, buf);
  console.log(`${prefix}-${n + 1}.wav  ${mkPhonemes(text)}`);
}
