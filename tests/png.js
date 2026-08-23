// Minimal PNG reader for the headless gate — node built-ins only, no dependencies.
// Handles what headless Chrome writes: 8-bit, non-interlaced, RGB or RGBA.
"use strict";
const zlib = require("zlib");

function decodePNG(buf){
  if(buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47)
    throw new Error("not a PNG");
  let off = 8, ihdr = null, idat = [], pal = null, trns = null;
  while(off + 8 <= buf.length){
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if(type === "IHDR") ihdr = {
      w: data.readUInt32BE(0), h: data.readUInt32BE(4),
      depth: data[8], color: data[9], interlace: data[12],
    };
    else if(type === "IDAT") idat.push(data);
    else if(type === "PLTE") pal = data;
    else if(type === "tRNS") trns = data;
    else if(type === "IEND") break;
    off += 12 + len;
  }
  if(!ihdr) throw new Error("no IHDR");
  if(ihdr.depth !== 8) throw new Error("unsupported bit depth " + ihdr.depth);
  if(ihdr.interlace) throw new Error("interlaced PNG not supported");
  const CH = {0:1, 2:3, 3:1, 4:2, 6:4}[ihdr.color];
  if(CH == null) throw new Error("unsupported color type " + ihdr.color);
  if(ihdr.color === 3 && !pal) throw new Error("indexed PNG without PLTE");

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const {w, h} = ihdr, stride = w * CH, out = Buffer.alloc(h * stride);
  let p = 0;
  for(let y = 0; y < h; y++){
    const filter = raw[p++];
    const row = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y ? out.slice((y - 1) * stride, y * stride) : null;
    for(let i = 0; i < stride; i++){
      const a = i >= CH ? cur[i - CH] : 0;
      const b = prev ? prev[i] : 0;
      const c = (prev && i >= CH) ? prev[i - CH] : 0;
      let v = row[i];
      switch(filter){
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
        default: throw new Error("bad filter " + filter);
      }
      cur[i] = v & 0xff;
    }
  }
  // normalize to RGBA
  const rgba = Buffer.alloc(w * h * 4);
  for(let i = 0, n = w * h; i < n; i++){
    let r, g, b, a = 255;
    if(ihdr.color === 6){ r = out[i*4]; g = out[i*4+1]; b = out[i*4+2]; a = out[i*4+3]; }
    else if(ihdr.color === 2){ r = out[i*3]; g = out[i*3+1]; b = out[i*3+2]; }
    else if(ihdr.color === 0){ r = g = b = out[i]; }
    else if(ihdr.color === 4){ r = g = b = out[i*2]; a = out[i*2+1]; }
    else { const ix = out[i]; r = pal[ix*3]; g = pal[ix*3+1]; b = pal[ix*3+2]; if(trns && ix < trns.length) a = trns[ix]; }
    rgba[i*4] = r; rgba[i*4+1] = g; rgba[i*4+2] = b; rgba[i*4+3] = a;
  }
  return {w, h, rgba};
}

// Pixels where two same-size images differ by more than `tol` on any channel.
function diffPixels(A, B, tol){
  if(A.w !== B.w || A.h !== B.h) throw new Error("size mismatch: " + A.w + "x" + A.h + " vs " + B.w + "x" + B.h);
  const pts = [];
  for(let y = 0; y < A.h; y++) for(let x = 0; x < A.w; x++){
    const i = (y * A.w + x) * 4;
    if(Math.abs(A.rgba[i] - B.rgba[i]) > tol ||
       Math.abs(A.rgba[i+1] - B.rgba[i+1]) > tol ||
       Math.abs(A.rgba[i+2] - B.rgba[i+2]) > tol)
      pts.push({x, y, r: B.rgba[i], g: B.rgba[i+1], b: B.rgba[i+2]});
  }
  return pts;
}

// Group differing pixels into blobs (8-connected within `gap` px) so we can count marks.
function clusters(pts, gap){
  const key = p => p.x + "," + p.y, out = [];
  const byKey = new Map(pts.map(p => [key(p), p]));
  for(const p of pts){
    if(!byKey.has(key(p))) continue;
    const stack = [p], blob = [];
    byKey.delete(key(p));
    while(stack.length){
      const q = stack.pop(); blob.push(q);
      for(let dy = -gap; dy <= gap; dy++) for(let dx = -gap; dx <= gap; dx++){
        const k = (q.x + dx) + "," + (q.y + dy);
        if(byKey.has(k)){ stack.push(byKey.get(k)); byKey.delete(k); }
      }
    }
    // Reduce rather than Math.min(...xs): a blob can hold tens of thousands of
    // points and spreading that many arguments overflows the stack.
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for(const q of blob){
      if(q.x < x0) x0 = q.x; if(q.x > x1) x1 = q.x;
      if(q.y < y0) y0 = q.y; if(q.y > y1) y1 = q.y;
    }
    out.push({n: blob.length, x0, x1, y0, y1, px: blob});
  }
  return out.sort((a, b) => b.n - a.n);
}

module.exports = {decodePNG, diffPixels, clusters};
