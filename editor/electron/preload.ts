import { contextBridge, ipcRenderer } from "electron";
import type {
  CategoryCreateInput,
  CategoryDeleteInput,
  CategoryUpdateInput,
  DraftInput,
  EditorApi,
  GitCommitPushInput,
  UpdateInput
} from "../shared/types";

const api: EditorApi & { workspaceRoot: () => Promise<string> } = {
  getCategories: () => ipcRenderer.invoke("editor:get-categories"),
  createCategory: (input: CategoryCreateInput) => ipcRenderer.invoke("editor:create-category", input),
  updateCategory: (input: CategoryUpdateInput) => ipcRenderer.invoke("editor:update-category", input),
  deleteCategory: (input: CategoryDeleteInput) => ipcRenderer.invoke("editor:delete-category", input),
  listPosts: (categoryId?: string) => ipcRenderer.invoke("editor:list-posts", categoryId),
  readPost: (filePath: string) => ipcRenderer.invoke("editor:read-post", filePath),
  createPost: (input: DraftInput) => ipcRenderer.invoke("editor:create-post", input),
  updatePost: (input: UpdateInput) => ipcRenderer.invoke("editor:update-post", input),
  deletePost: (filePath: string) => ipcRenderer.invoke("editor:delete-post", filePath),
  validateDraft: (input: DraftInput) => ipcRenderer.sendSync("editor:validate-draft", input),
  gitStatus: () => ipcRenderer.invoke("editor:git-status"),
  gitCommitPush: (input: GitCommitPushInput) => ipcRenderer.invoke("editor:git-commit-push", input),
  getBlogCss: () => ipcRenderer.invoke("editor:get-blog-css"),
  workspaceRoot: () => ipcRenderer.invoke("editor:workspace-root")
};

contextBridge.exposeInMainWorld("editorApi", api);
