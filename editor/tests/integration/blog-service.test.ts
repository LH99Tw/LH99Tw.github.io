import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlogService } from "../../electron/services/blog-service";

let tempRoot = "";
let service: BlogService;

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lh99-editor-"));
  await fs.mkdir(path.join(tempRoot, "_data"), { recursive: true });
  await fs.mkdir(path.join(tempRoot, "_posts"), { recursive: true });
  await fs.writeFile(
    path.join(tempRoot, "_data", "sidebar_categories.yml"),
    `- id: programming\n  label: 프로그래밍\n  items:\n    - id: cs\n      label: CS\n`,
    "utf8"
  );

  service = new BlogService(tempRoot);
});

afterEach(async () => {
  if (tempRoot) {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

describe("BlogService integration", () => {
  it("loads categories", async () => {
    const categories = await service.getCategories();
    expect(categories[0].id).toBe("programming");
    expect(categories[0].items[0].id).toBe("cs");
  });

  it("creates, updates, and soft deletes post", async () => {
    const created = await service.createPost({
      title: "충분히 긴 테스트 제목입니다",
      description: "충분히 긴 설명입니다. 길이 조건을 만족하도록 내용을 채웁니다.",
      categories: ["cs"],
      tags: ["cpu"],
      body: "본문입니다."
    });

    expect(created.filePath.startsWith("_posts/")).toBe(true);

    const updated = await service.updatePost({
      filePath: created.filePath,
      frontMatter: {
        ...created.frontMatter,
        tags: [...created.frontMatter.tags, "update"]
      },
      body: `${created.body}\n\n추가 내용`
    });

    expect(updated.frontMatter.tags).toContain("update");

    const deleted = await service.deletePost(created.filePath);
    expect(deleted.trashedPath.includes("_posts/.trash/")).toBe(true);
  });

  it("filters posts by category", async () => {
    await service.createPost({
      title: "카테고리 테스트 제목",
      description: "카테고리 필터 테스트를 위한 설명 텍스트입니다.",
      categories: ["cs"],
      tags: ["test"],
      body: "본문"
    });

    const csPosts = await service.listPosts("cs");
    const aiPosts = await service.listPosts("ai");

    expect(csPosts.length).toBe(1);
    expect(aiPosts.length).toBe(0);
  });

  it("creates, updates, and guards category deletion", async () => {
    const createdCategories = await service.createCategory({
      groupId: "programming",
      id: "reading-note",
      label: "독서노트"
    });

    expect(createdCategories[0].items.some((item) => item.id === "reading-note")).toBe(true);
    await expect(fs.access(path.join(tempRoot, "categories", "reading-note", "index.md"))).resolves.toBeUndefined();

    await service.createPost({
      title: "카테고리 리네임 테스트 제목",
      description: "카테고리 리네임 테스트를 위한 충분히 긴 설명 텍스트입니다.",
      categories: ["reading-note"],
      tags: ["test"],
      body: "본문"
    });

    const updatedCategories = await service.updateCategory({
      groupId: "programming",
      categoryId: "reading-note",
      nextId: "book-note",
      nextLabel: "북노트"
    });

    expect(updatedCategories[0].items.some((item) => item.id === "book-note")).toBe(true);
    await expect(fs.access(path.join(tempRoot, "categories", "book-note", "index.md"))).resolves.toBeUndefined();

    const bookPosts = await service.listPosts("book-note");
    expect(bookPosts.length).toBe(1);

    await expect(
      service.deleteCategory({
        groupId: "programming",
        categoryId: "book-note"
      })
    ).rejects.toThrow("삭제할 수 없습니다");
  });
});
