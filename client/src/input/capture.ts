export interface InputSender {
  sendTap(x: number, y: number): void;
  sendSwipe(x: number, y: number, x2: number, y2: number, durationMs: number): void;
  sendScroll(x: number, y: number, deltaX: number, deltaY: number): void;
  sendKey(keyCode: number, action: "down" | "up"): void;
  sendText(text: string): void;
}

export interface CaptureOptions {
  element: HTMLElement;
  videoSize: () => { width: number; height: number };
  sender: InputSender;
}

/**
 * Translates pointer and keyboard events into NexPhone input messages.
 * Coordinates are scaled from CSS pixels to the negotiated video space.
 */
export function attachInput(options: CaptureOptions): () => void {
  const { element, videoSize, sender } = options;
  let start: { x: number; y: number; time: number } | null = null;

  const toVideo = (event: PointerEvent): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    const { width, height } = videoSize();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    element.setPointerCapture(event.pointerId);
    const point = toVideo(event);
    start = { ...point, time: performance.now() };
    event.preventDefault();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!start) {
      return;
    }
    const point = toVideo(event);
    const duration = Math.round(performance.now() - start.time);
    const distance = Math.hypot(point.x - start.x, point.y - start.y);
    if (distance < 12 && duration < 500) {
      sender.sendTap(point.x, point.y);
    } else {
      sender.sendSwipe(start.x, start.y, point.x, point.y, Math.min(5000, Math.max(50, duration)));
    }
    start = null;
    event.preventDefault();
  };

  const onWheel = (event: WheelEvent) => {
    const rect = element.getBoundingClientRect();
    const { width, height } = videoSize();
    sender.sendScroll(
      ((event.clientX - rect.left) / rect.width) * width,
      ((event.clientY - rect.top) / rect.height) * height,
      -event.deltaX / 100,
      -event.deltaY / 100,
    );
    event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.key.length === 1) {
      sender.sendText(event.key);
      event.preventDefault();
      return;
    }
    const special: Record<string, number> = {
      Backspace: 67,
      Enter: 66,
      Escape: 111,
      Tab: 61,
      ArrowUp: 19,
      ArrowDown: 20,
      ArrowLeft: 21,
      ArrowRight: 22,
    };
    const keyCode = special[event.key];
    if (keyCode !== undefined) {
      sender.sendKey(keyCode, "down");
      sender.sendKey(keyCode, "up");
      event.preventDefault();
    }
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown);
  };
}
