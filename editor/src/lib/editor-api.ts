import type {
  CategoryGroup,
  DraftInput,
  EditorApi,
  GitCommitPushInput,
  GitPushResult,
  GitStatus,
  PostDocument,
  PostSummary,
  UpdateInput,
  ValidationResult
} from "../../shared/types";

const MOCK_STORAGE_KEY = "lh99-editor-mock-posts";

const mockCategories: CategoryGroup[] = [
  {
    id: "programming",
    label: "Programming",
    default_open: true,
    items: [
      { id: "cs", label: "CS" },
      { id: "javascript", label: "JavaScript" },
      { id: "project", label: "Project" }
    ]
  },
  {
    id: "journal",
    label: "Journal",
    items: [
      { id: "daily", label: "Daily" },
      { id: "routine", label: "Routine" }
    ]
  }
];

const nowIso = () => new Date().toISOString();

const defaultMockPosts: PostDocument[] = [
  {
    filePath: "_posts/2026-04-16-sample-note.md",
    fileName: "2026-04-16-sample-note.md",
    frontMatter: {
      title: "무제 2",
      description: "로컬 브라우저 미리보기용 샘플 문서입니다.",
      categories: ["cs"],
      tags: ["sample", "editor"]
    },
    body: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

function loadMockPosts(): PostDocument[] {
  if (typeof window === "undefined") {
    return defaultMockPosts;
  }

  const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
  if (!raw) {
    return defaultMockPosts;
  }

  try {
    return JSON.parse(raw) as PostDocument[];
  } catch {
    return defaultMockPosts;
  }
}

function saveMockPosts(posts: PostDocument[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(posts));
}

function toSummary(post: PostDocument): PostSummary {
  return {
    filePath: post.filePath,
    fileName: post.fileName,
    title: post.frontMatter.title,
    description: post.frontMatter.description,
    categories: post.frontMatter.categories,
    tags: post.frontMatter.tags,
    date: post.fileName.slice(0, 10),
    updatedAt: post.updatedAt
  };
}

function validateDraft(input: DraftInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.title.trim().length < 2) {
    errors.push("title: 제목을 입력하세요.");
  }
  if (input.categories.length === 0) {
    errors.push("categories: 카테고리를 선택하세요.");
  }
  if ((input.tags ?? []).length === 0) {
    warnings.push("tags: 태그를 한 개 이상 넣는 편이 좋습니다.");
  }

  return { errors, warnings };
}

function createMockApi(): EditorApi & { workspaceRoot: () => Promise<string> } {
  let posts = loadMockPosts();

  return {
    getCategories: async () => mockCategories,
    listPosts: async () => posts.map(toSummary),
    readPost: async (filePath: string) => {
      const found = posts.find((post) => post.filePath === filePath);
      if (!found) {
        throw new Error("문서를 찾을 수 없습니다.");
      }
      return found;
    },
    createPost: async (input: DraftInput) => {
      const fileName = `${new Date().toISOString().slice(0, 10)}-${Date.now()}.md`;
      const next: PostDocument = {
        filePath: `_posts/${fileName}`,
        fileName,
        frontMatter: {
          title: input.title,
          description: input.description ?? "",
          categories: input.categories,
          tags: input.tags ?? []
        },
        body: input.body,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      posts = [next, ...posts];
      saveMockPosts(posts);
      return next;
    },
    updatePost: async (input: UpdateInput) => {
      posts = posts.map((post) =>
        post.filePath === input.filePath
          ? {
              ...post,
              frontMatter: input.frontMatter,
              body: input.body,
              updatedAt: nowIso()
            }
          : post
      );
      saveMockPosts(posts);
      const found = posts.find((post) => post.filePath === input.filePath);
      if (!found) {
        throw new Error("문서를 찾을 수 없습니다.");
      }
      return found;
    },
    deletePost: async (filePath: string) => {
      posts = posts.filter((post) => post.filePath !== filePath);
      saveMockPosts(posts);
      return { trashedPath: `_posts/.trash/${filePath.split("/").pop() ?? "post.md"}` };
    },
    validateDraft,
    gitStatus: async (): Promise<GitStatus> => ({
      isGitRepo: true,
      currentBranch: "mock-preview",
      changedFiles: [],
      message: "브라우저 미리보기 모드입니다."
    }),
    gitCommitPush: async (_input: GitCommitPushInput): Promise<GitPushResult> => ({
      branch: "mock-preview",
      commitHash: "preview",
      pushed: true,
      createdBranch: false
    }),
    getBlogCss: async () => "",
    workspaceRoot: async () => "/mock/editor-preview"
  };
}

export const editorApi: EditorApi & { workspaceRoot: () => Promise<string> } =
  typeof window !== "undefined" && window.editorApi ? window.editorApi : createMockApi();
