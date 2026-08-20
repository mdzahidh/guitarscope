#!/usr/bin/env node
// GuitarScope DSP unit tests — runs the pure-DSP <script> block from
// index.html under Node and checks the numbers against ground truth.
// Usage: node tests/dsp.test.js
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

// ---- extract the DSP block (block 0) from index.html ----
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!blocks.length) { console.error("no <script> blocks found"); process.exit(1); }
const dspSrc = blocks[0];
if (!/function\s+sniffAudioInfo/.test(dspSrc)) {
  console.error("block 0 does not look like the DSP block"); process.exit(1);
}
const modFile = path.join(os.tmpdir(), "guitarscope_dsp_under_test.js");
fs.writeFileSync(modFile, dspSrc + `
module.exports = { welch, powerToDb, smoothOct, bandPower, spectralCentroid,
  spectralTilt, detectPeaks, makeLogGrid, resampleToGrid, noteInfo, midiToFreq,
  TUNINGS, tuningMidi, autocorrF0, sniffAudioInfo, dynamicsMetrics, attackTimes,
  spectrogramLog, decimateEnvelope, magmaColor, MAGMA,
  eqPeakingDb, eqLowShelfDb, eqHighShelfDb, eqShapeDb, EQ_DEVICES, EQ_DEVICE_BY_ID,
  lsqSolve, fitGraphicEq, fitParametricEq, eqSettingsResponseDb,
  sgramDifference, divergeColor };
`);
const D = require(modFile);

// ---- tiny harness ----
let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log("  ok  " + name); }
  else { fail++; console.log("  FAIL " + name + (detail != null ? "  → " + detail : "")); }
}
function approx(a, b, tol) { return Math.abs(a - b) <= tol; }

