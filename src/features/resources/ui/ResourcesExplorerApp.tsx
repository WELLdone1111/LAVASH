import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ChevronDown, ChevronLeft, ChevronRight, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useI18n } from "@/i18n/context";
import {
  fetchResourceDiskFolder,
  fetchResourceSnapshot,
  formatResourceBytes,
  runResourceNetworkDiagnose,
  type DiskEntry,
  type LavashProcessRow,
  type NetworkDiagnoseResult,
  type ResourceSnapshot,
} from "@/features/resources/model/resourcesApi";
import "./ResourcesExplorer.css";

type TabId = "overview" | "cpu" | "disk" | "network";
type ProcessFilter = "core" | "lsp" | "other" | "all";

const SLICE_COLORS = ["#f59e0b", "#eab308", "#a78bfa", "#60a5fa"];

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function memLabel(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default function ResourcesExplorerApp() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("overview");
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [processFilter, setProcessFilter] = useState<ProcessFilter>("core");
  const [highOnly, setHighOnly] = useState(false);
  const [diskTrail, setDiskTrail] = useState<string[]>([]);
  const [diskEntries, setDiskEntries] = useState<DiskEntry[]>([]);
  const [network, setNetwork] = useState<NetworkDiagnoseResult | null>(null);
  const [networkOpen, setNetworkOpen] = useState<Record<string, boolean>>({});
  const [diagnosing, setDiagnosing] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchResourceSnapshot();
    if (data) setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (tab !== "disk") return;
    const rel = diskTrail.join("/");
    void fetchResourceDiskFolder(rel).then(setDiskEntries);
  }, [tab, diskTrail]);

  const filteredProcesses = useMemo(() => {
    const rows = snapshot?.processes ?? [];
    const byCat =
      processFilter === "all"
        ? rows
        : rows.filter((row) => row.category === processFilter);
    if (!highOnly) return byCat;
    return byCat.filter((row) => row.cpuPercent >= 1 || row.memoryBytes >= 64 * 1024 ** 2);
  }, [snapshot?.processes, processFilter, highOnly]);

  const onDiagnoseNetwork = useCallback(async () => {
    setDiagnosing(true);
    try {
      const result = await runResourceNetworkDiagnose();
      if (result) {
        setNetwork(result);
        setNetworkOpen(Object.fromEntries(result.sections.map((s) => [s.id, true])));
      }
    } finally {
      setDiagnosing(false);
    }
  }, []);

  const closeWindow = () => {
    void getCurrentWebviewWindow().close();
  };

  const diskTotalBytes = useMemo(
    () => (snapshot?.lavashDisk ?? []).reduce((sum, e) => sum + e.bytes, 0),
    [snapshot?.lavashDisk],
  );

  const renderOverview = () => {
    if (!snapshot) return null;
    const { overview, lavashSlices } = snapshot;
    return (
      <div className="lavash-resources__cards">
        <article className="lavash-resources__card">
          <header>
            <Cpu size={16} />
            <span>{t("resources.card.cpu")}</span>
          </header>
          <div className="lavash-resources__card-stat">{pct(overview.cpuPercent)}</div>
          <ul className="lavash-resources__card-list">
            {lavashSlices.map((slice, i) => (
              <li key={slice.id}>
                <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                {slice.label}: {slice.cpuPercent < 1 ? "<1%" : pct(slice.cpuPercent)}
              </li>
            ))}
          </ul>
        </article>
        <article className="lavash-resources__card">
          <header>
            <MemoryStick size={16} />
            <span>{t("resources.card.memory")}</span>
          </header>
          <div className="lavash-resources__card-stat">{pct(overview.memoryPercent)}</div>
          <ul className="lavash-resources__card-list">
            {lavashSlices.map((slice, i) => (
              <li key={slice.id}>
                <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                {slice.label}: {memLabel(slice.memoryBytes)}
              </li>
            ))}
          </ul>
        </article>
        <article className="lavash-resources__card">
          <header>
            <HardDrive size={16} />
            <span>{t("resources.card.disk")}</span>
          </header>
          <div className="lavash-resources__card-stat">{pct(overview.diskPercent)}</div>
          <p className="lavash-resources__card-sub">
            {t("resources.diskAvailable", {
              free: overview.diskAvailableGb.toFixed(2),
              total: overview.diskTotalGb.toFixed(2),
            })}
          </p>
          <ul className="lavash-resources__card-list">
            {(snapshot.lavashDisk ?? []).slice(0, 4).map((entry, i) => (
              <li key={entry.path}>
                <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                {entry.name}: {formatResourceBytes(entry.bytes)}
              </li>
            ))}
          </ul>
        </article>
      </div>
    );
  };

  const renderCpuMemory = () => {
    if (!snapshot) return null;
    const slices = snapshot.lavashSlices;
    const cpuSum = slices.reduce((s, x) => s + x.cpuPercent, 0) || 1;
    const memSum = slices.reduce((s, x) => s + x.memoryBytes, 0) || 1;
    return (
      <div className="lavash-resources__split">
        <aside className="lavash-resources__aside">
          <section className="lavash-resources__metric">
            <h3>{t("resources.cpuTitle")}</h3>
            <p className="lavash-resources__metric-sub">{snapshot.cpuBrand}</p>
            <div className="lavash-resources__bar">
              {slices.map((slice, i) => (
                <span
                  key={slice.id}
                  style={{
                    width: `${Math.max(4, (slice.cpuPercent / cpuSum) * 100)}%`,
                    background: SLICE_COLORS[i % SLICE_COLORS.length],
                  }}
                />
              ))}
            </div>
            <ul>
              {slices.map((slice, i) => (
                <li key={slice.id}>
                  <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                  {slice.label}: {slice.cpuPercent < 1 ? "<1%" : pct(slice.cpuPercent)}
                </li>
              ))}
            </ul>
          </section>
          <section className="lavash-resources__metric">
            <h3>{t("resources.memoryTitle")}</h3>
            <p className="lavash-resources__metric-sub">
              {snapshot.overview.memoryTotalMb >= 1024
                ? `${(snapshot.overview.memoryTotalMb / 1024).toFixed(1)} GB`
                : `${snapshot.overview.memoryTotalMb} MB`}
            </p>
            <div className="lavash-resources__bar">
              {slices.map((slice, i) => (
                <span
                  key={slice.id}
                  style={{
                    width: `${Math.max(4, (slice.memoryBytes / memSum) * 100)}%`,
                    background: SLICE_COLORS[i % SLICE_COLORS.length],
                  }}
                />
              ))}
            </div>
            <ul>
              {slices.map((slice, i) => (
                <li key={slice.id}>
                  <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                  {slice.label}: {memLabel(slice.memoryBytes)}
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <section className="lavash-resources__panel">
          <div className="lavash-resources__subtabs">
            {(["core", "lsp", "other", "all"] as ProcessFilter[]).map((id) => (
              <button
                key={id}
                type="button"
                className={processFilter === id ? "is-active" : ""}
                onClick={() => setProcessFilter(id)}
              >
                {t(`resources.process.${id}`)}
              </button>
            ))}
            <label className="lavash-resources__high-only">
              <input type="checkbox" checked={highOnly} onChange={(e) => setHighOnly(e.target.checked)} />
              {t("resources.highOnly")}
            </label>
          </div>
          <ProcessTable rows={filteredProcesses} emptyLabel={t("resources.processEmpty")} />
          <footer className="lavash-resources__panel-footer">
            <button type="button" onClick={closeWindow}>
              {t("resources.close")}
            </button>
          </footer>
        </section>
      </div>
    );
  };

  const renderDisk = () => {
    const entries = diskTrail.length === 0 ? snapshot?.lavashDisk ?? [] : diskEntries;
    const crumbs = [t("resources.diskRoot"), ...diskTrail];
    return (
      <div className="lavash-resources__split lavash-resources__split--disk">
        <aside className="lavash-resources__aside">
          <section className="lavash-resources__metric">
            <h3>{t("resources.diskLavash")}</h3>
            <p className="lavash-resources__metric-sub">{formatResourceBytes(diskTotalBytes)}</p>
            <div className="lavash-resources__bar lavash-resources__bar--single">
              <span style={{ width: "100%", background: "#f59e0b" }} />
            </div>
            <ul>
              {(snapshot?.lavashDisk ?? []).slice(0, 5).map((entry, i) => (
                <li key={entry.path}>
                  <span className="lavash-resources__dot" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                  {entry.name}: {formatResourceBytes(entry.bytes)}
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <section className="lavash-resources__panel">
          <div className="lavash-resources__crumbs">
            {diskTrail.length > 0 ? (
              <button type="button" className="lavash-resources__back" onClick={() => setDiskTrail((t) => t.slice(0, -1))}>
                <ChevronLeft size={14} />
              </button>
            ) : null}
            <span>{crumbs.join(" / ")}</span>
          </div>
          <table className="lavash-resources__table">
            <thead>
              <tr>
                <th>{t("resources.col.name")}</th>
                <th>{t("resources.col.size")}</th>
                <th aria-hidden />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.path}>
                  <td>{entry.name}</td>
                  <td>{formatResourceBytes(entry.bytes)}</td>
                  <td>
                    {entry.isDir ? (
                      <button
                        type="button"
                        className="lavash-resources__row-go"
                        aria-label={t("resources.openFolder")}
                        onClick={() => setDiskTrail(entry.path.split("/").filter(Boolean))}
                      >
                        <ChevronRight size={14} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  };

  const renderNetwork = () => (
    <div className="lavash-resources__network">
      <div className="lavash-resources__network-toolbar">
        <button type="button" className="lavash-resources__diagnose" disabled={diagnosing} onClick={() => void onDiagnoseNetwork()}>
          {diagnosing ? t("resources.diagnosing") : t("resources.diagnoseNetwork")}
        </button>
        {network ? (
          <span className="lavash-resources__network-time">
            {t("resources.lastDiagnosed", { time: network.checkedAt })}
          </span>
        ) : null}
      </div>
      {(network?.sections ?? []).map((section) => {
        const open = networkOpen[section.id] ?? true;
        return (
          <section key={section.id} className="lavash-resources__accordion">
            <button
              type="button"
              className="lavash-resources__accordion-head"
              onClick={() => setNetworkOpen((prev) => ({ ...prev, [section.id]: !open }))}
            >
              <span className={`lavash-resources__status ${section.ok ? "ok" : "bad"}`} aria-hidden />
              <span>{section.title}</span>
              <ChevronDown size={14} className={open ? "open" : ""} />
            </button>
            {open ? (
              <ul className="lavash-resources__accordion-body">
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
      {!network ? <p className="lavash-resources__hint">{t("resources.networkHint")}</p> : null}
    </div>
  );

  return (
    <div className="lavash-resources">
      <header className="lavash-resources__header">
        <div className="lavash-resources__brand">
          <span className="lavash-resources__brand-dot" aria-hidden />
          <h1>{t("resources.windowTitle")}</h1>
        </div>
        <nav className="lavash-resources__tabs" role="tablist">
          {(
            [
              ["overview", t("resources.tab.overview")],
              ["cpu", t("resources.tab.cpu")],
              ["disk", t("resources.tab.disk")],
              ["network", t("resources.tab.network")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="lavash-resources__report" onClick={closeWindow}>
          {t("resources.close")}
        </button>
      </header>

      {snapshot ? (
        <div className={`lavash-resources__banner ${snapshot.statusOk ? "ok" : "warn"}`}>
          <span className="lavash-resources__status ok" aria-hidden />
          {snapshot.statusMessage}
        </div>
      ) : null}

      <main className="lavash-resources__body">
        {loading && !snapshot ? <p className="lavash-resources__hint">{t("resources.loading")}</p> : null}
        {tab === "overview" ? renderOverview() : null}
        {tab === "cpu" ? renderCpuMemory() : null}
        {tab === "disk" ? renderDisk() : null}
        {tab === "network" ? renderNetwork() : null}
      </main>
    </div>
  );
}

function ProcessTable({ rows, emptyLabel }: { rows: LavashProcessRow[]; emptyLabel: string }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <p className="lavash-resources__empty">{emptyLabel}</p>;
  }
  return (
    <table className="lavash-resources__table lavash-resources__table--process">
      <thead>
        <tr>
          <th>{t("resources.col.process")}</th>
          <th>{t("resources.col.cpu")}</th>
          <th>{t("resources.col.memory")}</th>
          <th>{t("resources.col.pid")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.pid}-${row.name}`}>
            <td>{row.name}</td>
            <td>{row.cpuPercent < 0.05 ? "0%" : `${row.cpuPercent.toFixed(1)}%`}</td>
            <td>{memLabel(row.memoryBytes)}</td>
            <td>{row.pid}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
