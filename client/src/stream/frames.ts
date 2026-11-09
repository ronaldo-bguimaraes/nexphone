import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";

export interface VideoFrame {
  packet: ScrcpyMediaStreamPacket;
  keyframe: boolean;
}

export function decodeVideoFrame(buffer: ArrayBuffer): VideoFrame {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    throw new Error("Empty video frame");
  }
  const configuration = bytes[0] === 0x01;
  if (!configuration && bytes[0] !== 0x02) {
    throw new Error("Unknown video frame header");
  }
  const data = bytes.subarray(1);
  return configuration
    ? { packet: { type: "configuration", data }, keyframe: true }
    : { packet: { type: "data", data, keyframe: false }, keyframe: false };
}
