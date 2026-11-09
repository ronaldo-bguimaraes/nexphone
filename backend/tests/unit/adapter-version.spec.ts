import { describe, expect, it } from "vitest";
import { RUNTIME_CONTRACT_VERSION, isCompatibleContract } from "../../src/runtime/contract.js";
import { MockAdapter } from "../../src/runtime/mock/adapter.js";

describe("adapter contract versioning", () => {
  it("accepts compatible 1.x adapters", () => {
    expect(isCompatibleContract(RUNTIME_CONTRACT_VERSION)).toBe(true);
    expect(isCompatibleContract("1.4.9")).toBe(true);
  });

  it("rejects incompatible major versions", () => {
    expect(isCompatibleContract("2.0.0")).toBe(false);
    expect(isCompatibleContract("0.9.0")).toBe(false);
  });

  it("keeps the second adapter in the same contract family", () => {
    expect(new MockAdapter().contractVersion).toBe(RUNTIME_CONTRACT_VERSION);
  });
});
