import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/context";
import ConstructMonacoEditor from "@/features/lavashconstruct/editor/ui/ConstructMonacoEditor";
import "./ConstructArtboardFloatingCodeEditor.css";

export type ConstructArtboardFloatingCodeEditorProps = {
  elementId: string;
  elementName: string;
  code: string;
  visualKind: "plain-text" | "html" | "css" | "jsx";
  anchorX: number;
  anchorY: number;
  onChange: (elementId: string, newCode: string) => void;
  onClose: () => void;
};

type SyncStatus = "idle" | "syncing" | "synced";

export default function ConstructArtboardFloatingCodeEditor({
  elementId,
  elementName,
  code,
  visualKind,
  anchorX,
  anchorY,
  onChange,
  onClose,
}: ConstructArtboardFloatingCodeEditorProps) {
  const { t } = useI18n();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [source, setSource] = useState(code);
  const [pos, setPos] = useState({ x: anchorX, y: anchorY });
  const [size, setSize] = useState({ w: 340, h: 280 });

  useEffect(() => {
    setSource(code);
  }, [code, elementId]);

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: Math.min(Math.max(8, anchorX), vw - size.w - 16),
      y: Math.max(Math.min(anchorY, vh - size.h - 16), 8),
    });
  }, [anchorX, anchorY, size.w, size.h]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const applyNow = useCallback(
    (value: string) => {
      onChange(elementId, value);
      setStatus("synced");
    },
    [elementId, onChange],
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      setSource(value);
      setStatus("syncing");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        applyNow(value);
      }, 250);
    },
    [applyNow],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onHeaderMouseDown = (event: React.MouseEvent) => {
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      ox: pos.x,
      oy: pos.y,
    };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setPos({
        x: dragRef.current.ox + ev.clientX - dragRef.current.startX,
        y: dragRef.current.oy + ev.clientY - dragRef.current.startY,
      });
    };
    const up = () => {
      dragRef.current.dragging = false;
      window.removeEventListener("mousemove", move);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up, { once: true });
  };

  const statusKey =
    status === "syncing"
      ? "construct.floatingEditor.sync.syncing"
      : status === "synced"
        ? "construct.floatingEditor.sync.synced"
        : "construct.floatingEditor.sync.idle";

  return (
    <div
      className="lc-floating-code-editor"
      style={{ left: pos.x, top: pos.y, width: size.w }}
      role="dialog"
      aria-label={t("construct.floatingEditor.aria", { name: elementName })}
    >
      <div className="lc-floating-code-editor__header" onMouseDown={onHeaderMouseDown}>
        <div className="lc-floating-code-editor__title">
          <span>{elementName}.tsx</span>
        </div>
        <button
          type="button"
          className="lc-floating-code-editor__resize-toggle"
          onClick={() => setSize((s) => ({ ...s, h: s.h === 280 ? 420 : 280 }))}
          title={t("construct.floatingEditor.toggleHeight")}
        >
          {size.h === 280 ? "⬆" : "⬇"}
        </button>
        <button
          type="button"
          className="lc-floating-code-editor__close"
          onClick={onClose}
          aria-label={t("construct.floatingEditor.close")}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="lc-floating-code-editor__body" style={{ height: size.h }}>
        <ConstructMonacoEditor
          value={source}
          onChange={handleSourceChange}
          height={size.h}
          documentId={`floating-${elementId}`}
          enableLsp={false}
          languageInput={{ visualKind, filename: `${elementName}.tsx` }}
        />
      </div>

      <div className="lc-floating-code-editor__footer">
        <div className="lc-floating-code-editor__status">
          <span className={`lc-floating-code-editor__status-dot lc-floating-code-editor__status-dot--${status}`} />
          <span>{t(statusKey)}</span>
        </div>
        <div className="lc-floating-code-editor__actions">
          <span className="lc-floating-code-editor__hint">{t("construct.floatingEditor.applyHint")}</span>
          <button type="button" className="lc-floating-code-editor__apply" onClick={() => applyNow(source)}>
            {t("construct.floatingEditor.apply")}
          </button>
        </div>
      </div>

      <div
        className="lc-floating-code-editor__resize-handle"
        onMouseDown={(event) => {
          event.stopPropagation();
          const startX = event.clientX;
          const startY = event.clientY;
          const startW = size.w;
          const startH = size.h;
          const move = (ev: MouseEvent) => {
            setSize({
              w: Math.max(260, startW + ev.clientX - startX),
              h: Math.max(200, startH + ev.clientY - startY),
            });
          };
          const up = () => window.removeEventListener("mousemove", move);
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up, { once: true });
        }}
        aria-hidden
      />
    </div>
  );
}
