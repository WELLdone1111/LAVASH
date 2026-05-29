/** Безпечний localStorage — не кидає при QuotaExceeded / private mode. */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("[LAVASH] localStorage.setItem failed", key, error);
    return false;
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
