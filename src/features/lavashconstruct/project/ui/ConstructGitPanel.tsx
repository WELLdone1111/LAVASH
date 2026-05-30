import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  fetchGitDiff,
  fetchGitIsRepo,
  fetchGitStatus,
  probeGit,
} from "@/features/lavashconstruct/project/model/projectToolsApi";
import type { GitFileStatus, GitProbeResult } from "@/features/lavashconstruct/project/model/projectToolsModel";
import { formatDevToolsError, gitStatusLabel } from "@/features/lavashconstruct/project/model/projectToolsModel";

type ConstructGitPanelProps = {
  refreshToken: number;
};

export default function ConstructGitPanel({ refreshToken }: ConstructGitPanelProps) {
  const { t } = useI18n();
  const [probe, setProbe] = useState<GitProbeResult | null>(null);
  const [isRepo, setIsRepo] = useState(false);
  const [rows, setRows] = useState<GitFileStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [diff, setDiff] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gitProbe = await probeGit();
      setProbe(gitProbe);
      if (!gitProbe.available) {
        setRows([]);
        setIsRepo(false);
        setError(t("devTools.git.unavailable"));
        return;
      }
      const repo = await fetchGitIsRepo();
      setIsRepo(repo);
      if (!repo) {
        setRows([]);
        setError(t("devTools.git.notRepo"));
        return;
      }
      const status = await fetchGitStatus();
      setRows(status);
      setSelectedPath(null);
      setDiff("");
    } catch (err) {
      setError(formatDevToolsError(err, t("devTools.git.loadFailed")));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const onSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      setDiff("");
      try {
        const text = await fetchGitDiff(path);
        setDiff(text.trim() ? text : t("devTools.git.noDiff"));
      } catch (err) {
        setDiff(formatDevToolsError(err, t("devTools.git.diffFailed")));
      }
    },
    [t],
  );

  if (loading && !probe) {
    return <p className="lc-devtools-panel__notice">{t("devTools.git.loading")}</p>;
  }

  if (error && rows.length === 0) {
    return <p className="lc-devtools-panel__notice lc-devtools-panel__notice--error">{error}</p>;
  }

  return (
    <div className="lc-git-panel">
      {probe?.version ? (
        <p className="lc-devtools-panel__notice">{probe.version}</p>
      ) : null}
      {!isRepo ? (
        <p className="lc-devtools-panel__notice">{t("devTools.git.notRepo")}</p>
      ) : rows.length === 0 ? (
        <p className="lc-devtools-panel__notice">{t("devTools.git.clean")}</p>
      ) : (
        <ul className="lc-git-panel__list">
          {rows.map((row) => (
            <li key={row.path}>
              <button type="button" className="lc-git-panel__row" onClick={() => void onSelect(row.path)}>
                <span className="lc-git-panel__status">{gitStatusLabel(row.status)}</span>
                <span className="lc-git-panel__path">{row.path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedPath && diff ? <pre className="lc-git-panel__diff">{diff}</pre> : null}
    </div>
  );
}
