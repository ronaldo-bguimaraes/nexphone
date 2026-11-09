import { z } from "zod";
import { AdapterError } from "../runtime/errors.js";

export const PROTOCOL_VERSION = "1.0";

const authSchema = z
  .object({
    type: z.literal("auth"),
    token: z.string().min(1),
    protocolVersion: z.string().default(PROTOCOL_VERSION),
  })
  .strict();

const keySchema = z
  .object({
    type: z.literal("key"),
    keyCode: z.number().int(),
    action: z.enum(["down", "up"]),
  })
  .strict();

const textSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().max(1024),
  })
  .strict();

const tapSchema = z
  .object({
    type: z.literal("tap"),
    x: z.number(),
    y: z.number(),
    pointerId: z.number().int().optional(),
  })
  .strict();

const swipeSchema = z
  .object({
    type: z.literal("swipe"),
    x: z.number(),
    y: z.number(),
    x2: z.number(),
    y2: z.number(),
    durationMs: z.number().int().min(0).max(5000),
    pointerId: z.number().int().optional(),
  })
  .strict();

const scrollSchema = z
  .object({
    type: z.literal("scroll"),
    x: z.number(),
    y: z.number(),
    deltaX: z.number(),
    deltaY: z.number(),
  })
  .strict();

export const inputEventSchema = z.discriminatedUnion("type", [
  tapSchema,
  swipeSchema,
  scrollSchema,
  keySchema,
  textSchema,
]);

export type InputEvent = z.infer<typeof inputEventSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  authSchema,
  z.object({ type: z.literal("input"), event: inputEventSchema }).strict(),
  z.object({ type: z.literal("ping"), t: z.number() }).strict(),
  z.object({ type: z.literal("request_keyframe") }).strict(),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export function parseClientMessage(raw: string): ClientMessage {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new AdapterError("INPUT_REJECTED", "The message is not valid JSON");
  }
  const parsed = clientMessageSchema.safeParse(value);
  if (!parsed.success) {
    throw new AdapterError("INPUT_REJECTED", "The message does not match the protocol");
  }
  return parsed.data;
}

export function assertInBounds(event: InputEvent, width: number, height: number): void {
  const within = (x: number, y: number) =>
    Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= width && y <= height;

  if (event.type === "tap" && !within(event.x, event.y)) {
    throw new AdapterError("INPUT_REJECTED", "Tap coordinates are outside the display");
  }
  if (event.type === "swipe" && (!within(event.x, event.y) || !within(event.x2, event.y2))) {
    throw new AdapterError("INPUT_REJECTED", "Swipe coordinates are outside the display");
  }
  if (event.type === "scroll" && !within(event.x, event.y)) {
    throw new AdapterError("INPUT_REJECTED", "Scroll coordinates are outside the display");
  }
  if (event.type === "scroll" && event.deltaX === 0 && event.deltaY === 0) {
    throw new AdapterError("INPUT_REJECTED", "Scroll requires a non-zero delta");
  }
}

export interface VideoHeader {
  configuration: boolean;
  data: Uint8Array;
}

export function encodeVideoPacket(configuration: boolean, data: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length + 1);
  output[0] = configuration ? 0x01 : 0x02;
  output.set(data, 1);
  return output;
}

export function decodeVideoPacket(buffer: Uint8Array): VideoHeader {
  if (buffer.length === 0) {
    throw new AdapterError("STREAM_FAILED", "Received an empty video frame");
  }
  const header = buffer[0];
  if (header !== 0x01 && header !== 0x02) {
    throw new AdapterError("STREAM_FAILED", "Unknown video frame header");
  }
  return { configuration: header === 0x01, data: buffer.subarray(1) };
}

export class LatencyTracker {
  private samples: number[] = [];

  record(durationMs: number): void {
    this.samples.push(durationMs);
    if (this.samples.length > 200) {
      this.samples.shift();
    }
  }

  summary(): { samples: number; p50Ms: number | null; p95Ms: number | null } {
    if (this.samples.length === 0) {
      return { samples: 0, p50Ms: null, p95Ms: null };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? null;
    return { samples: sorted.length, p50Ms: at(0.5), p95Ms: at(0.95) };
  }
}
