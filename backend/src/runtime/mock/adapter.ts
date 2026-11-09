import { FakeAdapter } from "../fake/adapter.js";

/**
 * A second adapter used to prove runtime replaceability. It shares the fake
 * adapter's deterministic behavior but reports a different identity and a
 * reduced capability set.
 */
export class MockAdapter extends FakeAdapter {
  constructor() {
    super({
      id: "mock",
      capabilities: {
        androidVersion: "13",
        apiLevel: 33,
        displayWidth: 540,
        displayHeight: 960,
        fps: 15,
        features: { multiTouch: false, rotation: false },
      },
    });
  }
}
