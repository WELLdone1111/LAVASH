import { describe, expect, it } from "vitest";

import {
  formatPythonRuntimeError,
  pythonRuntimeLabel,
  type PythonProbeResult,
} from "@/features/lavashconstruct/runtime/model/pythonRuntimeModel";

describe("pythonRuntimeModel", () => {
  it("formats invoke errors", () => {
    expect(formatPythonRuntimeError("uv sync failed", "fallback")).toBe("uv sync failed");
    expect(formatPythonRuntimeError(new Error("missing python"), "fallback")).toBe("missing python");
    expect(formatPythonRuntimeError({}, "fallback")).toBe("fallback");
  });

  it("builds runtime label", () => {
    const ready: PythonProbeResult = {
      available: true,
      pythonVersion: "Python 3.13.3",
      pythonPath: "C:\\\\lavash\\\\python\\\\3.13\\\\python.exe",
      uvVersion: "uv 0.7.13",
      updateAvailable: false,
    };
    expect(pythonRuntimeLabel(ready)).toBe("Python 3.13.3");

    const stale: PythonProbeResult = { ...ready, updateAvailable: true };
    expect(pythonRuntimeLabel(stale)).toBe("Python 3.13.3 (update available)");

    const missing: PythonProbeResult = {
      available: false,
      pythonVersion: null,
      pythonPath: null,
      uvVersion: null,
      updateAvailable: false,
    };
    expect(pythonRuntimeLabel(missing)).toBe("Python unavailable");
  });
});
