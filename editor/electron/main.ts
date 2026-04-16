import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { BlogService } from "./services/blog-service";
import { GitService } from "./services/git-service";
import type { DraftInput, GitCommitPushInput, UpdateInput } from "../shared/types";

const isDev = !app.isPackaged;

function resolveWorkspaceRoot(): string {
  const envRoot = process.env.BLOG_WORKSPACE_ROOT;
  const candidates = [
    envRoot,
    path.resolve(process.cwd(), ".."),
    process.cwd(),
    path.resolve(app.getAppPath(), "..", "..")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "_posts")) && fs.existsSync(path.join(candidate, "_data"))) {
      return path.resolve(candidate);
    }
  }

  return path.resolve(process.cwd(), "..");
}

const workspaceRoot = resolveWorkspaceRoot();
const blogService = new BlogService(workspaceRoot);
const gitService = new GitService(workspaceRoot);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1240,
    minHeight: 760,
    backgroundColor: "#ffffff",
    title: "LH99Tw Editor",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("editor:get-categories", async () => blogService.getCategories());

  ipcMain.handle("editor:list-posts", async (_event, categoryId?: string) => blogService.listPosts(categoryId));

  ipcMain.handle("editor:read-post", async (_event, filePath: string) => blogService.readPost(filePath));

  ipcMain.handle("editor:create-post", async (_event, input: DraftInput) => blogService.createPost(input));

  ipcMain.handle("editor:update-post", async (_event, input: UpdateInput) => blogService.updatePost(input));

  ipcMain.handle("editor:delete-post", async (_event, filePath: string) => blogService.deletePost(filePath));

  ipcMain.on("editor:validate-draft", (event, input: DraftInput) => {
    event.returnValue = blogService.validateDraft(input);
  });

  ipcMain.handle("editor:git-status", async () => gitService.status());

  ipcMain.handle("editor:git-commit-push", async (_event, input: GitCommitPushInput) => gitService.commitPush(input));

  ipcMain.handle("editor:workspace-root", async () => workspaceRoot);

  ipcMain.handle("editor:get-blog-css", async () => {
    const cssPath = path.join(workspaceRoot, "assets", "css", "style.css");
    return fsp.readFile(cssPath, "utf8");
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  dialog.showErrorBox("Editor Error", `${error.name}: ${error.message}`);
});
