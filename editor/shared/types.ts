export interface CategoryItem {
  id: string;
  label: string;
}

export interface CategoryCreateInput {
  groupId: string;
  id: string;
  label: string;
}

export interface CategoryUpdateInput {
  groupId: string;
  categoryId: string;
  nextId: string;
  nextLabel: string;
}

export interface CategoryDeleteInput {
  groupId: string;
  categoryId: string;
}

export interface CategoryGroup {
  id: string;
  label: string;
  default_open?: boolean;
  items: CategoryItem[];
}

export interface PostFrontMatter {
  title: string;
  description: string;
  categories: string[];
  tags: string[];
}

export interface PostSummary {
  filePath: string;
  fileName: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  date: string;
  updatedAt: string;
}

export interface PostSeriesItem {
  title: string;
  url?: string;
  date: string;
  isCurrent: boolean;
}

export interface PostDocument {
  filePath: string;
  fileName: string;
  frontMatter: PostFrontMatter;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftInput {
  filePath?: string;
  title: string;
  description?: string;
  categories: string[];
  tags?: string[];
  body: string;
  date?: string;
}

export interface UpdateInput {
  filePath: string;
  frontMatter: PostFrontMatter;
  body: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface TagRule {
  match: string[];
  tags: string[];
}

export interface TagMapConfig {
  categoryDefaults: Record<string, string[]>;
  keywordRules: TagRule[];
}

export interface GitChangedFile {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
}

export interface GitStatus {
  isGitRepo: boolean;
  currentBranch: string;
  changedFiles: GitChangedFile[];
  message?: string;
}

export interface GitCommitPushInput {
  files: string[];
  message: string;
}

export interface GitPushResult {
  branch: string;
  commitHash: string;
  pushed: boolean;
  createdBranch: boolean;
}

export interface EditorApi {
  getCategories: () => Promise<CategoryGroup[]>;
  createCategory: (input: CategoryCreateInput) => Promise<CategoryGroup[]>;
  updateCategory: (input: CategoryUpdateInput) => Promise<CategoryGroup[]>;
  deleteCategory: (input: CategoryDeleteInput) => Promise<CategoryGroup[]>;
  listPosts: (categoryId?: string) => Promise<PostSummary[]>;
  readPost: (filePath: string) => Promise<PostDocument>;
  createPost: (input: DraftInput) => Promise<PostDocument>;
  updatePost: (input: UpdateInput) => Promise<PostDocument>;
  deletePost: (filePath: string) => Promise<{ trashedPath: string }>;
  validateDraft: (input: DraftInput) => ValidationResult;
  gitStatus: () => Promise<GitStatus>;
  gitCommitPush: (input: GitCommitPushInput) => Promise<GitPushResult>;
  getBlogCss: () => Promise<string>;
}
