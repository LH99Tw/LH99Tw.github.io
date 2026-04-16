import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { redo, undo } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import type { PostFrontMatter, ValidationResult } from "../../../shared/types";

interface DraftState {
  filePath?: string;
  fileName?: string;
  frontMatter: PostFrontMatter;
  body: string;
  isNew: boolean;
}

interface CategoryOption {
  id: string;
  label: string;
}

interface EditorPaneProps {
  draft: DraftState | null;
  validation: ValidationResult;
  busy: boolean;
  saveState: "idle" | "dirty" | "saved";
  categoryOptions: CategoryOption[];
  onUpdateFrontMatter: (next: PostFrontMatter) => void;
  onUpdateBody: (body: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

const headingPrefix = (level: 1 | 2 | 3) => `${"#".repeat(level)} `;

export default function EditorPane({
  draft,
  validation,
  busy,
  saveState,
  categoryOptions,
  onUpdateFrontMatter,
  onUpdateBody,
  onSave,
  onDelete
}: EditorPaneProps) {
  const viewRef = useRef<EditorView | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");

  const hasErrors = validation.errors.length > 0;
  const selectedCategory = useMemo(() => draft?.frontMatter.categories[0] ?? "", [draft?.frontMatter.categories]);

  const updateTextList = (value: string): string[] =>
    value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

  useEffect(() => {
    setTagsInput(draft?.frontMatter.tags.join(", ") ?? "");
  }, [draft?.filePath, draft?.isNew]);

  const withEditor = (handler: (view: EditorView) => void): void => {
    const view = viewRef.current;
    if (!view) return;
    handler(view);
    view.focus();
  };

  const insertAtCursor = (text: string): void => {
    withEditor((view) => {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length }
      });
    });
  };

  const insertAroundSelection = (before: string, after: string = before): void => {
    withEditor((view) => {
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const nextText = `${before}${selected || "텍스트"}${after}`;

      view.dispatch({
        changes: { from, to, insert: nextText },
        selection: { anchor: from + before.length, head: from + nextText.length - after.length }
      });
    });
  };

  const prefixLine = (prefix: string): void => {
    withEditor((view) => {
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from,
          insert: prefix
        }
      });
    });
  };

  if (!draft) {
    return <section className="editor-pane editor-pane--empty">좌측에서 글을 선택하거나 새 글을 만드세요.</section>;
  }

  const saveButtonLabel = busy
    ? "저장 중..."
    : saveState === "saved"
      ? "저장됨"
      : draft.isNew
        ? "작성 완료"
        : "수정 완료";

  return (
    <section className="editor-pane" aria-label="에디터">
      <header className="editor-toolbar">
        <div className="editor-toolbar__left">
          <button type="button" className="icon-btn" title="Undo" onClick={() => withEditor((view) => undo(view))}>
            ↶
          </button>
          <button type="button" className="icon-btn" title="Redo" onClick={() => withEditor((view) => redo(view))}>
            ↷
          </button>
          <span className="toolbar-sep" />

          <button type="button" className="icon-btn icon-btn--text" title="Heading 1" onClick={() => prefixLine(headingPrefix(1))}>
            Hn
          </button>
          <button type="button" className="icon-btn icon-btn--text" title="Heading 2" onClick={() => prefixLine(headingPrefix(2))}>
            H2
          </button>
          <button type="button" className="icon-btn icon-btn--text" title="Heading 3" onClick={() => prefixLine(headingPrefix(3))}>
            H3
          </button>

          <button type="button" className="icon-btn" title="Bold" onClick={() => insertAroundSelection("**")}>B</button>
          <button type="button" className="icon-btn" title="Italic" onClick={() => insertAroundSelection("*")}>I</button>
          <button type="button" className="icon-btn" title="Strike" onClick={() => insertAroundSelection("~~")}>S</button>
          <button type="button" className="icon-btn" title="Underline" onClick={() => insertAroundSelection("<u>", "</u>")}>U</button>
          <button type="button" className="icon-btn" title="Code" onClick={() => insertAroundSelection("`")}>{"</>"}</button>
          <button type="button" className="icon-btn" title="Link" onClick={() => insertAroundSelection("[", "](https://)")}>🔗</button>
          <button type="button" className="icon-btn" title="Image" onClick={() => insertAtCursor("\n![alt](https://)\n")}>🖼</button>
          <button
            type="button"
            className="icon-btn"
            title="Table"
            onClick={() => insertAtCursor("\n| 항목 | 값 |\n| --- | --- |\n| A | B |\n")}
          >
            ▦
          </button>
          <button type="button" className="icon-btn" title="Checklist" onClick={() => prefixLine("- [ ] ")}>
            ☑
          </button>
          <button type="button" className="icon-btn" title="Quote" onClick={() => prefixLine("> ")}>
            ❝
          </button>
        </div>

        <div className="editor-toolbar__right">
          <button type="button" className="btn" onClick={onDelete} disabled={busy || draft.isNew}>
            삭제
          </button>
          <button
            type="button"
            className="btn btn--solid"
            onClick={onSave}
            disabled={busy || hasErrors || saveState === "saved"}
          >
            {saveButtonLabel}
          </button>
        </div>
      </header>

      <div className="editor-meta">
        <label>
          제목
          <input
            value={draft.frontMatter.title}
            onChange={(event) =>
              onUpdateFrontMatter({
                ...draft.frontMatter,
                title: event.target.value
              })
            }
          />
        </label>
        <label>
          설명
          <input
            value={draft.frontMatter.description}
            onChange={(event) =>
              onUpdateFrontMatter({
                ...draft.frontMatter,
                description: event.target.value
              })
            }
          />
        </label>
        <label>
          카테고리
          <select
            value={selectedCategory}
            onChange={(event) =>
              onUpdateFrontMatter({
                ...draft.frontMatter,
                categories: event.target.value ? [event.target.value] : []
              })
            }
          >
            <option value="">카테고리 선택</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          태그 (쉼표 구분)
          <input
            value={tagsInput}
            onChange={(event) => {
              const nextRaw = event.target.value;
              setTagsInput(nextRaw);
              onUpdateFrontMatter({
                ...draft.frontMatter,
                tags: updateTextList(nextRaw)
              });
            }}
          />
        </label>
      </div>

      <CodeMirror
        className="editor-cm"
        value={draft.body}
        height="100%"
        extensions={[markdown()]}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        onChange={(value) => onUpdateBody(value)}
      />

      <footer className="editor-validation">
        {draft.filePath && <span className="editor-validation__path">{draft.filePath}</span>}
        {validation.errors.map((error) => (
          <p key={error} className="error">
            {error}
          </p>
        ))}
        {validation.warnings.map((warning) => (
          <p key={warning} className="warning">
            {warning}
          </p>
        ))}
      </footer>
    </section>
  );
}
