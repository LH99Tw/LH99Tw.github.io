import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import highlightCss from "highlight.js/styles/github-dark.css?inline";
import type { PostFrontMatter, PostSeriesItem } from "../../../shared/types";

interface PreviewPaneProps {
  body: string;
  frontMatter?: PostFrontMatter | null;
  dateLabel?: string;
  categoryLabel?: string;
  seriesPosts?: PostSeriesItem[];
  blogCssText: string;
  workspaceRoot: string;
}

marked.setOptions({ breaks: false, gfm: true });

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const normalizedLang = lang?.trim().toLowerCase();
  const highlighted = normalizedLang && hljs.getLanguage(normalizedLang)
    ? hljs.highlight(text, { language: normalizedLang }).value
    : hljs.highlightAuto(text).value;

  const className = normalizedLang ? `hljs language-${normalizedLang}` : "hljs";
  return `<pre><code class="${className}">${highlighted}</code></pre>`;
};

function normalizeAssetPaths(html: string, workspaceRoot: string): string {
  if (!workspaceRoot) return html;
  const rootUrl = `file://${encodeURI(workspaceRoot)}`;

  return html
    .replace(/src=\"\/(assets\/[^\"]+)\"/g, (_m, pathSegment: string) => `src=\"${rootUrl}/${pathSegment}\"`)
    .replace(/href=\"\/(assets\/[^\"]+)\"/g, (_m, pathSegment: string) => `href=\"${rootUrl}/${pathSegment}\"`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSeriesTitle(title: string): { series: string; title: string } | null {
  const trimmed = title.trim();
  if (!trimmed.startsWith("[") || !trimmed.includes("]")) return null;

  const end = trimmed.indexOf("]");
  const series = trimmed.slice(1, end).trim();
  if (!series) return null;

  return {
    series,
    title: trimmed.slice(end + 1).trim() || trimmed
  };
}

function renderSeriesHtml(seriesName: string, seriesPosts: PostSeriesItem[]): string {
  if (!seriesName || seriesPosts.length === 0) return "";

  const currentIndex = Math.max(0, seriesPosts.findIndex((post) => post.isCurrent));
  const currentPosition = currentIndex + 1;
  const newerPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const olderPost =
    currentIndex >= 0 && currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;
  const renderNav = (post: PostSeriesItem | null, label: string, ariaPrefix: string) =>
    post?.url
      ? `<a class=\"post-series__nav-btn\" href=\"${escapeHtml(post.url)}\" aria-label=\"${escapeHtml(
          `${ariaPrefix}: ${post.title}`
        )}\">${label}</a>`
      : `<span class=\"post-series__nav-btn is-disabled\" aria-hidden=\"true\">${label}</span>`;

  const items = seriesPosts
    .map((post, index) => {
      const title = escapeHtml(post.title);
      const body =
        post.isCurrent || !post.url
          ? `<strong class=\"post-series__current\">${title}</strong>`
          : `<a class=\"post-series__link\" href=\"${escapeHtml(post.url)}\">${title}</a>`;

      return `<li class=\"post-series__item${post.isCurrent ? " is-current" : ""}\">
        <span class=\"post-series__index\">${index + 1}.</span>
        ${body}
      </li>`;
    })
    .join("");

  return `<details class=\"post-series\" data-series-key=\"${escapeHtml(seriesName)}\">
    <summary class=\"post-series__summary\">
      <span class=\"post-series__bookmark\" aria-hidden=\"true\"></span>
      <span class=\"post-series__title\">${escapeHtml(seriesName)}</span>
      <span class=\"post-series__toggle\">
        <span class=\"post-series__toggle-open\">목록 보기</span>
        <span class=\"post-series__toggle-close\">숨기기</span>
      </span>
      <span class=\"post-series__status\">${currentPosition}/${seriesPosts.length}</span>
      <span class=\"post-series__nav\" aria-label=\"시리즈 글 이동\">
        ${renderNav(newerPost, "‹", "최신 방향 글")}
        ${renderNav(olderPost, "›", "이전 방향 글")}
      </span>
    </summary>
    <ol class=\"post-series__list\">${items}</ol>
  </details>`;
}

export default function PreviewPane({
  body,
  frontMatter,
  dateLabel,
  categoryLabel,
  seriesPosts = [],
  blogCssText,
  workspaceRoot
}: PreviewPaneProps) {
  const srcDoc = useMemo(() => {
    const rendered = marked.parse(body || "", { async: false, renderer }) as string;
    const sanitized = DOMPurify.sanitize(rendered, {
      ADD_ATTR: ["style", "width", "height", "loading", "class"]
    });
    const normalizedHtml = normalizeAssetPaths(sanitized, workspaceRoot);
    const parsedTitle = parseSeriesTitle(frontMatter?.title ?? "");
    const title = escapeHtml(parsedTitle?.title || frontMatter?.title?.trim() || "제목 없음");
    const categoryId = frontMatter?.categories?.[0]?.trim() || "";
    const categoryBase = (categoryLabel || categoryId || "").trim();
    const category = escapeHtml(
      parsedTitle?.series && categoryBase ? `${categoryBase} / ${parsedTitle.series}` : categoryBase || parsedTitle?.series || ""
    );
    const renderedDate = escapeHtml((dateLabel || "").trim());
    const seriesHtml = parsedTitle?.series ? renderSeriesHtml(parsedTitle.series, seriesPosts) : "";
    const tags = Array.isArray(frontMatter?.tags) ? frontMatter.tags.filter(Boolean) : [];
    const tagsHtml =
      tags.length > 0
        ? `<footer class="post__tail" aria-label="태그">
            <ul class="post__tags">
              ${tags.map((tag) => `<li class="post__tag">${escapeHtml(tag)}</li>`).join("")}
            </ul>
          </footer>`
        : "";

    return `<!doctype html>
<html lang=\"ko\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        width: 100%;
      }
      body {
        color: #1d1d1f;
      }
      .preview-root {
        min-height: 100vh;
        width: 100%;
      }
      .preview-shell {
        width: 100%;
      }
      .preview-post .post__content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 18px auto;
      }
    </style>
    <style>${blogCssText}</style>
    <style>${highlightCss}</style>
    <style>
      .preview-post .post__header::after {
        clip-path: none !important;
        -webkit-clip-path: none !important;
      }
      .preview-post .post__content pre code.hljs {
        display: block;
        padding: 0;
        background: transparent;
      }
    </style>
  </head>
  <body class=\"preview-root\">
    <main class=\"preview-shell site-content\">
      <div class=\"post-view\">
        <article class=\"post post--reader preview-post\">
          <header class=\"post__header\">
            ${category ? `<p class=\"post__category-kicker\">${category}</p>` : ""}
            <h1 class=\"post__title\">${title}</h1>
            ${renderedDate ? `<p class=\"post__meta\">${renderedDate}</p>` : ""}
          </header>
          ${seriesHtml}
          <section class=\"post__content\" id=\"postContent\">
            ${normalizedHtml}
          </section>
          ${tagsHtml}
        </article>
      </div>
    </main>
  </body>
</html>`;
  }, [body, frontMatter, dateLabel, categoryLabel, seriesPosts, blogCssText, workspaceRoot]);

  return (
    <section className="preview-pane preview-pane--fullscreen" aria-label="미리보기">
      <iframe className="preview-frame" title="post-preview" srcDoc={srcDoc} sandbox="allow-same-origin" />
    </section>
  );
}
