import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import highlightCss from "highlight.js/styles/github-dark.css?inline";

interface PreviewPaneProps {
  body: string;
  blogCssText: string;
  workspaceRoot: string;
}

marked.setOptions({ breaks: true, gfm: true });

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

export default function PreviewPane({ body, blogCssText, workspaceRoot }: PreviewPaneProps) {
  const srcDoc = useMemo(() => {
    const rendered = marked.parse(body || "", { async: false, renderer }) as string;
    const sanitized = DOMPurify.sanitize(rendered, {
      ADD_ATTR: ["style", "width", "height", "loading", "class"]
    });
    const normalizedHtml = normalizeAssetPaths(sanitized, workspaceRoot);

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
        display: flex;
        justify-content: center;
      }
      .preview-shell {
        width: min(860px, calc(100vw - 48px));
        margin: 24px auto 48px;
      }
      .preview-post {
        margin: 0;
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
      .preview-post.post--reader {
        --post-reader-shift: 0;
        padding-left: 0 !important;
      }
      .preview-post .post__header {
        min-height: auto !important;
        padding-top: 0 !important;
      }
      .preview-post .post__content pre code.hljs {
        display: block;
        padding: 0;
        background: transparent;
      }
    </style>
  </head>
  <body class=\"preview-root\">
    <main class=\"preview-shell\">
      <article class=\"post preview-post\">
        <section class=\"post__content\" id=\"postContent\">
          ${normalizedHtml}
        </section>
      </article>
    </main>
  </body>
</html>`;
  }, [body, blogCssText, workspaceRoot]);

  return (
    <section className="preview-pane preview-pane--fullscreen" aria-label="미리보기">
      <iframe className="preview-frame" title="post-preview" srcDoc={srcDoc} sandbox="allow-same-origin" />
    </section>
  );
}
