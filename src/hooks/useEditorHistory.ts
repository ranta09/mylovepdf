import { useState, useCallback, useEffect } from "react";
import type { EditorState } from "@/lib/pdfEditorUtils";
import type { TextBlock } from "@/lib/pdfTextExtractor";

const MAX_HISTORY = 20;

function cloneState(s: EditorState): EditorState {
  return JSON.parse(JSON.stringify(s));
}

export interface EditorHistoryAPI {
  state: EditorState;
  setState: React.Dispatch<React.SetStateAction<EditorState>>;
  pushState: (next: EditorState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  textBlocksPerPage: TextBlock[][];
  setTextBlocksPerPage: React.Dispatch<React.SetStateAction<TextBlock[][]>>;
  pushTextEdit: () => void;
  resetHistory: () => void;
}

export function useEditorHistory(): EditorHistoryAPI {
  const [state, setState] = useState<EditorState>({ pages: [], pageOrder: [] });
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  const [textBlocksPerPage, setTextBlocksPerPage] = useState<TextBlock[][]>([]);
  const [textHistory, setTextHistory] = useState<TextBlock[][][]>([]);
  const [textFuture, setTextFuture] = useState<TextBlock[][][]>([]);

  const pushState = useCallback(
    (next: EditorState) => {
      setHistory((h) => [...h.slice(-MAX_HISTORY + 1), cloneState(state)]);
      setFuture([]);
      setState(next);
    },
    [state]
  );

  const pushTextEdit = useCallback(() => {
    setTextHistory((h) => [
      ...h.slice(-MAX_HISTORY + 1),
      JSON.parse(JSON.stringify(textBlocksPerPage)),
    ]);
    setTextFuture([]);
  }, [textBlocksPerPage]);

  const undo = useCallback(() => {
    // Text history takes priority
    if (textHistory.length > 0) {
      setTextFuture((f) => [
        JSON.parse(JSON.stringify(textBlocksPerPage)),
        ...f.slice(0, MAX_HISTORY - 1),
      ]);
      setTextBlocksPerPage(textHistory[textHistory.length - 1]);
      setTextHistory((h) => h.slice(0, -1));
      return;
    }
    if (!history.length) return;
    setFuture((f) => [cloneState(state), ...f]);
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [textHistory, textBlocksPerPage, history, state]);

  const redo = useCallback(() => {
    if (textFuture.length > 0) {
      setTextHistory((h) => [
        ...h,
        JSON.parse(JSON.stringify(textBlocksPerPage)),
      ]);
      setTextBlocksPerPage(textFuture[0]);
      setTextFuture((f) => f.slice(1));
      return;
    }
    if (!future.length) return;
    setHistory((h) => [...h, cloneState(state)]);
    setState(future[0]);
    setFuture((f) => f.slice(1));
  }, [textFuture, textBlocksPerPage, future, state]);

  const resetHistory = useCallback(() => {
    setHistory([]);
    setFuture([]);
    setTextHistory([]);
    setTextFuture([]);
  }, []);

  // Keyboard bindings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return {
    state,
    setState,
    pushState,
    undo,
    redo,
    canUndo: history.length > 0 || textHistory.length > 0,
    canRedo: future.length > 0 || textFuture.length > 0,
    textBlocksPerPage,
    setTextBlocksPerPage,
    pushTextEdit,
    resetHistory,
  };
}
