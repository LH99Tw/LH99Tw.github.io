import { useEffect, useMemo, useState } from "react";
import Sidebar from "./features/sidebar/Sidebar";
import EditorPane from "./features/editor/EditorPane";
import PreviewPane from "./features/preview/PreviewPane";
import GitPanel from "./features/git/GitPanel";
import { editorApi } from "./lib/editor-api";
import type {
  CategoryGroup,
  GitStatus,
  PostDocument,
  PostFrontMatter,
  PostSummary,
  ValidationResult
} from "../shared/types";

interface DraftState {
  filePath?: string;
  fileName?: string;
  frontMatter: PostFrontMatter;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  isNew: boolean;
}

type ToastKind = "info" | "success" | "error";

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

const EMPTY_VALIDATION: ValidationResult = { errors: [], warnings: [] };

const DEFAULT_BODY_TEMPLATE = `핵심 키워드를 첫 120자 안에 포함해 문제 맥락을 설명합니다.

## 배경

문제가 발생한 배경과 현재 상태를 정리합니다.

## 해결 방법

핵심 접근 방식과 구현 포인트를 설명합니다.

## 적용 결과

전/후 비교와 학습 포인트를 정리합니다.

## 자주 묻는 질문(FAQ)

### 질문 1

답변
`;

function createDraft(categoryId: string): DraftState {
  return {
    isNew: true,
    frontMatter: {
      title: "",
      description: "",
      categories: categoryId ? [categoryId] : [],
      tags: []
    },
    body: DEFAULT_BODY_TEMPLATE
  };
}

function toDraft(doc: PostDocument): DraftState {
  return {
    filePath: doc.filePath,
    fileName: doc.fileName,
    frontMatter: doc.frontMatter,
    body: doc.body,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    isNew: false
  };
}

