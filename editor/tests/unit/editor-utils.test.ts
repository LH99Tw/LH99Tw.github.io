import { describe, expect, it } from "vitest";
import tagMap from "../../config/tag-map.json";
import {
  buildFrontMatter,
  buildPostFileName,
  inferDescriptionFromBody,
  recommendTags,
  slugify,
  validateFrontMatter
} from "../../shared/editor-utils";

describe("editor-utils", () => {
  it("slugify handles korean and symbols", () => {
    expect(slugify("[컴퓨터구조] 제2장 CPU의 구조와 기능!")).toBe("제2장-cpu의-구조와-기능");
  });

  it("inferDescriptionFromBody trims to recommendation max", () => {
    const body = "긴 문단 ".repeat(50);
    const description = inferDescriptionFromBody(body);

    expect(description.length).toBeLessThanOrEqual(155);
    expect(description.length).toBeGreaterThan(0);
  });

  it("recommendTags merges category defaults and keyword rules", () => {
    const tags = recommendTags("CPU 인터럽트 정리", ["cs"], tagMap);

    expect(tags).toContain("computer-science");
    expect(tags).toContain("cpu");
    expect(tags).toContain("interrupt");
  });

  it("buildFrontMatter applies auto description and tags", () => {
    const frontMatter = buildFrontMatter(
      {
        title: "비동기 성능 최적화",
        categories: ["javascript"],
        body: "비동기 처리 성능 개선 내용을 설명합니다.",
        tags: ["web"]
      },
      tagMap
    );

    expect(frontMatter.description).toContain("비동기");
    expect(frontMatter.tags).toContain("web");
    expect(frontMatter.tags).toContain("async");
  });

  it("validateFrontMatter returns errors and warnings", () => {
    const invalid = validateFrontMatter({
      title: "짧음",
      description: "너무 짧음",
      categories: [],
      tags: []
    });

    expect(invalid.errors.length).toBeGreaterThan(0);

    const validButWarn = validateFrontMatter({
      title: "충분히 긴 제목 예시입니다",
      description: "짧지만 허용 범위 설명",
      categories: ["cs"],
      tags: ["cpu"]
    });
    expect(validButWarn.errors).toHaveLength(0);
    expect(validButWarn.warnings.length).toBeGreaterThan(0);
  });

  it("buildPostFileName includes date prefix", () => {
    expect(buildPostFileName("CPU 기초", "2026-04-16")).toBe("2026-04-16-cpu-기초.md");
  });
});