(async () => {

  // ---- welch: full-scale sine at a bin center reads ~0 dB FS ----
  {
    const rate = 48000, N = 8192, df = rate / N;
    const f = 100 * df; // exactly on bin 100
    const n = rate * 2;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * f * i / rate);
    const w = await D.welch(x, rate, N, N / 2);
    ok(approx(w.df, df, 1e-9), "welch df = rate/N", w.df);
    let mi = 0;
    for (let k = 1; k < w.power.length; k++) if (w.power[k] > w.power[mi]) mi = k;
    ok(mi === 100, "welch peak lands on the sine's bin", "bin " + mi);
    const peakDb = D.powerToDb(w.power[mi]);
    ok(approx(peakDb, 0, 0.5), "full-scale sine ≈ 0 dB FS", peakDb.toFixed(3) + " dB");
    // off-bin sine: with peak (amplitude) normalization, the summed power over
    // the lobe exceeds the peak by the Hann ENBW, 10·log10(1.5) ≈ +1.76 dB,
    // and the worst-case scalloping loss of the max bin is ≈ −1.42 dB.
    const f2 = 100.5 * df;
    for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * f2 * i / rate);
    const w2 = await D.welch(x, rate, N, N / 2);
    let s = 0, mx = -Infinity;
    for (let k = 95; k <= 106; k++) { s += w2.power[k]; mx = Math.max(mx, w2.power[k]); }
    ok(approx(D.powerToDb(s), 1.76, 0.15), "off-bin lobe sum = Hann ENBW (+1.76 dB)",
      D.powerToDb(s).toFixed(3) + " dB");
    ok(approx(D.powerToDb(mx), -1.42, 0.25), "half-bin scalloping loss ≈ −1.42 dB",
      D.powerToDb(mx).toFixed(3) + " dB");
  }

  // ---- smoothOct: a constant spectrum stays constant ----
  {
    const n = 4097, df = 48000 / 8192;
    const p = new Float64Array(n).fill(1e-3);
    const sm = D.smoothOct(p, df, 6);
    let worst = 0;
    for (let k = Math.round(60 / df); k < Math.round(20000 / df); k++)
      worst = Math.max(worst, Math.abs(sm[k] - 1e-3) / 1e-3);
    ok(worst < 0.02, "1/6-oct smoothing preserves a flat spectrum",
      (worst * 100).toFixed(2) + " % worst deviation");
    ok(D.smoothOct(p, df, 0) === p || D.smoothOct(p, df, 0)[100] === p[100],
      "smoothing off returns the spectrum unchanged");
  }

  // ---- bandPower: flat spectrum → power proportional to bandwidth ----
  {
    const df = 48000 / 8192;
    const p = new Float64Array(4097).fill(2e-4);
    const a = D.bandPower(p, df, 100, 200), b = D.bandPower(p, df, 100, 400);
    ok(approx(b / a, 3, 0.1), "bandPower scales with bandwidth on flat spectrum",
      (b / a).toFixed(3));
  }

  // ---- spectralCentroid: single spectral line sits at its own frequency ----
  {
    const df = 48000 / 8192;
    const p = new Float64Array(4097);
    p[Math.round(1000 / df)] = 1;
    const c = D.spectralCentroid(p, df, 60, 20000);
    ok(approx(c, Math.round(1000 / df) * df, df), "centroid of a single line = its frequency",
      c.toFixed(2) + " Hz");
  }

  // ---- spectralTilt: power ∝ 1/f² → ≈ −6.02 dB/oct ----
  {
    const df = 48000 / 8192;
    const p = new Float64Array(4097);
    for (let k = 1; k < p.length; k++) { const f = k * df; p[k] = 1 / (f * f); }
    const t = D.spectralTilt(p, df);
    ok(approx(t, -6.02, 0.35), "tilt of 1/f² spectrum ≈ −6.02 dB/oct", t.toFixed(3));
  }

  // ---- notes & tunings ----
  {
    const a4 = D.noteInfo(440, 440);
    ok(a4.name === "A4" && Math.abs(a4.cents) < 0.01, "noteInfo(440) → A4, 0 ¢",
      JSON.stringify(a4));
    const e2 = D.noteInfo(82.407, 440);
    ok(e2.name === "E2" && Math.abs(e2.cents) < 1, "noteInfo(82.407) → E2", JSON.stringify(e2));
    ok(approx(D.midiToFreq(69, 440), 440, 1e-9), "midiToFreq(69) = A4");
    ok(approx(D.midiToFreq(69, 432), 432, 1e-9), "midiToFreq respects A4 reference");
    const estd = D.tuningMidi("estd", 0);
    ok(estd.join(",") === "40,45,50,55,59,64", "E standard MIDI numbers", estd.join(","));
    const drop = D.tuningMidi("dropd", 0);
    ok(drop[0] === 38 && drop[5] === 64, "Drop D lowers only the 6th string", drop.join(","));
    const custom = D.tuningMidi("custom", -2);
    ok(custom[0] === 38 && custom[5] === 62, "custom = E std + offset", custom.join(","));
  }

  // ---- detectPeaks: one clear bump in a flat floor ----
  {
    const df = 48000 / 8192;
    const n = 4097, db = new Float64Array(n).fill(-60);
    const kc = Math.round(440 / df);
    for (let k = -6; k <= 6; k++) db[kc + k] = -60 + 35 * Math.exp(-k * k / 6);
    const peaks = D.detectPeaks(db, df, { fmin: 60, fmax: 20000, minProm: 6, maxCount: 6 });
    ok(peaks.length === 1, "exactly one peak found", peaks.length);
    ok(peaks.length && approx(peaks[0].f, kc * df, df), "peak frequency correct",
      peaks.length ? peaks[0].f.toFixed(2) : "-");
    ok(peaks.length && peaks[0].prom > 20, "peak prominence reported",
      peaks.length ? peaks[0].prom.toFixed(1) : "-");
  }

  // ---- autocorrF0 on a synthetic plucked-ish tone ----
  {
    const rate = 44100, f0 = 220, n = rate;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      x[i] = 0.8 * Math.sin(2 * Math.PI * f0 * t) + 0.3 * Math.sin(2 * Math.PI * 2 * f0 * t)
           + 0.15 * Math.sin(2 * Math.PI * 3 * f0 * t);
    }
    const r = D.autocorrF0(x, rate, 0, 8192);
    ok(!!r, "autocorrF0 returns a result");
    ok(r && approx(r.f0, 220, 1.0), "f0 ≈ 220 Hz", r ? r.f0.toFixed(2) : "-");
    ok(r && r.conf > 0.8, "high confidence on a clean tone", r ? r.conf.toFixed(3) : "-");
    const noise = new Float64Array(8192);
    let seed = 12345;
    for (let i = 0; i < noise.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      noise[i] = seed / 2147483648 - 1;
    }
    ok(D.autocorrF0(noise, rate, 0, 8192) === null, "white noise → no pitch (null)");
  }

  // ---- resampleToGrid / makeLogGrid ----
  {
    const g = D.makeLogGrid(700, 60, 20000);
    ok(g.length === 700 && approx(g[0], 60, 1e-6) && approx(g[699], 20000, 1e-3),
      "log grid endpoints", g[0] + " … " + g[699]);
    const df = 48000 / 8192;
    const db = new Float64Array(4097).fill(-40);
    const r = D.resampleToGrid(db, df, g);
    ok(approx(r[350], -40, 0.01), "resampling a flat curve stays flat", r[350]);
  }

  // ---- container sniffers on handcrafted byte fixtures ----
  {
    // WAV: 48 kHz, stereo, 24-bit PCM
    const wav = new Uint8Array(44);
    const dv = new DataView(wav.buffer);
    wav.set([82,73,70,70], 0); dv.setUint32(4, 36, true); wav.set([87,65,86,69], 8);
    wav.set([102,109,116,32], 12); dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, 48000, true); dv.setUint32(28, 48000*6, true);
    dv.setUint16(32, 6, true); dv.setUint16(34, 24, true);
    const wr = D.sniffAudioInfo(wav.buffer);
    ok(wr && wr.container === "WAV" && wr.sampleRate === 48000 && wr.channels === 2
      && wr.bitDepth === "24-bit", "WAV sniff: 48 kHz / stereo / 24-bit", JSON.stringify(wr));

    // WAV float: fmt=3, 32-bit
    dv.setUint16(20, 3, true); dv.setUint16(34, 32, true);
    const wf = D.sniffAudioInfo(wav.buffer);
    ok(wf && wf.bitDepth === "32-bit float", "WAV sniff: float format flagged", JSON.stringify(wf));

    // AIFF: 44.1 kHz, mono, 16-bit (80-bit extended rate)
    const aiff = new Uint8Array(12 + 8 + 18);
    const adv = new DataView(aiff.buffer);
    aiff.set([70,79,82,77], 0); adv.setUint32(4, 30, false); aiff.set([65,73,70,70], 8);
    aiff.set([67,79,77,77], 12); adv.setUint32(16, 18, false);
    adv.setUint16(20, 1, false);           // channels
    adv.setUint32(22, 441000, false);      // frames
    adv.setUint16(26, 16, false);          // bits
    aiff.set([0x40,0x0E,0xAC,0x44,0,0,0,0,0,0], 28); // 44100 as 80-bit extended
    const ar = D.sniffAudioInfo(aiff.buffer);
    ok(ar && ar.container === "AIFF" && ar.sampleRate === 44100 && ar.channels === 1
      && ar.bitDepth === "16-bit", "AIFF sniff: 44.1 kHz / mono / 16-bit", JSON.stringify(ar));

    // FLAC: 96 kHz, stereo, 24-bit STREAMINFO
    const flac = new Uint8Array(4 + 4 + 34);
    flac.set([0x66,0x4C,0x61,0x43], 0);    // fLaC
    flac[4] = 0x80; flac[5] = 0; flac[6] = 0; flac[7] = 34; // last block, type 0, size 34
    flac[18] = 0x17; flac[19] = 0x70; flac[20] = 0x03; flac[21] = 0x70; // 96000 / 2ch / 24-bit
    const fr = D.sniffAudioInfo(flac.buffer);
    ok(fr && fr.container === "FLAC" && fr.sampleRate === 96000 && fr.channels === 2
      && fr.bitDepth === "24-bit", "FLAC sniff: 96 kHz / stereo / 24-bit", JSON.stringify(fr));

    // MP3: ID3v2 header then an MPEG1 Layer III frame @ 44.1 kHz joint stereo
    const mp3 = new Uint8Array(10 + 4);
    mp3.set([0x49,0x44,0x33, 3,0, 0, 0,0,0,0], 0);   // ID3v2.3, size 0
    mp3.set([0xFF,0xFB,0x90,0x40], 10);
    const mr = D.sniffAudioInfo(mp3.buffer);
    ok(mr && mr.container === "MP3" && mr.sampleRate === 44100 && mr.channels === 2,
      "MP3 sniff: 44.1 kHz through ID3 tag", JSON.stringify(mr));

    // MP3 mono @ 22.05 kHz (MPEG2), bare frame with payload
    const mp3b = new Uint8Array(32);
    mp3b.set([0xFF,0xF3,0x90,0xC0], 0);
    const mb = D.sniffAudioInfo(mp3b.buffer);
    ok(mb && mb.sampleRate === 22050 && mb.channels === 1,
      "MP3 sniff: MPEG2 mono 22.05 kHz", JSON.stringify(mb));

    // M4A: ftyp + moov>trak>mdia>minf>stbl>stsd(mp4a @ 44.1 kHz stereo)
    const entry = 36, stsd = 8+4+4+entry, stbl = 8+stsd, minf = 8+stbl,
          mdia = 8+minf, trak = 8+mdia, moov = 8+trak;
    const m4a = new Uint8Array(16 + moov);
    const mdv = new DataView(m4a.buffer);
    const wrTag = (off, s) => { for (let i = 0; i < 4; i++) m4a[off+i] = s.charCodeAt(i); };
    mdv.setUint32(0, 16, false); wrTag(4, "ftyp"); wrTag(8, "M4A "); mdv.setUint32(12, 0, false);
    let o = 16;
    mdv.setUint32(o, moov, false); wrTag(o+4, "moov"); o += 8;
    mdv.setUint32(o, trak, false); wrTag(o+4, "trak"); o += 8;
    mdv.setUint32(o, mdia, false); wrTag(o+4, "mdia"); o += 8;
    mdv.setUint32(o, minf, false); wrTag(o+4, "minf"); o += 8;
    mdv.setUint32(o, stbl, false); wrTag(o+4, "stbl"); o += 8;
    mdv.setUint32(o, stsd, false); wrTag(o+4, "stsd"); o += 8;
    mdv.setUint32(o, 0, false); mdv.setUint32(o+4, 1, false); o += 8; // version/flags, entryCount
    mdv.setUint32(o, entry, false); wrTag(o+4, "mp4a");
    mdv.setUint16(o+24, 2, false);                 // channels
    mdv.setUint32(o+32, 44100 * 65536, false);     // 16.16 fixed sample rate
    const m4r = D.sniffAudioInfo(m4a.buffer);
    ok(m4r && m4r.container === "M4A" && m4r.sampleRate === 44100 && m4r.channels === 2,
      "M4A sniff: 44.1 kHz via stsd/mp4a", JSON.stringify(m4r));

    // Garbage refuses cleanly
    const junk = new Uint8Array(64).fill(0x11);
    ok(D.sniffAudioInfo(junk.buffer) === null, "unknown bytes → null (refuse, never guess)");
    ok(D.sniffAudioInfo(new Uint8Array(4).buffer) === null, "tiny buffer → null");
  }

  // ---- dynamicsMetrics: dr = spread among ACTIVE frames (>floor+8 dB) ----
  {
    const rate = 44100, n = rate * 4;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      // first second: near-silence (the floor); then 0.5 s blocks alternating
      // between −23 dB and −9 dB RMS → active-frame spread ≈ 14 dB
      const amp = t < 1 ? 0.001 : (Math.floor((t - 1) / 0.5) % 2 === 0 ? 0.1 : 0.5);
      x[i] = amp * Math.sin(2 * Math.PI * 220 * t);
    }
    const d = D.dynamicsMetrics(x, rate);
    ok(d.dr != null && d.dr > 10 && d.dr < 18, "dr sees the 14 dB spread in active material",
      d.dr != null ? d.dr.toFixed(1) + " dB" : "null");
    ok(d.snr != null && d.snr > 25, "snr = active P95 above the noise floor",
      d.snr != null ? d.snr.toFixed(1) + " dB" : "null");
    ok(!d.clipped, "clean signal is not flagged as clipped");
    const clip = new Float64Array(rate);
    for (let i = 0; i < clip.length; i++)
      clip[i] = Math.max(-1, Math.min(1, 1.4 * Math.sin(2 * Math.PI * 220 * i / rate)));
    ok(D.dynamicsMetrics(clip, rate).clipped, "hard-clipped sine is flagged");
  }

  // ---- attackTimes: rise measured relative to the pre-peak minimum ----
  {
    const envRate = 8000;
    // A previous note still rings at level 0.4 while the new note rises
    // 0.4→1.0 over 8 ms at t=0.5 s, then decays slowly. An absolute
    // 10%-of-peak threshold is never crossed here (the background sits at
    // 40%), which is exactly the bug that pinned attack at the 120 ms
    // window edge; the relative measure sees the true ~6 ms 10→90% rise.
    const env = new Float64Array(envRate);
    const t0 = Math.round(0.5 * envRate), rise = Math.round(0.008 * envRate);
    for (let i = 0; i < env.length; i++) {
      if (i < t0) env[i] = 0.4;
      else if (i < t0 + rise) env[i] = 0.4 + 0.6 * (i - t0) / rise;
      else env[i] = 1.0 * Math.exp(-(i - t0 - rise) / (0.4 * envRate));
    }
    const a = D.attackTimes(env, envRate, [0.5]);
    ok(a != null && a > 0.002 && a < 0.015,
      "attack over a ringing background = the ~6 ms relative rise",
      a != null ? (a * 1000).toFixed(1) + " ms" : "null");

    // clean attack from silence: 0→1 over 10 ms → 10–90% rise ≈ 8 ms
    const env2 = new Float64Array(envRate);
    const s0 = Math.round(0.5 * envRate), r2 = Math.round(0.010 * envRate);
    for (let i = 0; i < env2.length; i++) {
      if (i < s0) env2[i] = 0;
      else if (i < s0 + r2) env2[i] = (i - s0) / r2;
      else env2[i] = Math.exp(-(i - s0 - r2) / (0.4 * envRate));
    }
    const a2 = D.attackTimes(env2, envRate, [0.5]);
    ok(a2 != null && a2 > 0.004 && a2 < 0.014,
      "clean attack from silence ≈ 8 ms 10–90% rise",
      a2 != null ? (a2 * 1000).toFixed(1) + " ms" : "null");
  }

  // ---- spectrogramLog: same 0 dB FS sine reference as the LTAS ----
  {
    const rate = 44100, win = 2048, df = rate / win;
    const f = 46 * df; // exactly on bin 46 ≈ 990.5 Hz
    const n = rate * 2;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * f * i / rate);
    const sg = await D.spectrogramLog(x, rate);
    ok(sg.gridN === sg.grid.length && sg.nFrames * sg.gridN === sg.frames.length,
      "spectrogram dimensions consistent", `${sg.nFrames} × ${sg.gridN}`);
    // grid cell whose center is nearest the sine
    let ci = 0;
    for (let i = 1; i < sg.gridN; i++)
      if (Math.abs(Math.log(sg.grid[i] / f)) < Math.abs(Math.log(sg.grid[ci] / f))) ci = i;
    const mid = (sg.nFrames >> 1) * sg.gridN;
    const peakDb = D.powerToDb(sg.frames[mid + ci]);
    ok(approx(peakDb, 0, 0.5), "full-scale on-bin sine ≈ 0 dB in its cell",
      peakDb.toFixed(3) + " dB");
    // a cell an octave away holds only leakage, far below the tone
    let oi = 0;
    for (let i = 1; i < sg.gridN; i++)
      if (Math.abs(Math.log(sg.grid[i] / (2 * f))) < Math.abs(Math.log(sg.grid[oi] / (2 * f)))) oi = i;
    ok(D.powerToDb(sg.frames[mid + oi]) < -60, "an octave away is leakage only",
      D.powerToDb(sg.frames[mid + oi]).toFixed(1) + " dB");
  }

  // ---- spectrogramLog: temporal localization of a burst ----
  {
    const rate = 44100, win = 2048, df = rate / win, f = 46 * df;
    const n = rate * 2;
    const x = new Float64Array(n);
    for (let i = Math.round(1.0 * rate); i < Math.round(1.1 * rate); i++)
      x[i] = Math.sin(2 * Math.PI * f * i / rate);
    const sg = await D.spectrogramLog(x, rate);
    let ci = 0;
    for (let i = 1; i < sg.gridN; i++)
      if (Math.abs(Math.log(sg.grid[i] / f)) < Math.abs(Math.log(sg.grid[ci] / f))) ci = i;
    const fAt = t => sg.frames[Math.round(t * sg.frameRate) * sg.gridN + ci];
    ok(D.powerToDb(fAt(1.05)) > -3, "burst present at t=1.05 s",
      D.powerToDb(fAt(1.05)).toFixed(1) + " dB");
    ok(D.powerToDb(fAt(0.5)) < -100, "silence before the burst",
      D.powerToDb(fAt(0.5)).toFixed(1) + " dB");
  }

  // ---- spectrogramLog: cells above the file's Nyquist are NaN ----
  {
    const rate = 32000; // Nyquist 16 kHz < the 20 kHz grid top
    const x = new Float64Array(rate);
    for (let i = 0; i < x.length; i++) x[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / rate);
    const sg = await D.spectrogramLog(x, rate);
    let nan = 0, lastMeasured = -1;
    for (let i = 0; i < sg.gridN; i++) {
      if (Number.isNaN(sg.frames[i])) nan++;
      else lastMeasured = i;
    }
    ok(nan > 0 && Number.isNaN(sg.frames[sg.gridN - 1]),
      "grid above 16 kHz Nyquist is NaN (unmeasured, not faked)", nan + " cells");
    ok(lastMeasured >= 0 && sg.grid[lastMeasured] < 16000 && !Number.isNaN(sg.frames[0]),
      "cells below Nyquist stay measured", sg.grid[lastMeasured].toFixed(0) + " Hz");
  }

  // ---- decimateEnvelope: max-pooling keeps the attack peak ----
  {
    const env = new Float64Array(100000).fill(0.1);
    env[54321] = 0.97; // a single-sample attack peak
    const d = D.decimateEnvelope(env, 4096);
    ok(d.env.length <= 4096, "decimated length within target", d.env.length);
    ok(d.factor === Math.ceil(100000 / 4096), "integer pooling factor", d.factor);
    let mx = 0; for (let i = 0; i < d.env.length; i++) if (d.env[i] > mx) mx = d.env[i];
    ok(mx === 0.97, "peak survives decimation exactly", mx);
    const short = D.decimateEnvelope(new Float64Array(100), 4096);
    ok(short.env.length === 100 && short.factor === 1, "short envelope passes through");
  }

  // ---- magma colormap: endpoints + perceptual monotonicity ----
  {
    const lo = D.magmaColor(0), hi = D.magmaColor(1);
    ok(lo[0] === 0x00 && lo[1] === 0x00 && lo[2] === 0x04, "magma starts near-black #000004",
      lo.join(","));
    ok(hi[0] === 0xfc && hi[1] === 0xfd && hi[2] === 0xbf, "magma ends pale yellow #fcfdbf",
      hi.join(","));
    ok(D.MAGMA.length === 768, "256 RGB entries");
    // Perceptually-uniform ⇒ luminance rises monotonically ("never rainbow"
    // as a testable property). 8-bit quantization allows ≤0.5-unit wiggle
    // between neighbours; over any 8-entry stride the rise must be strict.
    const lum = [];
    for (let i = 0; i < 256; i++)
      lum.push(0.2126 * D.MAGMA[i*3] + 0.7152 * D.MAGMA[i*3+1] + 0.0722 * D.MAGMA[i*3+2]);
    let okAdj = true, okStride = true;
    for (let i = 1; i < 256; i++) if (lum[i] < lum[i-1] - 0.5) okAdj = false;
    for (let i = 8; i < 256; i++) if (lum[i] <= lum[i-8]) okStride = false;
    ok(okAdj && okStride, "luminance rises monotonically across the map",
      `range ${lum[0].toFixed(1)} → ${lum[255].toFixed(1)}`);
    const clamped = D.magmaColor(-3), clamped2 = D.magmaColor(7);
    ok(clamped[2] === 4 && clamped2[0] === 0xfc, "magmaColor clamps out-of-range t");
  }

  // ---- M2.5 EQ sections: RBJ magnitude identities ----
  {
    const g = 6, q = 1.41;
    const atFc = D.eqPeakingDb(1000, 1000, g, q);
    ok(approx(atFc, g, 1e-9), "peaking: exactly g dB at fc", atFc.toFixed(9));
    ok(Math.abs(D.eqPeakingDb(1, 1000, g, q)) < 1e-3 &&
       Math.abs(D.eqPeakingDb(2e7, 1000, g, q)) < 1e-3,
      "peaking: ~0 dB far from fc");
    let recip = true;
    for (const f of [80, 500, 1000, 1234, 8000])
      if (Math.abs(D.eqPeakingDb(f, 1000, 9, 2) + D.eqPeakingDb(f, 1000, -9, 2)) > 1e-9)
        recip = false;
    ok(recip, "peaking: boost and cut are exactly reciprocal");
    ok(D.eqPeakingDb(500, 1000, 0, q) === 0, "peaking: zero gain is a hard 0 (bypassed)");
  }

  // ---- M2.5 shelves: asymptotes, midpoint, reciprocity ----
  {
    const g = 8;
    ok(approx(D.eqLowShelfDb(1e-3, 1000, g), g, 1e-3), "low shelf: g dB on the low side",
      D.eqLowShelfDb(1e-3, 1000, g).toFixed(4));
    ok(Math.abs(D.eqLowShelfDb(1e9, 1000, g)) < 1e-3, "low shelf: 0 dB on the high side");
    ok(approx(D.eqLowShelfDb(1000, 1000, g), g / 2, 1e-9),
      "low shelf: exactly g/2 at fc (default Q = 1/√2)",
      D.eqLowShelfDb(1000, 1000, g).toFixed(9));
    ok(approx(D.eqHighShelfDb(1e9, 1000, g), g, 1e-3) &&
       Math.abs(D.eqHighShelfDb(1e-3, 1000, g)) < 1e-3 &&
       approx(D.eqHighShelfDb(1000, 1000, g), g / 2, 1e-9),
      "high shelf mirrors the low shelf");
    let recip = true;
    for (const f of [100, 900, 1000, 1100, 12000])
      if (Math.abs(D.eqLowShelfDb(f, 1000, 7, 0.71) + D.eqLowShelfDb(f, 1000, -7, 0.71)) > 1e-9 ||
          Math.abs(D.eqHighShelfDb(f, 1000, 7, 0.71) + D.eqHighShelfDb(f, 1000, -7, 0.71)) > 1e-9)
        recip = false;
    ok(recip, "shelves: boost and cut are exactly reciprocal");
    ok(D.eqShapeDb("lowshelf", 500, 1000, 8, 0.71) === D.eqLowShelfDb(500, 1000, 8, 0.71) &&
       D.eqShapeDb("highshelf", 500, 1000, 8, 0.71) === D.eqHighShelfDb(500, 1000, 8, 0.71) &&
       D.eqShapeDb("peak", 500, 1000, 8, 2) === D.eqPeakingDb(500, 1000, 8, 2),
      "eqShapeDb dispatches by type");
  }

  // ---- M2.5 eqSettingsResponseDb: composite = Σ band dB + trim ----
  {
    const s = { bands: [
      { type: "peak",     f: 1000, gainDb: 6,  q: 2 },
      { type: "lowshelf", f: 200,  gainDb: -4, q: 0.71 },
      { type: "peak",     f: 5000, gainDb: 0,  q: 1.41 }, // bypassed
    ], trimDb: 1.5 };
    const freqs = [100, 1000, 8000];
    const r = D.eqSettingsResponseDb(freqs, s);
    let mx = 0;
    for (let k = 0; k < freqs.length; k++) {
      const want = D.eqPeakingDb(freqs[k], 1000, 6, 2)
                 + D.eqLowShelfDb(freqs[k], 200, -4, 0.71) + 1.5;
      mx = Math.max(mx, Math.abs(r[k] - want));
    }
    ok(mx < 1e-9, "composite sums active bands plus trim, skips zero-gain bands",
      mx.toExponential(2));
  }

  // ---- M2.5 lsqSolve: recovers an exact linear model ----
  {
    const x = [0, 1, 2, 3, 4];
    const cols = [Float64Array.from(x), new Float64Array(5).fill(1)];
    const b = x.map(v => 2 * v + 3);
    const sol = D.lsqSolve(cols, b);
    ok(approx(sol[0], 2, 1e-6) && approx(sol[1], 3, 1e-6),
      "least squares solves slope 2, intercept 3", `${sol[0].toFixed(4)}, ${sol[1].toFixed(4)}`);
  }

  // ---- M2.5 EQ device table sanity ----
  {
    ok(D.EQ_DEVICES.length === 4 &&
       D.EQ_DEVICE_BY_ID.ge7.freqs.length === 7 &&
       D.EQ_DEVICE_BY_ID.m108s.freqs.length === 10 &&
       D.EQ_DEVICE_BY_ID.paraeq.bands.length === 3 &&
       D.EQ_DEVICE_BY_ID.logicChEq.bands.length === 6,
      "device table: GE-7 ×7, MXR ×10, Empress ×3, Logic ×6");
    ok(D.EQ_DEVICE_BY_ID.paraeq.trim.min === 0 &&
       D.EQ_DEVICE_BY_ID.logicChEq.bands[0].qFixed === 0.71,
      "Empress BOOST is boost-only; Logic shelves carry fixed Q");
  }

  // ---- M2.5 fitGraphicEq: recovers known GE-7 settings from an in-model target ----
  {
    const dev = D.EQ_DEVICE_BY_ID.ge7;
    const grid = D.makeLogGrid(160, 60, 20000);
    const trueGains = [4, -3, 6, 0, -5, 2.5, -1.5], trueTrim = 2;
    const target = new Float64Array(grid.length);
    for (let k = 0; k < grid.length; k++) {
      let s = trueTrim;
      for (let i = 0; i < dev.freqs.length; i++)
        s += D.eqPeakingDb(grid[k], dev.freqs[i], trueGains[i], dev.q);
      target[k] = s;
    }
    const fit = D.fitGraphicEq(grid, target, dev);
    ok(fit.deviceId === "ge7" && fit.kind === "graphic" && fit.bands.length === 7,
      "graphic fit returns normalized settings shape");
    let maxErr = 0;
    for (let i = 0; i < 7; i++)
      maxErr = Math.max(maxErr, Math.abs(fit.bands[i].gainDb - trueGains[i]));
    ok(maxErr < 0.15, "recovers all 7 slider gains within 0.15 dB",
      maxErr.toFixed(4) + " dB max err");
    ok(Math.abs(fit.trimDb - trueTrim) < 0.15, "recovers the LEVEL trim",
      fit.trimDb.toFixed(3) + " dB");
    ok(fit.residualRms < 0.05, "residual ≈ 0 for an exactly representable target",
      fit.residualRms.toFixed(4) + " dB rms");
    const fit2 = D.fitGraphicEq(grid, target, dev);
    ok(JSON.stringify(fit) === JSON.stringify(fit2), "graphic fit is deterministic");
    // achieved response also matches on a denser grid the fit never saw
    const dense = D.makeLogGrid(700, 60, 20000);
    const resp = D.eqSettingsResponseDb(dense, fit);
    let mx = 0;
    for (let k = 0; k < dense.length; k++) {
      let want = trueTrim;
      for (let i = 0; i < 7; i++) want += D.eqPeakingDb(dense[k], dev.freqs[i], trueGains[i], dev.q);
      mx = Math.max(mx, Math.abs(resp[k] - want));
    }
    ok(mx < 0.2, "achieved response matches the target off the fit grid too",
      mx.toFixed(4) + " dB max");
  }

  // ---- M2.5 fitParametricEq: single-peak recovery ----
  {
    const grid = D.makeLogGrid(160, 60, 20000);
    const target = new Float64Array(grid.length);
    for (let k = 0; k < grid.length; k++) target[k] = D.eqPeakingDb(grid[k], 1000, 6, 1.4);
    const dev = D.EQ_DEVICE_BY_ID.paraeq;
    const fit = D.fitParametricEq(grid, target, dev);
    ok(fit.kind === "parametric" && fit.bands.length === 3,
      "parametric fit returns normalized settings shape");
    ok(fit.residualRms < 0.35, "Empress model fits a +6 dB / 1 kHz / Q 1.4 bump",
      fit.residualRms.toFixed(3) + " dB rms");
    const resp = D.eqSettingsResponseDb(grid, fit);
    let mx = 0;
    for (let k = 0; k < grid.length; k++) mx = Math.max(mx, Math.abs(resp[k] - target[k]));
    ok(mx < 1.0, "max deviation from the bump target bounded", mx.toFixed(3) + " dB");
    let bi = 0;
    for (let i = 1; i < 3; i++)
      if (Math.abs(fit.bands[i].gainDb) > Math.abs(fit.bands[bi].gainDb)) bi = i;
    const b = fit.bands[bi];
    ok(Math.abs(Math.log(b.f / 1000)) < 0.1, "dominant band centers near 1 kHz",
      b.f.toFixed(0) + " Hz");
    ok(Math.abs(b.gainDb - 6) < 1.5, "dominant band gain near +6 dB", b.gainDb.toFixed(2));
    ok(dev.qChoices.indexOf(b.q) >= 0, "Q snaps to a 3-position switch value", b.q);
    ok(fit.trimDb >= 0 && fit.trimDb <= 30, "BOOST trim stays in device range",
      fit.trimDb.toFixed(2));
    const fitL = D.fitParametricEq(grid, target, D.EQ_DEVICE_BY_ID.logicChEq);
    ok(fitL.bands[0].q === 0.71 && fitL.bands[5].q === 0.71,
      "Logic shelves keep their fixed Q 0.71");
    ok(fitL.residualRms < 0.35, "Logic model fits the bump too",
      fitL.residualRms.toFixed(3) + " dB rms");
    const fitP2 = D.fitParametricEq(grid, target, dev);
    ok(JSON.stringify(fit) === JSON.stringify(fitP2), "parametric fit is deterministic");
  }

  // ---- M2.5 sgramDifference: onset-aligned A−B, level offset, NaN rules ----
  {
    const rate = 44100, win = 2048, df = rate / win, f = 46 * df; // ≈ 990.5 Hz on-bin
    const mk = async (amp, tOn, tOff, totalSec, r) => {
      const rr = r || rate;
      const x = new Float64Array(Math.round(totalSec * rr));
      for (let i = Math.round(tOn * rr); i < Math.round(tOff * rr); i++)
        x[i] = amp * Math.sin(2 * Math.PI * f * i / rr);
      return await D.spectrogramLog(x, rr);
    };
    // A: full-scale burst 0.5–1.5 s of a 2 s file; B: half amplitude, 0.8–1.8 s of 2.5 s
    const sgA = await mk(1.0, 0.5, 1.5, 2.0);
    const sgB = await mk(0.5, 0.8, 1.8, 2.5);
    const dsg = D.sgramDifference(sgA, 0.5, sgB, 0.8, 0);
    ok(approx(dsg.t0, -0.5, 1e-9) && approx(dsg.duration, 2.0, 0.02),
      "span: min pre-onset lead, min post-onset tail",
      `t0 ${dsg.t0.toFixed(2)} s, dur ${dsg.duration.toFixed(2)} s`);
    let ci = 0;
    for (let i = 1; i < dsg.gridN; i++)
      if (Math.abs(Math.log(dsg.grid[i] / f)) < Math.abs(Math.log(dsg.grid[ci] / f))) ci = i;
    const at = tau => dsg.frames[
      Math.max(0, Math.min(dsg.nFrames - 1, Math.round((tau - dsg.t0) * dsg.frameRate)))
      * dsg.gridN + ci];
    const twice = 20 * Math.log10(2); // 6.0206 dB
    ok(approx(at(0.5), twice, 0.3), "A at 2× amplitude reads +6.02 dB in the tone cell",
      at(0.5).toFixed(2) + " dB");
    // τ = 0.25 s after onset: in-burst on BOTH sides only under onset alignment
    // (absolute time 0.25 s is silence in both files)
    ok(approx(at(0.25), twice, 0.3), "columns align at each file's own first onset",
      at(0.25).toFixed(2) + " dB");
    ok(Number.isNaN(at(-0.3)), "pre-onset silence is NaN, not a fake level difference");
    ok(dsg.p98 >= 0 && dsg.p98 <= dsg.maxAbs && dsg.p98 > 3,
      "p98 scale statistic is sane", `p98 ${dsg.p98.toFixed(2)}, max ${dsg.maxAbs.toFixed(2)}`);
    const dlm = D.sgramDifference(sgA, 0.5, sgB, 0.8, twice);
    const atLm = dlm.frames[Math.round((0.5 - dlm.t0) * dlm.frameRate) * dlm.gridN + ci];
    ok(approx(atLm, 0, 0.3), "level-match offset on B cancels the difference",
      atLm.toFixed(3) + " dB");
    const dsame = D.sgramDifference(sgA, 0.5, sgA, 0.5, 0);
    let mxs = 0;
    for (let k = 0; k < dsame.frames.length; k++) {
      const v = dsame.frames[k];
      if (!Number.isNaN(v)) mxs = Math.max(mxs, Math.abs(v));
    }
    ok(mxs < 1e-12, "identical signal differences to exactly 0", mxs.toExponential(2));
    // B at 32 kHz: its NaN above 16 kHz must propagate even where A is loud
    const f2 = 836 * df; // ≈ 18.0 kHz — above B's Nyquist, below A's
    const n3 = Math.round(2.0 * rate);
    const x3 = new Float64Array(n3);
    for (let i = Math.round(0.5 * rate); i < Math.round(1.5 * rate); i++)
      x3[i] = 0.5 * Math.sin(2 * Math.PI * f * i / rate)
            + 0.5 * Math.sin(2 * Math.PI * f2 * i / rate);
    const sgA3 = await D.spectrogramLog(x3, rate);
    const sgB3 = await mk(0.5, 0.8, 1.8, 2.5, 32000);
    const d3 = D.sgramDifference(sgA3, 0.5, sgB3, 0.8, 0);
    let c2 = 0;
    for (let i = 1; i < d3.gridN; i++)
      if (Math.abs(Math.log(d3.grid[i] / f2)) < Math.abs(Math.log(d3.grid[c2] / f2))) c2 = i;
    const col3 = Math.round((0.5 - d3.t0) * d3.frameRate) * d3.gridN;
    ok(Number.isNaN(d3.frames[col3 + c2]),
      "cell above B's Nyquist is NaN even though A is loud there");
    ok(!Number.isNaN(d3.frames[col3 + ci]),
      "tone cell below both Nyquists stays measured", d3.frames[col3 + ci].toFixed(2) + " dB");
  }

  // ---- M2.6e switch on-state: CSS contract (neutral accent, light knob) ----
  {
    const root = html.match(/:root\{[\s\S]*?\n\}/);
    const dark = html.match(/html\[data-theme="dark"\]\{[\s\S]*?\n\}/);
    const sw = html.match(/\/\* switch \*\/[\s\S]*?\.switch\.disabled\{[^}]+\}/);
    ok(!!root && !!dark && !!sw, "stylesheet has :root, dark theme, and switch rules");
    ok(/--switch-on:\s*#3d4652/.test(root[0]) && /--switch-knob:\s*#faf8f1/.test(root[0]),
      "Bright on-track is cool slate + paper knob", (root && root[0].match(/--switch-\w+:\s*#[0-9a-f]+/g) || []).join(" "));
    ok(/--switch-on:\s*#7c8796/.test(dark[0]) && /--switch-knob:\s*#eef0f3/.test(dark[0]),
      "Dark on-track is mid slate + light knob");
    ok(/input:checked \+ \.tk\{[^}]*background:var\(--switch-on\)/.test(sw[0]),
      "checked track fills with --switch-on, not a hardcoded dark");
    ok(/input:checked \+ \.tk::after\{[^}]*background:var\(--switch-knob\)/.test(sw[0]),
      "checked knob is --switch-knob (light in both themes)");
    ok(!/#39424f/.test(html), "pre-M2.6e fully-dark checked fill is gone");
    ok(!/--slot-[ab]/.test(sw[0]), "switch CSS does not use guitar slot colors");
  }

  // ---- M2.5 divergeColor: endpoints are the slot accents ----
  {
    const p = D.divergeColor(1), z = D.divergeColor(0), m = D.divergeColor(-1);
    ok(p[0] === 240 && p[1] === 161 && p[2] === 62, "t=+1 → slot A amber", p.join(","));
    ok(m[0] === 68 && m[1] === 194 && m[2] === 212, "t=−1 → slot B teal", m.join(","));
    ok(z[0] === 14 && z[1] === 16 && z[2] === 20, "t=0 → near-background neutral", z.join(","));
    const hi = D.divergeColor(5), lo = D.divergeColor(-5), nn = D.divergeColor(NaN);
    ok(hi[0] === 240 && lo[2] === 212 && nn[0] === 14 && nn[1] === 16 && nn[2] === 20,
      "clamps out-of-range t and maps NaN to neutral");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