export default function App() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string>("");
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [validation, setValidation] = useState<ValidationResult>(EMPTY_VALIDATION);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedGitFiles, setSelectedGitFiles] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState<string>("post: update content");
  const [busy, setBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showGitFlow, setShowGitFlow] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [blogCssText, setBlogCssText] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved">("idle");

  const showToast = (message: string, kind: ToastKind = "info"): void => {
    setToast({ id: Date.now(), message, kind });
  };

  const activeCategoryLabel = useMemo(() => {
    for (const group of categories) {
      const found = group.items.find((item) => item.id === activeCategoryId);
      if (found) return found.label;
    }
    return activeCategoryId;
  }, [activeCategoryId, categories]);

  const categoryOptions = useMemo(
    () =>
      categories.flatMap((group) =>
        group.items.map((item) => ({
          id: item.id,
          label: `${group.label} / ${item.label}`
        }))
      ),
    [categories]
  );

  const loadCategories = async (): Promise<void> => {
    const data = await editorApi.getCategories();
    setCategories(data);

    if (!activeCategoryId) {
      const firstItem = data[0]?.items[0]?.id ?? "";
      setActiveCategoryId(firstItem);
    }
  };

  const loadPosts = async (): Promise<void> => {
    const data = await editorApi.listPosts();
    setPosts(data);
  };

  const refreshGitStatus = async (): Promise<void> => {
    const status = await editorApi.gitStatus();
    setGitStatus(status);
    setSelectedGitFiles((prev) => {
      const changed = status.changedFiles.map((file) => file.path);
      const retained = prev.filter((path) => changed.includes(path));
      return retained.length > 0 ? retained : changed;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const root = await editorApi.workspaceRoot();
        setWorkspaceRoot(root);
        const cssText = await editorApi.getBlogCss();
        setBlogCssText(cssText);
        await loadCategories();
        await loadPosts();
        await refreshGitStatus();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`초기화 실패: ${message}`, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!draft) {
      setValidation(EMPTY_VALIDATION);
      return;
    }

    const result = editorApi.validateDraft({
      title: draft.frontMatter.title,
      description: draft.frontMatter.description,
      categories: draft.frontMatter.categories,
      tags: draft.frontMatter.tags,
      body: draft.body
    });
    setValidation(result);
  }, [draft]);

  const handleSelectCategory = (categoryId: string): void => {
    setActiveCategoryId(categoryId);
    setSelectedFilePath("");
  };

  const handleSelectPost = async (filePath: string): Promise<void> => {
    try {
      setBusy(true);
      const doc = await editorApi.readPost(filePath);
      setDraft(toDraft(doc));
      setSelectedFilePath(filePath);
      setShowGitFlow(false);
      setIsPreviewMode(false);
      setSaveState("idle");
      setToast(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "글을 읽는 중 오류가 발생했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDraft = (): void => {
    setDraft(createDraft(activeCategoryId));
    setSelectedFilePath("");
    setShowGitFlow(false);
    setIsPreviewMode(false);
    setSaveState("dirty");
    setToast(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;

    try {
      setBusy(true);
      if (draft.isNew) {
        const created = await editorApi.createPost({
          title: draft.frontMatter.title,
          description: draft.frontMatter.description,
          categories: draft.frontMatter.categories,
          tags: draft.frontMatter.tags,
          body: draft.body
        });

        const nextDraft = toDraft(created);
        setDraft(nextDraft);
        setSelectedFilePath(created.filePath);
        await loadPosts();
        setCommitMessage(`post: add ${created.frontMatter.title}`);
      } else {
        const updated = await editorApi.updatePost({
          filePath: draft.filePath!,
          frontMatter: draft.frontMatter,
          body: draft.body
        });
        setDraft(toDraft(updated));
        await loadPosts();
        setCommitMessage(`post: update ${updated.frontMatter.title}`);
      }

      await refreshGitStatus();
      setSaveState("saved");
      setToast(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!draft?.filePath) return;
    const okay = window.confirm("정말 삭제하시겠습니까? (_posts/.trash 로 이동됩니다)");
    if (!okay) return;

    try {
      setBusy(true);
      await editorApi.deletePost(draft.filePath);
      setDraft(null);
      setSelectedFilePath("");
      setShowGitFlow(false);
      setIsPreviewMode(false);
      setSaveState("idle");
      await loadPosts();
      await refreshGitStatus();
      showToast("글을 휴지통으로 이동했습니다.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleGitFile = (filePath: string): void => {
    setSelectedGitFiles((prev) =>
      prev.includes(filePath) ? prev.filter((path) => path !== filePath) : [...prev, filePath]
    );
  };

  const handleCommitPush = async (): Promise<void> => {
    try {
      setBusy(true);
      const result = await editorApi.gitCommitPush({
        files: selectedGitFiles,
        message: commitMessage
      });
      await refreshGitStatus();
      showToast(`Push 완료: ${result.branch} (${result.commitHash.slice(0, 7)})`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "커밋/푸시 중 오류가 발생했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDraftFrontMatterChange = (frontMatter: PostFrontMatter): void => {
    setSaveState("dirty");
    setDraft((prev) => (prev ? { ...prev, frontMatter } : prev));
  };

  const handleDraftBodyChange = (body: string): void => {
    setSaveState("dirty");
    setDraft((prev) => (prev ? { ...prev, body } : prev));
  };

  const handleOpenGitFlow = async (): Promise<void> => {
    try {
      setBusy(true);
      await refreshGitStatus();
      setShowGitFlow(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Git 상태 조회 중 오류가 발생했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!draft || busy || validation.errors.length > 0 || saveState === "saved") {
          return;
        }
        void handleSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [draft, busy, validation.errors.length, saveState, draft?.isNew, draft?.filePath]);

  return (
    <>
      <div className="app-shell">
      <Sidebar
        categories={categories}
        activeCategoryId={activeCategoryId}
        posts={posts}
        selectedFilePath={selectedFilePath}
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        onSelectCategory={handleSelectCategory}
        onSelectPost={(filePath) => {
          void handleSelectPost(filePath);
        }}
        onCreateDraft={handleCreateDraft}
      />

      <main className="app-main">
        <header className="app-main__header">
          <div>
            <h2>{activeCategoryLabel || "Category"}</h2>
            <p>{workspaceRoot}</p>
          </div>
          <div className="app-main__actions">
            <button type="button" className="btn" onClick={() => void handleOpenGitFlow()} disabled={busy}>
              커밋
            </button>
            <button type="button" className="btn" onClick={() => setIsPreviewMode((prev) => !prev)}>
              {isPreviewMode ? "편집 모드" : "Preview 모드"}
            </button>
          </div>
        </header>

        <div className="app-main__editor-grid">
          {!isPreviewMode ? (
            <EditorPane
              draft={draft}
              validation={validation}
              busy={busy}
              saveState={saveState}
              categoryOptions={categoryOptions}
              onUpdateFrontMatter={handleDraftFrontMatterChange}
              onUpdateBody={handleDraftBodyChange}
              onSave={() => {
                void handleSave();
              }}
              onDelete={() => {
                void handleDelete();
              }}
            />
          ) : (
            <PreviewPane body={draft?.body ?? ""} blogCssText={blogCssText} workspaceRoot={workspaceRoot} />
          )}
        </div>

      </main>
      </div>

      {showGitFlow && (
        <div className="git-overlay" role="dialog" aria-modal="true" aria-label="Git 단계">
          <div className="git-overlay__sheet">
            <GitPanel
              gitStatus={gitStatus}
              selectedFiles={selectedGitFiles}
              commitMessage={commitMessage}
              busy={busy}
              onToggleFile={handleToggleGitFile}
              onCommitMessage={setCommitMessage}
              onRefresh={() => {
                void refreshGitStatus();
              }}
              onCommitPush={() => {
                void handleCommitPush();
              }}
              onClose={() => setShowGitFlow(false)}
            />
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-stack" aria-live="polite">
          <div className={`toast toast--${toast.kind}`} key={toast.id}>
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              aria-label="닫기"
              onClick={() => setToast(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
