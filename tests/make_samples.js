#!/usr/bin/env node
// Generates the samples/ WAV pair — the same Karplus–Strong phrases the
// in-app demo synthesizes, rendered to 16-bit PCM WAV so drag-and-drop of
// real files can be exercised. Deterministic: same seeds as the app.
// Usage: node tests/make_samples.js
"use strict";
const fs = require("fs"), path = require("path");

// ---- ports of the app's demo synth (c7, verbatim math) ----
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2147483648 - 1; };
}
function karplusNote(rate, f0, dur, damping, lpExc, rand) {
  const N = Math.max(2, Math.round(rate / f0));
  const d = new Float64Array(N);
  let y = 0;
  for (let i = 0; i < N; i++) {
    let v = rand();
    if (lpExc) { y += 0.35 * (v - y); v = y; }
    d[i] = v;
  }
  const n = Math.round(dur * rate);
  const out = new Float64Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const v = d[k];
    out[i] = v;
    d[k] = damping * 0.5 * (v + d[(k + 1) % N]);
    k = (k + 1) % N;
  }
  // cosine fade over the final 60 ms — a truncated ring is a click/false onset
  const nf = Math.min(n, Math.round(0.06 * rate));
  for (let i = 0; i < nf; i++) out[n - nf + i] *= 0.5 * (1 + Math.cos(Math.PI * i / nf));
  return out;
}
function makeDemoSamples(rate, damping, lpExc, seed, gain) {
  const notes = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
  const durs = [0.55, 0.55, 0.55, 0.55, 0.55, 2.3];
  const ring = 0.35, lead = 0.12; // lead-in silence so the first onset is detectable
  let t = lead; const starts = [];
  for (let i = 0; i < notes.length; i++) { starts.push(t); t += durs[i]; }
  const total = Math.round((t + ring) * rate);
  const out = new Float64Array(total);
  const rand = lcg(seed);
  for (let i = 0; i < notes.length; i++) {
    const nt = karplusNote(rate, notes[i], durs[i] + ring, damping, lpExc, rand);
    const off = Math.round(starts[i] * rate);
    for (let j = 0; j < nt.length && off + j < total; j++) out[off + j] += nt[j];
  }
  let peak = 0;
  for (let i = 0; i < total; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
  const g = peak > 0 ? gain / peak : 1;
  for (let i = 0; i < total; i++) out[i] *= g;
  return out;
}

// ---- 16-bit PCM mono WAV writer ----
function writeWav(file, samples, rate) {
  const n = samples.length, dataBytes = n * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataBytes, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);   // byte rate
  buf.writeUInt16LE(2, 32);          // block align
  buf.writeUInt16LE(16, 34);         // bits
  buf.write("data", 36); buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
  return buf;
}

const outDir = path.join(__dirname, "..", "samples");
fs.mkdirSync(outDir, { recursive: true });
const specs = [
  { file: "demo-bright-44k.wav", rate: 44100, damping: 0.9962, lp: false, seed: 42424243, gain: 0.8 },
  { file: "demo-warm-48k.wav",   rate: 48000, damping: 0.9900, lp: true,  seed: 20260820, gain: 0.55 },
];
for (const sp of specs) {
  const s = makeDemoSamples(sp.rate, sp.damping, sp.lp, sp.seed, sp.gain);
  const buf = writeWav(path.join(outDir, sp.file), s, sp.rate);
  console.log(`${sp.file}: ${(s.length / sp.rate).toFixed(2)} s @ ${sp.rate} Hz, ${buf.length} bytes`);
}

// sanity: the app's own sniffer must read these files' rates back
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const dsp = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const modFile = path.join(require("os").tmpdir(), "guitarscope_dsp_sniff_check.js");
fs.writeFileSync(modFile, dsp + "\nmodule.exports={sniffAudioInfo};\n");
const { sniffAudioInfo } = require(modFile);
for (const sp of specs) {
  const b = fs.readFileSync(path.join(outDir, sp.file));
  const info = sniffAudioInfo(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const okRate = info && info.sampleRate === sp.rate && info.container === "WAV";
  console.log(`  sniff ${sp.file}: ${okRate ? "ok" : "FAIL"} → ${JSON.stringify(info)}`);
  if (!okRate) process.exit(1);
}
console.log("samples ready");
