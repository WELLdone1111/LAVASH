import React from "react";
import ReactDOM from "react-dom/client";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import ResourcesExplorerApp from "@/features/resources/ui/ResourcesExplorerApp";
import { I18nProvider } from "./i18n/context";
import { initSecretsVault } from "@/features/secrets/model/secretsVault";
import AppErrorBoundary from "@/shared/components/AppErrorBoundary";
import { RESOURCES_WINDOW_LABEL } from "@/features/resources/model/openResourcesWindow";
import "@/styles/globals.css";

function dismissBootSplash(): void {
  document.getElementById("lavash-boot")?.remove();
}

async function resolveRootComponent(): Promise<React.ComponentType> {
  if (!isTauri()) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lavash-window") === "resources") return ResourcesExplorerApp;
    return App;
  }
  const label = getCurrentWebviewWindow().label;
  if (label === RESOURCES_WINDOW_LABEL) return ResourcesExplorerApp;
  return App;
}

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");

  const Root = await resolveRootComponent();
  const isMainWindow = Root === App;

  if (isTauri() && isMainWindow) {
    document.documentElement.dataset.lavashRoundedWindow = "1";
    const win = getCurrentWebviewWindow();
    void win.setShadow(false).catch(() => {});
    void win.setBackgroundColor({ red: 30, green: 30, blue: 30, alpha: 255 }).catch(() => {});
    void invoke("set_window_rounded_corners", { round: true }).catch(() => {});
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <I18nProvider>
          <Root />
        </I18nProvider>
      </AppErrorBoundary>
    </React.StrictMode>,
  );

  dismissBootSplash();

  if (isMainWindow) {
    void initSecretsVault().catch((error) => {
      console.warn("[secrets] vault init failed (UI still running)", error);
    });
  }
}

void bootstrap();
