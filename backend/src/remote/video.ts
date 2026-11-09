import type { VideoPacket } from "../runtime/contract.js";
import { encodeVideoPacket } from "./protocol.js";

export interface EncodedVideoFrame {
  binary: Uint8Array;
  keyframe: boolean;
  width: number;
  height: number;
}

export function encodeVideoFrame(packet: VideoPacket): EncodedVideoFrame {
  return {
    binary: encodeVideoPacket(packet.type === "configuration", packet.data),
    keyframe: packet.keyframe,
    width: packet.width,
    height: packet.height,
  };
}
