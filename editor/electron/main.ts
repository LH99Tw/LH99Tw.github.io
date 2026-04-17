import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { BlogService } from "./services/blog-service";
import { GitService } from "./services/git-service";
import type {
  CategoryCreateInput,
  CategoryDeleteInput,
  CategoryUpdateInput,
  DraftInput,
  GitCommitPushInput,
  UpdateInput
} from "../shared/types";

const isDev = !app.isPackaged;

interface WorkspaceContext {
  root: string;
  blogService: BlogService;
  gitService: GitService;
}

let workspaceContext: WorkspaceContext | null = null;

function hasWorkspaceMarkers(candidate: string): boolean {
  const root = path.resolve(candidate);
  return (
    fs.existsSync(path.join(root, "_posts")) &&
    fs.existsSync(path.join(root, "_data")) &&
    fs.existsSync(path.join(root, "_data", "sidebar_categories.yml"))
  );
}

function collectParentCandidates(startPath: string | undefined): string[] {
  if (!startPath) return [];

  const candidates: string[] = [];
  let current = path.resolve(startPath);

  try {
    if (fs.existsSync(current) && fs.statSync(current).isFile()) {
      current = path.dirname(current);
    }
  } catch {
    current = path.dirname(current);
  }

  while (true) {
    candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return candidates;
}

function getWorkspaceStorePath(): string {
  return path.join(app.getPath("userData"), "workspace.json");
}

async function readSavedWorkspaceRoot(): Promise<string | null> {
  try {
    const raw = await fsp.readFile(getWorkspaceStorePath(), "utf8");
    const parsed = JSON.parse(raw) as { workspaceRoot?: string };
    return typeof parsed.workspaceRoot === "string" ? parsed.workspaceRoot : null;
  } catch {
    return null;
  }
}

async function writeSavedWorkspaceRoot(root: string): Promise<void> {
  const payload = JSON.stringify({ workspaceRoot: path.resolve(root) }, null, 2);
  await fsp.mkdir(app.getPath("userData"), { recursive: true });
  await fsp.writeFile(getWorkspaceStorePath(), payload, "utf8");
}

async function promptWorkspaceRootSelection(): Promise<string | null> {
  while (true) {
    const selected = await dialog.showOpenDialog({
      title: "블로그 프로젝트 루트 폴더를 선택하세요",
      buttonLabel: "선택",
      properties: ["openDirectory", "createDirectory", "dontAddToRecent"]
    });

    if (selected.canceled || selected.filePaths.length === 0) {
      return null;
    }

    const picked = selected.filePaths[0];
    if (hasWorkspaceMarkers(picked)) {
      return path.resolve(picked);
    }

    dialog.showErrorBox(
      "잘못된 폴더",
      "선택한 폴더에 _posts 와 _data/sidebar_categories.yml 이 없습니다.\n블로그 프로젝트 루트를 다시 선택해주세요."
    );
  }
}

async function resolveWorkspaceRoot(): Promise<string> {
  const envRoot = process.env.BLOG_WORKSPACE_ROOT;
  const savedRoot = await readSavedWorkspaceRoot();
  const candidates = [
    envRoot,
    savedRoot,
    ...collectParentCandidates(process.cwd()),
    ...collectParentCandidates(process.execPath),
    ...collectParentCandidates(app.getAppPath()),
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(app.getPath("home"), "Desktop"),
    path.resolve(app.getPath("home"), "Documents")
  ]
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate as string));

  for (const candidate of candidates) {
    if (hasWorkspaceMarkers(candidate)) {
      return candidate;
    }
  }

  const selectedRoot = await promptWorkspaceRootSelection();
  if (!selectedRoot) {
    throw new Error("블로그 프로젝트 루트를 선택하지 않아 에디터를 초기화할 수 없습니다.");
  }
  return selectedRoot;
}

async function ensureWorkspaceContext(forceSelection = false): Promise<WorkspaceContext> {
  if (!forceSelection && workspaceContext && hasWorkspaceMarkers(workspaceContext.root)) {
    return workspaceContext;
  }

  const root = forceSelection ? await promptWorkspaceRootSelection() : await resolveWorkspaceRoot();
  if (!root) {
    throw new Error("블로그 프로젝트 루트를 선택하지 않아 에디터를 초기화할 수 없습니다.");
  }

  const normalized = path.resolve(root);
  workspaceContext = {
    root: normalized,
    blogService: new BlogService(normalized),
    gitService: new GitService(normalized)
  };
  await writeSavedWorkspaceRoot(normalized);
  return workspaceContext;
}

async function withBlogService<T>(run: (service: BlogService, root: string) => Promise<T>): Promise<T> {
  const context = await ensureWorkspaceContext();
  return run(context.blogService, context.root);
}

async function withGitService<T>(run: (service: GitService, root: string) => Promise<T>): Promise<T> {
  const context = await ensureWorkspaceContext();
  return run(context.gitService, context.root);
}

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
  ipcMain.handle("editor:get-categories", async () => withBlogService((service) => service.getCategories()));

  ipcMain.handle("editor:create-category", async (_event, input: CategoryCreateInput) =>
    withBlogService((service) => service.createCategory(input))
  );

  ipcMain.handle("editor:update-category", async (_event, input: CategoryUpdateInput) =>
    withBlogService((service) => service.updateCategory(input))
  );

  ipcMain.handle("editor:delete-category", async (_event, input: CategoryDeleteInput) =>
    withBlogService((service) => service.deleteCategory(input))
  );

  ipcMain.handle("editor:list-posts", async (_event, categoryId?: string) =>
    withBlogService((service) => service.listPosts(categoryId))
  );

  ipcMain.handle("editor:read-post", async (_event, filePath: string) =>
    withBlogService((service) => service.readPost(filePath))
  );

  ipcMain.handle("editor:create-post", async (_event, input: DraftInput) =>
    withBlogService((service) => service.createPost(input))
  );

  ipcMain.handle("editor:update-post", async (_event, input: UpdateInput) =>
    withBlogService((service) => service.updatePost(input))
  );

  ipcMain.handle("editor:delete-post", async (_event, filePath: string) =>
    withBlogService((service) => service.deletePost(filePath))
  );

  ipcMain.on("editor:validate-draft", (event, input: DraftInput) => {
    if (!workspaceContext) {
      event.returnValue = { errors: ["워크스페이스가 초기화되지 않았습니다."], warnings: [] };
      return;
    }
    event.returnValue = workspaceContext.blogService.validateDraft(input);
  });

  ipcMain.handle("editor:git-status", async () => withGitService((service) => service.status()));

  ipcMain.handle("editor:git-commit-push", async (_event, input: GitCommitPushInput) =>
    withGitService((service) => service.commitPush(input))
  );

  ipcMain.handle("editor:workspace-root", async () => {
    const context = await ensureWorkspaceContext();
    return context.root;
  });

  ipcMain.handle("editor:select-workspace-root", async () => {
    const context = await ensureWorkspaceContext(true);
    return context.root;
  });

  ipcMain.handle("editor:get-blog-css", async () =>
    withBlogService(async (_service, root) => {
      const cssPath = path.join(root, "assets", "css", "style.css");
      return fsp.readFile(cssPath, "utf8");
    })
  );

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
