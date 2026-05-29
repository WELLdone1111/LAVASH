import { isTauri } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (accept) input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener(
      "change",
      () => {
        const files = input.files ? Array.from(input.files) : [];
        input.remove();
        resolve(files);
      },
      { once: true },
    );
    input.click();
  });
}

function pickFolderFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener(
      "change",
      () => {
        const files = input.files ? Array.from(input.files) : [];
        input.remove();
        resolve(files);
      },
      { once: true },
    );
    input.click();
  });
}

export function pickOpenFiles(): Promise<File[]> {
  return pickFiles(".json,.lavash,.txt,.html,.css,.tsx,.jsx,application/json,text/*", true);
}

export function pickOpenFolderFiles(): Promise<File[]> {
  return pickFolderFiles();
}

export function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function spawnLavashWindow(label: string, title: string): Promise<void> {
  if (!isTauri()) {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
    return;
  }
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }
  new WebviewWindow(label, {
    url: "/",
    title,
    width: 1280,
    height: 800,
    decorations: false,
    backgroundColor: "#1e1e1e",
    resizable: true,
  });
}
