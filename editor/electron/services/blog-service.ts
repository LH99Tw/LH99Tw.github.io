import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import tagMap from "../../config/tag-map.json";
import {
  buildFrontMatter,
  buildPostFileName,
  formatDate,
  serializeFrontMatter,
  validateFrontMatter
} from "../../shared/editor-utils";
import type {
  CategoryGroup,
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
  private readonly categoryDataFile: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.postsDir = path.join(this.workspaceRoot, "_posts");
    this.categoryDataFile = path.join(this.workspaceRoot, "_data", "sidebar_categories.yml");
  }

  async getCategories(): Promise<CategoryGroup[]> {
    const raw = await fs.readFile(this.categoryDataFile, "utf8");
    const parsed = yaml.load(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("카테고리 설정 파일 형식이 올바르지 않습니다.");
    }

    return parsed as CategoryGroup[];
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
    const frontMatter = buildFrontMatter(input, tagMap);
    return validateFrontMatter(frontMatter);
  }

  async createPost(input: DraftInput): Promise<PostDocument> {
    const frontMatter = buildFrontMatter(input, tagMap);
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
      },
      tagMap
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
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
