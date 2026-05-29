import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  CONSTRUCT_CHAT_PROVIDERS,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";

export function secretsKeyConstructApi(provider: ConstructChatProvider): string {
  return `construct.api.${provider}`;
}

const API_KEYS_PURGED_KEY = "lavash.construct.apiKeysPurged.v1";

const cache = new Map<string, string>();
let initDone = false;

export function isSecretsVaultReady(): boolean {
  return initDone || !isTauri();
}

export function getSecretCached(key: string): string {
  return cache.get(key) ?? "";
}

export function setSecretCached(key: string, value: string): void {
  const v = value.trim();
  if (v) cache.set(key, v);
  else cache.delete(key);
  if (isTauri()) {
    void invoke("secrets_set", { key, value: v }).catch(() => {
      /* UI вже оновлено; повтор при наступній зміні */
    });
  }
}

export async function loadSecretFromVault(key: string): Promise<string> {
  if (!isTauri()) return "";
  try {
    const v = await invoke<string | null>("secrets_get", { key });
    const t = typeof v === "string" ? v.trim() : "";
    if (t) cache.set(key, t);
    return t;
  } catch {
    return "";
  }
}

function collectApiKeyStorageKeys(): string[] {
  const keys = new Set<string>();
  for (const p of CONSTRUCT_CHAT_PROVIDERS) {
    if (p.needsApiKey) keys.add(p.apiKeyStorageKey);
  }
  return [...keys];
}

function purgeApiKeysFromLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  for (const storageKey of collectApiKeyStorageKeys()) {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }
}

async function purgeApiKeysFromVault(): Promise<void> {
  if (!isTauri()) return;
  for (const p of CONSTRUCT_CHAT_PROVIDERS) {
    if (!p.needsApiKey) continue;
    const vaultKey = secretsKeyConstructApi(p.id);
    cache.delete(vaultKey);
    try {
      await invoke("secrets_set", { key: vaultKey, value: "" });
    } catch {
      /* ignore */
    }
  }
}

/** Одноразово видаляє збережені API-ключі (localStorage + vault). */
async function purgeStoredConstructApiKeysOnce(): Promise<void> {
  if (typeof localStorage !== "undefined" && localStorage.getItem(API_KEYS_PURGED_KEY) === "1") {
    return;
  }
  purgeApiKeysFromLocalStorage();
  await purgeApiKeysFromVault();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(API_KEYS_PURGED_KEY, "1");
    } catch {
      /* ignore */
    }
  }
}

/** Ініціалізація vault; старі ключі не підтягуються. */
export async function initSecretsVault(): Promise<void> {
  if (initDone) return;

  await purgeStoredConstructApiKeysOnce();

  if (isTauri()) {
    for (const p of CONSTRUCT_CHAT_PROVIDERS) {
      if (!p.needsApiKey) continue;
      await loadSecretFromVault(secretsKeyConstructApi(p.id));
    }
  }

  initDone = true;
}

export async function clearSecretsVault(): Promise<void> {
  cache.clear();
  purgeApiKeysFromLocalStorage();
  if (!isTauri()) return;
  await purgeApiKeysFromVault();
}

export async function getVaultStoragePath(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string>("secrets_vault_path");
  } catch {
    return null;
  }
}
