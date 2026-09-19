import "@testing-library/jest-dom/vitest";

// jsdom lacks a few browser APIs used by components
if (typeof globalThis.crypto?.randomUUID !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
    },
  });
}
