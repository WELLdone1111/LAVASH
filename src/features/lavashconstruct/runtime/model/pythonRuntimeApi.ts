import { invoke, isTauri } from "@tauri-apps/api/core";

import type {
  PythonEnsureResult,
  PythonProbeResult,
} from "@/features/lavashconstruct/runtime/model/pythonRuntimeModel";
import { formatPythonRuntimeError } from "@/features/lavashconstruct/runtime/model/pythonRuntimeModel";

export async function probePythonRuntime(): Promise<PythonProbeResult> {
  if (!isTauri()) {
    return {
      available: false,
      pythonVersion: null,
      pythonPath: null,
      uvVersion: null,
      updateAvailable: false,
    };
  }
  try {
    return await invoke<PythonProbeResult>("python_probe");
  } catch {
    return {
      available: false,
      pythonVersion: null,
      pythonPath: null,
      uvVersion: null,
      updateAvailable: false,
    };
  }
}

export async function ensurePythonRuntime(): Promise<PythonEnsureResult> {
  if (!isTauri()) {
    throw new Error("Python runtime requires LAVASH desktop.");
  }
  try {
    return await invoke<PythonEnsureResult>("python_ensure");
  } catch (error) {
    throw new Error(formatPythonRuntimeError(error, "Failed to install Python runtime"));
  }
}

export async function updatePythonRuntime(): Promise<PythonEnsureResult> {
  if (!isTauri()) {
    throw new Error("Python runtime requires LAVASH desktop.");
  }
  try {
    return await invoke<PythonEnsureResult>("python_update");
  } catch (error) {
    throw new Error(formatPythonRuntimeError(error, "Failed to update Python runtime"));
  }
}
