import type { InputSink } from "../runtime/contract.js";
import type { InputEvent } from "./protocol.js";
import { assertInBounds } from "./protocol.js";

export async function forwardInput(
  event: InputEvent,
  input: InputSink,
  width: number,
  height: number,
): Promise<void> {
  assertInBounds(event, width, height);
  switch (event.type) {
    case "tap":
      await input.tap(event.x, event.y);
      break;
    case "swipe":
      await input.swipe(event.x, event.y, event.x2, event.y2, event.durationMs);
      break;
    case "scroll":
      await input.scroll(event.x, event.y, event.deltaX, event.deltaY);
      break;
    case "key":
      await input.key(event.keyCode, event.action);
      break;
    case "text":
      await input.text(event.text);
      break;
  }
}
