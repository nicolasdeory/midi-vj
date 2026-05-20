import type { RGB } from "./types.js";

function checksum(packet: number[]): number {
  return packet.reduce((acc, byte) => acc ^ byte, 0);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildRazerFrame(colors: RGB[]): Uint8Array {
  const packet = [0xbb, 0x00, 0xfa, 0xb0, 0x00, colors.length];
  for (const [r, g, b] of colors) {
    packet.push(r & 0xff, g & 0xff, b & 0xff);
  }
  packet.push(checksum(packet));
  const payload = toBase64(new Uint8Array(packet));
  return new TextEncoder().encode(
    JSON.stringify({ msg: { cmd: "razer", data: { pt: payload } } }),
  );
}

export function buildRazerControl(enabled: boolean): Uint8Array {
  const packet = enabled
    ? [0xbb, 0x00, 0x01, 0xb1, 0x01, 0x0a]
    : [0xbb, 0x00, 0x01, 0xb1, 0x00, 0x0b];
  const payload = toBase64(new Uint8Array(packet));
  return new TextEncoder().encode(
    JSON.stringify({ msg: { cmd: "razer", data: { pt: payload } } }),
  );
}
