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
  TUNINGS, tuningMidi, autocorrF0, sniffAudioInfo, dynamicsMetrics, attackTimes };
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

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
