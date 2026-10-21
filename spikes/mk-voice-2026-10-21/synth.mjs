import ort from 'onnxruntime-node';
import fs from 'fs';
const [model, phon, prefix, sid] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(model + '.json'));
const s = await ort.InferenceSession.create(model);
const items = JSON.parse(fs.readFileSync(phon));
let n = 0;
for (const it of items) {
  const ids = BigInt64Array.from(it.ids.map(BigInt));
  const feeds = { input: new ort.Tensor('int64', ids, [1, ids.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale, cfg.inference.noise_w]), [3]) };
  if (sid !== undefined && s.inputNames.includes('sid')) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(sid)]), [1]);
  const out = await s.run(feeds);
  const a = out[s.outputNames[0]].data;
  const sr = cfg.audio.sample_rate, buf = Buffer.alloc(44 + a.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + a.length * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(a.length * 2, 40);
  let peak = 0; for (const x of a) peak = Math.max(peak, Math.abs(x));
  a.forEach((x, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x / Math.max(peak, 0.01))) * 30000), 44 + i * 2));
  fs.writeFileSync(`${prefix}-${++n}.wav`, buf);
}
console.log('wrote', n);
