import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileCode2,
  FilePlus,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  X,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import {
  useProjectWorkspaceStore,
  type WorkspaceTreeNode,
} from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import { isLavashDocumentPath } from "@/features/lavashconstruct/documents/model/lavashDocumentPath";
import { confirmDiscardWorkspaceChanges } from "@/features/lavashconstruct/project/model/workspaceUnsavedGuard";
import "./ConstructProjectPanel.css";

type ConstructProjectPanelProps = {
  onOpenFolder: () => void;
  onOpenLavashDocument: (relativePath: string) => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  node: WorkspaceTreeNode | null;
  parentDir: string;
};

function TreeNode({
  node,
  depth,
  activePath,
  gitStatusMap,
  onOpenFile,
  onContextMenu,
}: {
  node: WorkspaceTreeNode;
  depth: number;
  activePath: string | null;
  gitStatusMap: Record<string, string>;
  onOpenFile: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: WorkspaceTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.kind === "dir";
  const hasChildren = Boolean(node.children?.length);
  const gitStatus = !isDir ? gitStatusMap[node.path] : undefined;

  if (isDir) {
    return (
      <li className="lc-project-tree__item">
        <button
          type="button"
          className="lc-project-tree__row lc-project-tree__row--dir"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setExpanded((v) => !v)}
          onContextMenu={(e) => onContextMenu(e, node)}
          aria-expanded={expanded}
        >
          <ChevronRight
            size={14}
            className={cn("lc-project-tree__chevron", expanded && "lc-project-tree__chevron--open")}
            aria-hidden
          />
          <span className="lc-project-tree__name">{node.name}</span>
        </button>
        {expanded && hasChildren ? (
          <ul className="lc-project-tree__children">
            {node.children!.map((child) => (
              <TreeNode
                key={child.path || child.name}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                gitStatusMap={gitStatusMap}
                onOpenFile={onOpenFile}
                onContextMenu={onContextMenu}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li className="lc-project-tree__item">
      <button
        type="button"
        className={cn(
          "lc-project-tree__row lc-project-tree__row--file",
          activePath === node.path && "lc-project-tree__row--active",
        )}
        style={{ paddingLeft: 22 + depth * 12 }}
        onClick={() => onOpenFile(node.path)}
        onContextMenu={(e) => onContextMenu(e, node)}
        title={node.path}
      >
        <FileCode2 size={14} aria-hidden />
        <span className="lc-project-tree__name">{node.name}</span>
        {gitStatus ? <span className="lc-project-tree__git">{gitStatus}</span> : null}
      </button>
    </li>
  );
}

export default function ConstructProjectPanel({
  onOpenFolder,
  onOpenLavashDocument,
}: ConstructProjectPanelProps) {
  const { t } = useI18n();
  const projectRoot = useProjectWorkspaceStore((s) => s.projectRoot);
  const tree = useProjectWorkspaceStore((s) => s.tree);
  const loading = useProjectWorkspaceStore((s) => s.loading);
  const openFile = useProjectWorkspaceStore((s) => s.openFile);
  const activeTabPath = openFile?.path ?? null;
  const gitStatusMap = useProjectWorkspaceStore((s) => s.gitStatusMap);
  const refreshTree = useProjectWorkspaceStore((s) => s.refreshTree);
  const refreshGitStatus = useProjectWorkspaceStore((s) => s.refreshGitStatus);
  const openProjectFile = useProjectWorkspaceStore((s) => s.openProjectFile);
  const closeProject = useProjectWorkspaceStore((s) => s.closeProject);
  const createFile = useProjectWorkspaceStore((s) => s.createFile);
  const createFolder = useProjectWorkspaceStore((s) => s.createFolder);
  const renameEntry = useProjectWorkspaceStore((s) => s.renameEntry);
  const deleteEntry = useProjectWorkspaceStore((s) => s.deleteEntry);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (!projectRoot) return;
    void refreshGitStatus();
  }, [projectRoot, refreshGitStatus]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  const handleOpenFile = useCallback(
    (path: string) => {
      if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
      if (isLavashDocumentPath(path)) {
        onOpenLavashDocument(path);
        return;
      }
      void openProjectFile(path);
    },
    [onOpenLavashDocument, openProjectFile, t],
  );

  const handleCloseProject = useCallback(() => {
    if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
    void closeProject();
  }, [closeProject, t]);

  const handleOpenFolderClick = useCallback(() => {
    if (!isTauri()) {
      window.alert(t("construct.project.desktopOnly"));
      return;
    }
    onOpenFolder();
  }, [onOpenFolder, t]);

  const openContextMenu = useCallback((event: React.MouseEvent, node: WorkspaceTreeNode) => {
    event.preventDefault();
    const parentDir = node.kind === "dir" ? node.path : node.path.replace(/\/[^/]+$/, "");
    setMenu({ x: event.clientX, y: event.clientY, node, parentDir });
  }, []);

  const openRootContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, node: null, parentDir: "" });
  }, []);

  const promptName = useCallback(
    (title: string, defaultValue = "") => {
      const value = window.prompt(title, defaultValue);
      return value?.trim() ?? "";
    },
    [],
  );

  const rootLabel = projectRoot?.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";

  return (
    <div className="lc-project-panel">
      <div className="lc-project-panel__actions">
        <button type="button" className="lc-project-panel__btn" onClick={handleOpenFolderClick}>
          <FolderOpen size={15} aria-hidden />
          {t("construct.project.openFolder")}
        </button>
        {projectRoot ? (
          <>
            <button
              type="button"
              className="lc-project-panel__btn lc-project-panel__btn--icon"
              aria-label={t("construct.project.newFile")}
              title={t("construct.project.newFile")}
              onClick={() => {
                const name = promptName(t("construct.project.newFilePrompt"));
                if (name) void createFile("", name);
              }}
            >
              <FilePlus size={15} aria-hidden />
            </button>
            <button
              type="button"
              className="lc-project-panel__btn lc-project-panel__btn--icon"
              aria-label={t("construct.project.newFolder")}
              title={t("construct.project.newFolder")}
              onClick={() => {
                const name = promptName(t("construct.project.newFolderPrompt"));
                if (name) void createFolder("", name);
              }}
            >
              <FolderPlus size={15} aria-hidden />
            </button>
            <button
              type="button"
              className="lc-project-panel__btn lc-project-panel__btn--icon"
              aria-label={t("construct.project.refresh")}
              title={t("construct.project.refresh")}
              disabled={loading}
              onClick={() => void refreshTree()}
            >
              <RefreshCw size={15} className={loading ? "lc-project-panel__spin" : undefined} aria-hidden />
            </button>
            <button
              type="button"
              className="lc-project-panel__btn lc-project-panel__btn--icon"
              aria-label={t("construct.project.closeFolder")}
              title={t("construct.project.closeFolder")}
              onClick={handleCloseProject}
            >
              <X size={15} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {projectRoot ? (
        <p className="lc-project-panel__root" title={projectRoot} onContextMenu={openRootContextMenu}>
          {rootLabel}
        </p>
      ) : (
        <p className="lc-project-panel__hint">{t("construct.project.emptyHint")}</p>
      )}
      {projectRoot && tree.length > 0 ? (
        <ul
          className="lc-project-tree"
          aria-label={t("construct.project.treeAria")}
          onContextMenu={openRootContextMenu}
        >
          {tree.map((node) => (
            <TreeNode
              key={node.path || node.name}
              node={node}
              depth={0}
              activePath={activeTabPath}
              gitStatusMap={gitStatusMap}
              onOpenFile={handleOpenFile}
              onContextMenu={openContextMenu}
            />
          ))}
        </ul>
      ) : null}

      {menu ? (
        <div
          ref={menuRef}
          className="lc-project-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const name = promptName(t("construct.project.newFilePrompt"));
              if (name) void createFile(menu.parentDir, name);
              setMenu(null);
            }}
          >
            {t("construct.project.newFile")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const name = promptName(t("construct.project.newFolderPrompt"));
              if (name) void createFolder(menu.parentDir, name);
              setMenu(null);
            }}
          >
            {t("construct.project.newFolder")}
          </button>
          {menu.node ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const name = promptName(t("construct.project.renamePrompt"), menu.node!.name);
                  if (name && name !== menu.node!.name) void renameEntry(menu.node!.path, name);
                  setMenu(null);
                }}
              >
                {t("construct.project.rename")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="lc-project-context-menu__danger"
                onClick={() => {
                  if (!window.confirm(t("construct.project.deleteConfirm"))) return;
                  void deleteEntry(menu.node!.path, menu.node!.kind === "dir");
                  setMenu(null);
                }}
              >
                {t("construct.project.delete")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
