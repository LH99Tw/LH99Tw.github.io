import { z } from "zod";
import type { DraftInput, PostFrontMatter, ValidationResult } from "./types";

const TITLE_MIN = 8;
const TITLE_MAX = 70;
const DESC_MIN = 10;
const DESC_MAX = 220;
const DESC_RECOMMENDED_MIN = 120;
const DESC_RECOMMENDED_MAX = 155;

const frontMatterSchema = z.object({
  title: z.string().trim().min(TITLE_MIN).max(TITLE_MAX),
  description: z.string().trim().min(DESC_MIN).max(DESC_MAX),
  categories: z.array(z.string().trim().min(1)).min(1),
  tags: z.array(z.string().trim().min(1))
});

export function formatDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^\w\u3131-\u3163\uac00-\ud7a3\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function inferDescriptionFromBody(body: string): string {
  const noCode = body.replace(/```[\s\S]*?```/g, " ");
  const plain = noCode
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const paragraph = plain.split(/\s{2,}|\n/).find((item) => item.trim().length > 0) ?? "";
  const trimmed = paragraph.trim();

  if (trimmed.length <= DESC_RECOMMENDED_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, DESC_RECOMMENDED_MAX - 1).trimEnd()}…`;
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim().toLowerCase();
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    result.push(tag);
  }

  return result;
}

export function buildFrontMatter(input: DraftInput): PostFrontMatter {
  const title = input.title.trim();
  const description = (input.description ?? "").trim() || inferDescriptionFromBody(input.body);
  const categories = input.categories.map((category) => category.trim()).filter(Boolean);
  const manualTags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const tags = normalizeTags(manualTags);

  return {
    title,
    description,
    categories,
    tags
  };
}

export function validateFrontMatter(frontMatter: PostFrontMatter): ValidationResult {
  const parsed = frontMatterSchema.safeParse(frontMatter);
  const errors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => {
        const field = issue.path.join(".") || "field";
        return `${field}: ${issue.message}`;
      });

  const warnings: string[] = [];
  const descriptionLength = frontMatter.description.trim().length;
  if (descriptionLength > 0 && (descriptionLength < DESC_RECOMMENDED_MIN || descriptionLength > DESC_RECOMMENDED_MAX)) {
    warnings.push(
      `description 권장 길이는 ${DESC_RECOMMENDED_MIN}-${DESC_RECOMMENDED_MAX}자입니다. 현재 ${descriptionLength}자입니다.`
    );
  }

  return { errors, warnings };
}

export function buildPostFileName(title: string, date = formatDate()): string {
  const slug = slugify(title) || "untitled-post";
  return `${date}-${slug}.md`;
}

export function serializeFrontMatter(frontMatter: PostFrontMatter, body: string): string {
  const lines = [
    "---",
    `title: \"${frontMatter.title.replace(/\"/g, '\\\"')}\"`,
    `description: \"${frontMatter.description.replace(/\"/g, '\\\"')}\"`,
    "categories:",
    ...frontMatter.categories.map((category) => `  - ${category}`),
    "tags:",
    ...frontMatter.tags.map((tag) => `  - ${tag}`),
    "---",
    ""
  ];

  return `${lines.join("\n")}${body.trimStart()}\n`;
}
