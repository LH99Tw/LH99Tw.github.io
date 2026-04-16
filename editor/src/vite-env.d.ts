/// <reference types="vite/client" />

import type { EditorApi } from "../shared/types";

declare global {
  interface Window {
    editorApi: EditorApi & {
      workspaceRoot: () => Promise<string>;
    };
  }
}

export {};
