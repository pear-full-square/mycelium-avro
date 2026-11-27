// A text encoder for the AVRO library, put in place before the library
// loads: Bare has no TextEncoder, and the one the library's copy brings for
// Bare says a text was read whole when only its first part fitted its
// buffer, so a text longer than that buffer (4096 bytes) was written cut
// short, its length with it, no error. This one says what it read, as the
// standard has it; the library then takes its other path for a long text.
const bytesOf = (str, i) => {
  const c = str.charCodeAt(i)
  if (c < 0x80) return [1, [c]]
  if (c < 0x800) return [1, [0xc0 | (c >> 6), 0x80 | (c & 63)]]
  if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
    const lo = str.charCodeAt(i + 1)
    if (lo >= 0xdc00 && lo < 0xe000) {
      const cp = ((c - 0xd800) << 10) + (lo - 0xdc00) + 0x10000
      return [2, [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)]]
    }
  }
  // (half a pair on its own: the replacement character, as the standard writes it)
  const u = c >= 0xd800 && c < 0xe000 ? 0xfffd : c
  return [1, [0xe0 | (u >> 12), 0x80 | ((u >> 6) & 63), 0x80 | (u & 63)]]
}

export class Encoder {
  get encoding () { return 'utf-8' }
  encode (str = '') {
    const out = []
    for (let i = 0; i < str.length;) { const [n, b] = bytesOf(str, i); for (const x of b) out.push(x); i += n }
    return new Uint8Array(out)
  }

  // -> { read, written }: the code units read, the bytes written: as much
  // of the text as fits, never part of a character
  encodeInto (str, into) {
    let read = 0
    let written = 0
    while (read < str.length) {
      const [n, b] = bytesOf(str, read)
      if (written + b.length > into.length) break
      for (const x of b) into[written++] = x
      read += n
    }
    return { read, written }
  }
}

if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = Encoder
