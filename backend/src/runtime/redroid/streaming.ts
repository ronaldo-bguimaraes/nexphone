import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import { AdbServerClient, type AdbServerClient as AdbServerClientType } from "@yume-chan/adb";
import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import {
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  AndroidMotionEventButton,
  ScrcpyPointerId,
  type AndroidKeyCode,
  type ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";
import type { InputSink, RuntimeTransport, VideoPacket } from "../contract.js";
import { AdapterError } from "../errors.js";

export interface ScrcpyBridgeOptions {
  serial: string;
  serverJarPath: string;
  display: { width: number; height: number; fps: number };
  bitRate?: number;
}

/**
 * Bridges the scrcpy server video/control channels to NexPhone's transport
 * contract. This is the only file that knows about scrcpy.
 */
export class ScrcpyBridge {
  private client: AdbScrcpyClient<AdbScrcpyOptionsLatest<true>> | null = null;

  constructor(private readonly options: ScrcpyBridgeOptions) {}

  async open(): Promise<RuntimeTransport> {
    try {
      const connector = new AdbServerNodeTcpConnector({ host: "127.0.0.1", port: 5037 });
      const server = new AdbServerClient(connector);
      const devices: AdbServerClientType.Device[] = await server.getDevices(["device"]);
      const device =
        devices.find((candidate) => candidate.serial === this.options.serial) ??
        devices.find((candidate) => candidate.serial.endsWith(":5555"));
      if (!device) {
        throw new AdapterError("STREAM_FAILED", "The Android runtime is not visible to ADB");
      }
      const adb = await server.createAdb(device);

      const scrcpyOptions = new AdbScrcpyOptionsLatest({
        audio: false,
        control: true,
        videoCodec: "h264",
        maxSize: Math.max(this.options.display.width, this.options.display.height),
        maxFps: this.options.display.fps,
        videoBitRate: this.options.bitRate ?? 4_000_000,
        sendFrameMeta: true,
      });

      const client = await AdbScrcpyClient.start(
        adb,
        this.options.serverJarPath,
        scrcpyOptions,
      );
      this.client = client;
      const videoStream = await client.videoStream;
      if (!videoStream) {
        throw new AdapterError("STREAM_FAILED", "The scrcpy server did not provide a video stream");
      }
      const controller = client.controller;
      if (!controller) {
        throw new AdapterError("STREAM_FAILED", "The scrcpy control channel is unavailable");
      }

      const width = videoStream.width || this.options.display.width;
      const height = videoStream.height || this.options.display.height;

      const video = this.iterateVideo(
        videoStream.stream as unknown as AsyncIterable<ScrcpyMediaStreamPacket>,
        width,
        height,
      );
      const input = this.createInput(controller, width, height);

      return {
        video,
        input,
        async close() {
          await input.close();
          await client.close();
        },
      };
    } catch (error) {
      if (error instanceof AdapterError) {
        throw error;
      }
      throw new AdapterError("STREAM_FAILED", "Could not open the screen stream", (error as Error).message);
    }
  }

  private async *iterateVideo(
    stream: AsyncIterable<ScrcpyMediaStreamPacket>,
    width: number,
    height: number,
  ): AsyncGenerator<VideoPacket> {
    for await (const value of stream) {
      yield {
        type: value.type === "configuration" ? "configuration" : "data",
        data: value.data,
        keyframe: value.type === "configuration" ? true : Boolean(value.keyframe),
        timestampUs: Number(value.type === "data" ? (value.pts ?? 0n) : 0n),
        width,
        height,
      };
    }
  }

  private createInput(
    controller: NonNullable<AdbScrcpyClient<AdbScrcpyOptionsLatest<true>>["controller"]>,
    width: number,
    height: number,
  ): InputSink {
    const touch = (action: AndroidMotionEventAction, x: number, y: number) =>
      controller.injectTouch({
        action,
        pointerId: ScrcpyPointerId.Finger,
        pointerX: x,
        pointerY: y,
        videoWidth: width,
        videoHeight: height,
        pressure: action === AndroidMotionEventAction.Up ? 0 : 0.5,
        actionButton: AndroidMotionEventButton.Primary,
        buttons: action === AndroidMotionEventAction.Up ? 0 : AndroidMotionEventButton.Primary,
      });

    return {
      async tap(x, y) {
        await touch(AndroidMotionEventAction.Down, x, y);
        await touch(AndroidMotionEventAction.Up, x, y);
      },
      async swipe(x1, y1, x2, y2, durationMs) {
        await touch(AndroidMotionEventAction.Down, x1, y1);
        const steps = Math.max(2, Math.min(20, Math.round(durationMs / 16)));
        for (let step = 1; step <= steps; step += 1) {
          const ratio = step / steps;
          await touch(
            AndroidMotionEventAction.Move,
            x1 + (x2 - x1) * ratio,
            y1 + (y2 - y1) * ratio,
          );
          await new Promise((resolve) => setTimeout(resolve, durationMs / steps));
        }
        await touch(AndroidMotionEventAction.Up, x2, y2);
      },
      async scroll(x, y, deltaX, deltaY) {
        await controller.injectScroll({
          pointerX: x,
          pointerY: y,
          videoWidth: width,
          videoHeight: height,
          scrollX: Math.max(-1, Math.min(1, deltaX)),
          scrollY: Math.max(-1, Math.min(1, deltaY)),
          buttons: 0,
        });
      },
      async key(keyCode, action) {
        await controller.injectKeyCode({
          action: action === "down" ? AndroidKeyEventAction.Down : AndroidKeyEventAction.Up,
          keyCode: keyCode as AndroidKeyCode,
          repeat: 0,
          metaState: 0,
        });
      },
      async text(value) {
        await controller.injectText(value);
      },
      async close() {
        controller.releaseLock();
      },
    };
  }
}
