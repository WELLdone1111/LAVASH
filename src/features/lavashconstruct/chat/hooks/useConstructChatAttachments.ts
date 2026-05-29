import {
  useCallback,
  useRef,
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { captureArtboardPanelImage } from "@/features/lavashconstruct/artboard/model/captureArtboardPanel";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import {
  MAX_CHAT_IMAGES,
  MAX_PENDING_ATTACHMENTS,
  fileToPendingAttachment,
  type ChatAttachment,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

type UseConstructChatAttachmentsParams = {
  activeTabIdRef: RefObject<string>;
  setTabs: Dispatch<SetStateAction<ConstructChatTab[]>>;
};

export function useConstructChatAttachments({ activeTabIdRef, setTabs }: UseConstructChatAttachmentsParams) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const appendFilesFromList = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const loaded: ChatAttachment[] = [];
    for (const f of list) {
      const part = await fileToPendingAttachment(f);
      if (part) loaded.push(part);
    }
    if (loaded.length === 0) return;
    const tid = activeTabIdRef.current;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tid) return tab;
        const next = [...tab.pendingAttachments];
        let imageCount = next.filter((a) => a.kind === "image").length;
        for (const p of loaded) {
          if (next.length >= MAX_PENDING_ATTACHMENTS) break;
          if (p.kind === "image") {
            if (imageCount >= MAX_CHAT_IMAGES) continue;
            imageCount += 1;
          }
          next.push(p);
        }
        return { ...tab, pendingAttachments: next };
      }),
    );
  }, [activeTabIdRef, setTabs]);

  const removePendingAttachment = useCallback(
    (attId: string) => {
      const tid = activeTabIdRef.current;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id !== tid
            ? tab
            : { ...tab, pendingAttachments: tab.pendingAttachments.filter((a) => a.id !== attId) },
        ),
      );
    },
    [activeTabIdRef, setTabs],
  );

  const attachPanelCaptureToChat = useCallback(async (panelId: string): Promise<boolean> => {
    const panel = useConstructStore.getState().artboardPanels.find((p) => p.id === panelId);
    if (!panel) return false;
    const captured = await captureArtboardPanelImage(panelId);
    if (!captured) return false;
    const tid = activeTabIdRef.current;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tid) return tab;
        const next = [...tab.pendingAttachments];
        const imageCount = next.filter((a) => a.kind === "image").length;
        if (imageCount >= MAX_CHAT_IMAGES || next.length >= MAX_PENDING_ATTACHMENTS) return tab;
        next.push({
          ...captured,
          id: `cap-${crypto.randomUUID().slice(0, 10)}`,
        });
        return { ...tab, pendingAttachments: next };
      }),
    );
    return true;
  }, [activeTabIdRef, setTabs]);

  const onComposerPaste = useCallback(
    (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData?.files;
      if (!files?.length) return;
      e.preventDefault();
      void appendFilesFromList(files);
    },
    [appendFilesFromList],
  );

  const onFileInputChange = useCallback(
    (e: ReactChangeEvent<HTMLInputElement>) => {
      const f = e.target.files;
      if (f?.length) void appendFilesFromList(f);
      e.target.value = "";
    },
    [appendFilesFromList],
  );

  return {
    fileInputRef,
    appendFilesFromList,
    removePendingAttachment,
    attachPanelCaptureToChat,
    onComposerPaste,
    onFileInputChange,
  };
}
