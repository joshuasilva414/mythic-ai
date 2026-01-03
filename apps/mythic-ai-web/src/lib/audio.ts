export function encodeWavPCM16(
  float32: Float32Array,
  sampleRate: number
): Uint8Array {
  const numSamples = float32.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const totalSize = 44 + dataSize;

  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  floatTo16(view, 44, float32);
  return new Uint8Array(buf);
}

function writeString(dv: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i));
}
function floatTo16(view: DataView, offset: number, input: Float32Array) {
  let pos = offset;
  for (let i = 0; i < input.length; i++, pos += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

export function b64ToBlob(b64: string, mime: string) {
  const i = b64.indexOf(","); // handles data:audio/mpeg;base64,XXX too
  const clean = i >= 0 ? b64.slice(i + 1) : b64;
  const bin = atob(clean);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export function sniffAudioMime(b64: string) {
  const head = b64.slice(0, 8);
  // WAV often starts with "RIFF" -> base64 "UklGR"
  if (head.startsWith("UklGR")) return "audio/wav";
  // MP3 with ID3 tag often starts "ID3" -> base64 "SUQz"
  if (head.startsWith("SUQz") || b64.startsWith("/+")) return "audio/mpeg";
  return "audio/mpeg";
}
