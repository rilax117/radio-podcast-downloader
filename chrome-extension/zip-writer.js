// Minimal streaming ZIP writer (STORE method, no compression).
// Uses data descriptors (general purpose bit flag 3) so each file's CRC and
// size are written AFTER its data — meaning we never need to buffer a whole
// mp3 to know its size. Memory usage stays bounded to ~one chunk per write.
//
// Layout per file:
//   local file header  →  raw data  →  data descriptor
// Followed by:
//   central directory  →  end of central directory
//
// 32-bit fields. Works for archives up to 4 GB total. (2.7 GB fits.)

const ENCODER = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32Update(crc, buf) {
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return crc >>> 0;
}

// flags: bit 3 (data descriptor) + bit 11 (UTF-8 filename) = 0x0808
const GP_FLAGS = 0x0808;

export async function writeZipStream(filesIterable, writable, onProgress) {
  const writer = writable.getWriter();
  const entries = [];
  let offset = 0;

  async function emit(bytes) {
    await writer.write(bytes);
    offset += bytes.byteLength;
  }

  let idx = 0;
  for await (const file of filesIterable) {
    idx++;
    const nameBytes = ENCODER.encode(file.name);
    const lfhOffset = offset;

    // Local file header (30 bytes + name)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lfh.buffer);
    dv.setUint32(0, 0x04034B50, true);  // signature
    dv.setUint16(4, 20, true);          // version needed
    dv.setUint16(6, GP_FLAGS, true);
    dv.setUint16(8, 0, true);            // method: STORE
    dv.setUint16(10, 0, true);           // mod time (1980-01-01 00:00:00)
    dv.setUint16(12, 0x0021, true);      // mod date
    dv.setUint32(14, 0, true);           // CRC (in data descriptor)
    dv.setUint32(18, 0, true);           // compressed size (in DD)
    dv.setUint32(22, 0, true);           // uncompressed size (in DD)
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);           // extra field length
    lfh.set(nameBytes, 30);
    await emit(lfh);

    let crc = 0xFFFFFFFF >>> 0;
    let size = 0;
    if (file.body) {
      const reader = file.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        crc = crc32Update(crc, value);
        size += value.length;
        await emit(value);
        if (onProgress) onProgress({ idx, name: file.name, bytesInFile: size });
      }
    }
    const finalCrc = (crc ^ 0xFFFFFFFF) >>> 0;

    // Data descriptor (16 bytes with optional signature)
    const dd = new Uint8Array(16);
    const ddv = new DataView(dd.buffer);
    ddv.setUint32(0, 0x08074B50, true);  // data descriptor signature
    ddv.setUint32(4, finalCrc, true);
    ddv.setUint32(8, size, true);
    ddv.setUint32(12, size, true);
    await emit(dd);

    entries.push({ nameBytes, lfhOffset, size, crc: finalCrc });
  }

  // Central directory
  const cdStart = offset;
  for (const e of entries) {
    const cdh = new Uint8Array(46 + e.nameBytes.length);
    const dv = new DataView(cdh.buffer);
    dv.setUint32(0, 0x02014B50, true);  // signature
    dv.setUint16(4, 0x031E, true);      // version made by (UNIX, 3.0)
    dv.setUint16(6, 20, true);          // version needed
    dv.setUint16(8, GP_FLAGS, true);
    dv.setUint16(10, 0, true);          // method
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 0x0021, true);
    dv.setUint32(16, e.crc, true);
    dv.setUint32(20, e.size, true);
    dv.setUint32(24, e.size, true);
    dv.setUint16(28, e.nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, e.lfhOffset, true);
    cdh.set(e.nameBytes, 46);
    await emit(cdh);
  }
  const cdSize = offset - cdStart;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054B50, true);
  dv.setUint16(4, 0, true);    // disk number
  dv.setUint16(6, 0, true);    // disk with CD start
  dv.setUint16(8, entries.length, true);
  dv.setUint16(10, entries.length, true);
  dv.setUint32(12, cdSize, true);
  dv.setUint32(16, cdStart, true);
  dv.setUint16(20, 0, true);   // comment length
  await emit(eocd);

  await writer.close();
}
