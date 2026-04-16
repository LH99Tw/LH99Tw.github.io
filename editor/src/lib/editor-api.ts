import type {
  CategoryCreateInput,
  CategoryDeleteInput,
  CategoryGroup,
  CategoryUpdateInput,
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

const initialMockCategories: CategoryGroup[] = [
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
  let categories = structuredClone(initialMockCategories);
  let posts = loadMockPosts();

  return {
    getCategories: async () => categories,
    createCategory: async (input: CategoryCreateInput) => {
      const normalizedId = input.id.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      const group = categories.find((item) => item.id === input.groupId);

      if (!group) throw new Error("대상 그룹을 찾을 수 없습니다.");
      if (!input.label.trim()) throw new Error("카테고리 이름을 입력하세요.");
      if (!normalizedId) throw new Error("카테고리 ID를 입력하세요.");
      if (categories.some((categoryGroup) => categoryGroup.items.some((item) => item.id === normalizedId))) {
        throw new Error("이미 존재하는 카테고리 ID입니다.");
      }

      group.items = [...group.items, { id: normalizedId, label: input.label.trim() }];
      return categories;
    },
    updateCategory: async (input: CategoryUpdateInput) => {
      const normalizedId = input.nextId.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      const group = categories.find((item) => item.id === input.groupId);
      const target = group?.items.find((item) => item.id === input.categoryId);

      if (!group || !target) throw new Error("수정할 카테고리를 찾을 수 없습니다.");
      if (!input.nextLabel.trim()) throw new Error("카테고리 이름을 입력하세요.");
      if (!normalizedId) throw new Error("카테고리 ID를 입력하세요.");
      if (
        normalizedId !== input.categoryId &&
        categories.some((categoryGroup) => categoryGroup.items.some((item) => item.id === normalizedId))
      ) {
        throw new Error("이미 존재하는 카테고리 ID입니다.");
      }

      target.id = normalizedId;
      target.label = input.nextLabel.trim();
      posts = posts.map((post) => ({
        ...post,
        frontMatter: {
          ...post.frontMatter,
          categories: post.frontMatter.categories.map((category) => (category === input.categoryId ? normalizedId : category))
        }
      }));
      saveMockPosts(posts);
      return categories;
    },
    deleteCategory: async (input: CategoryDeleteInput) => {
      const usageCount = posts.filter((post) => post.frontMatter.categories.includes(input.categoryId)).length;
      if (usageCount > 0) {
        throw new Error(`이 카테고리를 사용하는 글 ${usageCount}개가 있어 삭제할 수 없습니다.`);
      }

      const group = categories.find((item) => item.id === input.groupId);
      if (!group) throw new Error("대상 그룹을 찾을 수 없습니다.");

      const nextItems = group.items.filter((item) => item.id !== input.categoryId);
      if (nextItems.length === group.items.length) {
        throw new Error("삭제할 카테고리를 찾을 수 없습니다.");
      }

      group.items = nextItems;
      return categories;
    },
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
