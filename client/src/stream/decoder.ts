import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { ScrcpyVideoCodecId } from "@yume-chan/scrcpy";
import { TinyH264Decoder } from "@yume-chan/scrcpy-decoder-tinyh264";
import {
  BitmapVideoFrameRenderer,
  WebCodecsVideoDecoder,
} from "@yume-chan/scrcpy-decoder-webcodecs";

export interface VideoDecoderHandle {
  write(packet: ScrcpyMediaStreamPacket): Promise<void>;
  size(): { width: number; height: number };
  dispose(): void;
}

/**
 * Creates the best available H.264 decoder for the browser. WebCodecs is
 * preferred; tinyh264 provides a software fallback where it is unavailable.
 */
export function createDecoder(canvas: HTMLCanvasElement): VideoDecoderHandle {
  if (WebCodecsVideoDecoder.isSupported) {
    const decoder = new WebCodecsVideoDecoder({
      codec: ScrcpyVideoCodecId.H264,
      renderer: new BitmapVideoFrameRenderer(canvas),
    });
    const writer = decoder.writable.getWriter();
    return {
      async write(packet) {
        await writer.write(packet);
      },
      size() {
        return { width: decoder.width, height: decoder.height };
      },
      dispose() {
        void writer.close().catch(() => undefined);
        decoder.dispose();
      },
    };
  }

  const decoder = new TinyH264Decoder({ canvas });
  const writer = decoder.writable.getWriter();
  return {
    async write(packet) {
      await writer.write(packet);
    },
    size() {
      return { width: decoder.width, height: decoder.height };
    },
    dispose() {
      void writer.close().catch(() => undefined);
      decoder.dispose();
    },
  };
}
