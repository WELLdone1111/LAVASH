import { invoke, isTauri } from "@tauri-apps/api/core";

export type ResourceOverview = {
  cpuPercent: number;
  memoryPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskPercent: number;
  diskAvailableGb: number;
  diskTotalGb: number;
};

export type LavashUsageSlice = {
  id: string;
  label: string;
  cpuPercent: number;
  memoryBytes: number;
};

export type LavashProcessRow = {
  name: string;
  category: string;
  cpuPercent: number;
  memoryBytes: number;
  pid: number;
};

export type DiskEntry = {
  name: string;
  path: string;
  bytes: number;
  isDir: boolean;
};

export type ResourceSnapshot = {
  overview: ResourceOverview;
  cpuBrand: string;
  lavashSlices: LavashUsageSlice[];
  processes: LavashProcessRow[];
  lavashDisk: DiskEntry[];
  statusOk: boolean;
  statusMessage: string;
};

export type NetworkSection = {
  id: string;
  title: string;
  ok: boolean;
  lines: string[];
};

export type NetworkDiagnoseResult = {
  ok: boolean;
  checkedAt: string;
  sections: NetworkSection[];
};

export function formatResourceBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function fetchResourceSnapshot(): Promise<ResourceSnapshot | null> {
  if (!isTauri()) return null;
  return invoke<ResourceSnapshot>("lavash_resource_snapshot");
}

export async function fetchResourceDiskFolder(relativePath: string): Promise<DiskEntry[]> {
  if (!isTauri()) return [];
  return invoke<DiskEntry[]>("lavash_resource_disk_folder", { relativePath });
}

export async function runResourceNetworkDiagnose(): Promise<NetworkDiagnoseResult | null> {
  if (!isTauri()) return null;
  return invoke<NetworkDiagnoseResult>("lavash_resource_network_diagnose");
}
