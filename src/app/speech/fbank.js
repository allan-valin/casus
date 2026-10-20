// Copied from speech-to-ipa (github.com/allan-valin/speech-to-ipa, web/app/fbank.js) for the pronunciation trainer; POWSM uses computeLogmel.
// Kaldi-style log-mel filterbank, a port of lhotse's Fbank (ZIPA's front end):
// reflect-padded 25 ms frames every 10 ms, DC removal, pre-emphasis, Povey window,
// 512-point power spectrum, 80 mel filters, natural log. The window and filters
// come from fbank80.json, dumped from lhotse itself (eval/export_fbank.py).

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

export function computeFbank(wav, cfg) {
  const { length, shift, fft: nfft, preemph, eps, window, filters } = cfg;
  const n = wav.length;
  const frames = Math.floor((n + Math.floor(shift / 2)) / shift);
  const padLeft = Math.floor((length - shift) / 2);
  // sample i of the reflect-padded signal (torch.flip of the edge samples)
  const at = i => (i < 0 ? wav[-i - 1] : i >= n ? wav[2 * n - i - 1] : wav[i]);
  const out = new Float32Array(frames * filters.length);
  const re = new Float64Array(nfft), im = new Float64Array(nfft), frame = new Float64Array(length);
  for (let t = 0; t < frames; t++) {
    const start = t * shift - padLeft;
    let mean = 0;
    for (let i = 0; i < length; i++) { frame[i] = at(start + i); mean += frame[i]; }
    mean /= length;
    for (let i = 0; i < length; i++) frame[i] -= mean;
    re.fill(0); im.fill(0);
    for (let i = length - 1; i >= 0; i--) re[i] = (frame[i] - preemph * frame[i > 0 ? i - 1 : 0]) * window[i];
    fft(re, im);
    for (let k = 0; k < filters.length; k++) {
      const { start: s, weights } = filters[k];
      let e = 0;
      for (let j = 0; j < weights.length; j++) e += (re[s + j] ** 2 + im[s + j] ** 2) * weights[j];
      out[t * filters.length + k] = Math.log(Math.max(e, eps));
    }
  }
  return { data: out, frames };
}

// ESPnet's default front end (POWSM): centred STFT (reflect padding, Hann window
// centred in the 512-point frame, hop 160), power spectrum, 80 mel filters, natural
// log of max(·, 1e-10), then global mean/variance normalisation. Constants come from
// powsm_frontend.json, dumped from the model (eval/export_powsm_onnx.py).
export function computeLogmel(wav, cfg) {
  const { fft: nfft, shift, window, filters, mean, std, normMeans, normVars } = cfg;
  const n = wav.length, half = nfft / 2;
  const frames = 1 + Math.floor(n / shift);
  const at = i => (i < 0 ? wav[-i] : i >= n ? wav[2 * (n - 1) - i] : wav[i]);   // torch "reflect"
  const out = new Float32Array(frames * filters.length);
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (let t = 0; t < frames; t++) {
    const start = t * shift - half;
    for (let i = 0; i < nfft; i++) { re[i] = at(start + i) * window[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < filters.length; k++) {
      const { start: s, weights } = filters[k];
      let e = 0;
      for (let j = 0; j < weights.length; j++) e += (re[s + j] ** 2 + im[s + j] ** 2) * weights[j];
      let x = Math.log(Math.max(e, 1e-10));
      if (normMeans) x -= mean[k];
      if (normVars) x /= std[k];
      out[t * filters.length + k] = x;
    }
  }
  return { data: out, frames };
}
