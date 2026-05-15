import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import {
  buildFrontMatter,
  buildPostFileName,
  formatDate,
  serializeFrontMatter,
  validateFrontMatter
} from "../../shared/editor-utils";
import type {
  CategoryCreateInput,
  CategoryDeleteInput,
  CategoryGroup,
  CategoryItem,
  CategoryUpdateInput,
  DraftInput,
  PostDocument,
  PostSummary,
  UpdateInput,
  ValidationResult
} from "../../shared/types";

function ensureInsideWorkspace(workspaceRoot: string, targetPath: string): string {
  const normalizedRoot = path.resolve(workspaceRoot);
  const normalizedTarget = path.resolve(targetPath);

  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error("허용되지 않은 파일 경로입니다.");
  }

  return normalizedTarget;
}

function toRelative(workspaceRoot: string, absolutePath: string): string {
  return path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
}

export class BlogService {
  private readonly workspaceRoot: string;
  private readonly postsDir: string;
  private readonly categoriesDir: string;
  private readonly categoryDataFile: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.postsDir = path.join(this.workspaceRoot, "_posts");
    this.categoriesDir = path.join(this.workspaceRoot, "categories");
    this.categoryDataFile = path.join(this.workspaceRoot, "_data", "sidebar_categories.yml");
  }

  async getCategories(): Promise<CategoryGroup[]> {
    return this.readCategoriesFile();
  }

  async createCategory(input: CategoryCreateInput): Promise<CategoryGroup[]> {
    const categories = await this.readCategoriesFile();
    const group = categories.find((item) => item.id === input.groupId);
    const normalizedId = normalizeCategoryId(input.id);
    const normalizedLabel = input.label.trim();

    if (!group) {
      throw new Error("대상 그룹을 찾을 수 없습니다.");
    }
    if (!normalizedLabel) {
      throw new Error("카테고리 이름을 입력하세요.");
    }
    if (!normalizedId) {
      throw new Error("카테고리 ID를 입력하세요.");
    }
    if (categories.some((categoryGroup) => categoryGroup.items.some((item) => item.id === normalizedId))) {
      throw new Error("이미 존재하는 카테고리 ID입니다.");
    }

    group.items.push({ id: normalizedId, label: normalizedLabel });
    group.items.sort((a, b) => a.label.localeCompare(b.label, "ko"));

    await this.ensureCategoryPage(group, { id: normalizedId, label: normalizedLabel });
    await this.writeCategoriesFile(categories);
    return categories;
  }

  async updateCategory(input: CategoryUpdateInput): Promise<CategoryGroup[]> {
    const categories = await this.readCategoriesFile();
    const group = categories.find((item) => item.id === input.groupId);
    const target = group?.items.find((item) => item.id === input.categoryId);
    const nextId = normalizeCategoryId(input.nextId);
    const nextLabel = input.nextLabel.trim();

    if (!group || !target) {
      throw new Error("수정할 카테고리를 찾을 수 없습니다.");
    }
    if (!nextLabel) {
      throw new Error("카테고리 이름을 입력하세요.");
    }
    if (!nextId) {
      throw new Error("카테고리 ID를 입력하세요.");
    }
    if (
      nextId !== input.categoryId &&
      categories.some((categoryGroup) => categoryGroup.items.some((item) => item.id === nextId))
    ) {
      throw new Error("이미 존재하는 카테고리 ID입니다.");
    }

    target.id = nextId;
    target.label = nextLabel;
    group.items.sort((a, b) => a.label.localeCompare(b.label, "ko"));

    if (nextId !== input.categoryId) {
      await this.replaceCategoryIdInPosts(input.categoryId, nextId);
      await this.renameCategoryPage(input.categoryId, nextId);
    }

    await this.ensureCategoryPage(group, target);
    await this.writeCategoriesFile(categories);
    return categories;
  }

  async deleteCategory(input: CategoryDeleteInput): Promise<CategoryGroup[]> {
    const categories = await this.readCategoriesFile();
    const group = categories.find((item) => item.id === input.groupId);

    if (!group) {
      throw new Error("대상 그룹을 찾을 수 없습니다.");
    }

    const usageCount = await this.countPostsForCategory(input.categoryId);
    if (usageCount > 0) {
      throw new Error(`이 카테고리를 사용하는 글 ${usageCount}개가 있어 삭제할 수 없습니다.`);
    }

    const nextItems = group.items.filter((item) => item.id !== input.categoryId);
    if (nextItems.length === group.items.length) {
      throw new Error("삭제할 카테고리를 찾을 수 없습니다.");
    }

    group.items = nextItems;
    await this.trashCategoryPage(input.categoryId);
    await this.writeCategoriesFile(categories);
    return categories;
  }

  async listPosts(categoryId?: string): Promise<PostSummary[]> {
    const entries = await fs.readdir(this.postsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, "en"));

    const summaries = await Promise.all(
      files.map(async (name) => {
        const absolutePath = path.join(this.postsDir, name);
        const content = await fs.readFile(absolutePath, "utf8");
        const stats = await fs.stat(absolutePath);
        const parsed = matter(content);
        const data = parsed.data as Record<string, unknown>;
        const categories = Array.isArray(data.categories) ? (data.categories as string[]) : [];
        const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];

        const filePath = toRelative(this.workspaceRoot, absolutePath);
        const datePrefix = name.slice(0, 10);

        return {
          filePath,
          fileName: name,
          title: typeof data.title === "string" ? data.title : "제목 없음",
          description: typeof data.description === "string" ? data.description : "",
          categories,
          tags,
          date: /^\d{4}-\d{2}-\d{2}$/.test(datePrefix) ? datePrefix : stats.birthtime.toISOString().slice(0, 10),
          updatedAt: stats.mtime.toISOString()
        } satisfies PostSummary;
      })
    );

    return summaries.filter((post) => !categoryId || post.categories.includes(categoryId));
  }

  async readPost(filePath: string): Promise<PostDocument> {
    const absolutePath = ensureInsideWorkspace(this.workspaceRoot, path.join(this.workspaceRoot, filePath));
    const content = await fs.readFile(absolutePath, "utf8");
    const stats = await fs.stat(absolutePath);
    const parsed = matter(content);

    return {
      filePath: toRelative(this.workspaceRoot, absolutePath),
      fileName: path.basename(absolutePath),
      frontMatter: {
        title: String(parsed.data.title ?? ""),
        description: String(parsed.data.description ?? ""),
        categories: Array.isArray(parsed.data.categories) ? (parsed.data.categories as string[]) : [],
        tags: Array.isArray(parsed.data.tags) ? (parsed.data.tags as string[]) : []
      },
      body: parsed.content,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString()
    };
  }

  validateDraft(input: DraftInput): ValidationResult {
    const frontMatter = buildFrontMatter(input);
    return validateFrontMatter(frontMatter);
  }

  async createPost(input: DraftInput): Promise<PostDocument> {
    const frontMatter = buildFrontMatter(input);
    const validation = validateFrontMatter(frontMatter);

    if (validation.errors.length > 0) {
      throw new Error(`저장 실패: ${validation.errors.join(" | ")}`);
    }

    await fs.mkdir(this.postsDir, { recursive: true });

    const requestedDate = input.date?.trim();
    const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : formatDate();

    const baseFileName = buildPostFileName(frontMatter.title, date).replace(/\.md$/, "");
    let fileName = `${baseFileName}.md`;
    let absolutePath = path.join(this.postsDir, fileName);
    let sequence = 2;

    while (await exists(absolutePath)) {
      fileName = `${baseFileName}-${sequence}.md`;
      absolutePath = path.join(this.postsDir, fileName);
      sequence += 1;
    }

    const source = serializeFrontMatter(frontMatter, input.body);
    await fs.writeFile(absolutePath, source, "utf8");

    return this.readPost(toRelative(this.workspaceRoot, absolutePath));
  }

  async updatePost(input: UpdateInput): Promise<PostDocument> {
    const absolutePath = ensureInsideWorkspace(this.workspaceRoot, path.join(this.workspaceRoot, input.filePath));
    const mappedFrontMatter = buildFrontMatter(
      {
        title: input.frontMatter.title,
        description: input.frontMatter.description,
        categories: input.frontMatter.categories,
        tags: input.frontMatter.tags,
        body: input.body
      }
    );
    const validation = validateFrontMatter(mappedFrontMatter);

    if (validation.errors.length > 0) {
      throw new Error(`저장 실패: ${validation.errors.join(" | ")}`);
    }

    const source = serializeFrontMatter(mappedFrontMatter, input.body);
    await fs.writeFile(absolutePath, source, "utf8");

    return this.readPost(input.filePath);
  }

  async deletePost(filePath: string): Promise<{ trashedPath: string }> {
    const absolutePath = ensureInsideWorkspace(this.workspaceRoot, path.join(this.workspaceRoot, filePath));
    const trashDir = path.join(this.postsDir, ".trash");
    await fs.mkdir(trashDir, { recursive: true });

    const trashedName = `${Date.now()}-${path.basename(absolutePath)}`;
    const target = path.join(trashDir, trashedName);

    await fs.rename(absolutePath, target);

    return { trashedPath: toRelative(this.workspaceRoot, target) };
  }

  private async readCategoriesFile(): Promise<CategoryGroup[]> {
    const raw = await fs.readFile(this.categoryDataFile, "utf8");
    const parsed = yaml.load(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("카테고리 설정 파일 형식이 올바르지 않습니다.");
    }

    return parsed as CategoryGroup[];
  }

  private async writeCategoriesFile(categories: CategoryGroup[]): Promise<void> {
    const nextYaml = yaml.dump(categories, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });
    await fs.writeFile(this.categoryDataFile, nextYaml, "utf8");
  }

  private async ensureCategoryPage(group: CategoryGroup, item: CategoryItem): Promise<void> {
    const categoryDir = path.join(this.categoriesDir, item.id);
    const pagePath = path.join(categoryDir, "index.md");
    await fs.mkdir(categoryDir, { recursive: true });

    const source = [
      "---",
      `title: "${escapeYamlString(item.label)}"`,
      `description: "${escapeYamlString(`${item.label} 카테고리의 글을 정리합니다.`)}"`,
      "layout: default",
      `category: ${item.id}`,
      `category_group: ${group.id}`,
      "category_board: true",
      "hide_topbar: true",
      "seo:",
      "  type: webpage",
      "---",
      "",
      "{% include category-board.html %}",
      ""
    ].join("\n");

    if (!(await exists(pagePath))) {
      await fs.writeFile(pagePath, source, "utf8");
      return;
    }

    const current = await fs.readFile(pagePath, "utf8");
    const parsed = matter(current);
    const data = parsed.data as Record<string, unknown>;
    data.title = item.label;
    data.layout = "default";
    data.category = item.id;
    data.category_group = group.id;
    data.category_board = true;
    data.hide_topbar = true;
    data.seo = typeof data.seo === "object" && data.seo !== null ? data.seo : { type: "webpage" };

    const body = parsed.content.trim() || "{% include category-board.html %}";
    await fs.writeFile(pagePath, matter.stringify(`${body}\n`, data), "utf8");
  }

  private async renameCategoryPage(previousId: string, nextId: string): Promise<void> {
    const previousDir = path.join(this.categoriesDir, previousId);
    const nextDir = path.join(this.categoriesDir, nextId);

    if (!(await exists(previousDir)) || (await exists(nextDir))) {
      return;
    }

    await fs.mkdir(this.categoriesDir, { recursive: true });
    await fs.rename(previousDir, nextDir);
  }

  private async trashCategoryPage(categoryId: string): Promise<void> {
    const categoryDir = path.join(this.categoriesDir, categoryId);
    if (!(await exists(categoryDir))) {
      return;
    }

    const trashDir = path.join(this.categoriesDir, ".trash");
    await fs.mkdir(trashDir, { recursive: true });
    await fs.rename(categoryDir, path.join(trashDir, `${Date.now()}-${categoryId}`));
  }

  private async countPostsForCategory(categoryId: string): Promise<number> {
    const posts = await this.listPosts(categoryId);
    return posts.length;
  }

  private async replaceCategoryIdInPosts(previousId: string, nextId: string): Promise<void> {
    const entries = await fs.readdir(this.postsDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

    await Promise.all(
      files.map(async (entry) => {
        const absolutePath = path.join(this.postsDir, entry.name);
        const content = await fs.readFile(absolutePath, "utf8");
        const parsed = matter(content);
        const data = parsed.data as Record<string, unknown>;
        const categories = Array.isArray(data.categories) ? [...(data.categories as string[])] : [];

        if (!categories.includes(previousId)) {
          return;
        }

        data.categories = categories.map((category) => (category === previousId ? nextId : category));
        const nextSource = matter.stringify(parsed.content, data);
        await fs.writeFile(absolutePath, nextSource, "utf8");
      })
    );
  }
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeCategoryId(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

function escapeYamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
