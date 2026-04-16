import type { GitStatus } from "../../../shared/types";

interface GitPanelProps {
  gitStatus: GitStatus | null;
  selectedFiles: string[];
  commitMessage: string;
  branchSlug: string;
  prTitle: string;
  prBody: string;
  busy: boolean;
  onToggleFile: (path: string) => void;
  onCommitMessage: (message: string) => void;
  onBranchSlug: (slug: string) => void;
  onPrTitle: (title: string) => void;
  onPrBody: (body: string) => void;
  onRefresh: () => void;
  onCommitPush: () => void;
  onCreatePr: () => void;
  onClose: () => void;
}

export default function GitPanel({
  gitStatus,
  selectedFiles,
  commitMessage,
  branchSlug,
  prTitle,
  prBody,
  busy,
  onToggleFile,
  onCommitMessage,
  onBranchSlug,
  onPrTitle,
  onPrBody,
  onRefresh,
  onCommitPush,
  onCreatePr,
  onClose
}: GitPanelProps) {
  const ghReady = !!gitStatus?.ghInstalled && !!gitStatus?.ghAuthenticated;

  return (
    <section className="git-panel" aria-label="Git 패널">
      <div className="git-panel__header">
        <h2>Git & PR</h2>
        <div className="git-panel__header-actions">
          <button type="button" className="btn" onClick={onRefresh} disabled={busy}>
            새로고침
          </button>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      {!gitStatus && <p className="muted">Git 상태를 불러오는 중...</p>}

      {gitStatus && (
        <>
          <div className="git-meta">
            <span>Branch: {gitStatus.currentBranch || "-"}</span>
            <span>Changed: {gitStatus.changedFiles.length}</span>
            {!gitStatus.ghInstalled && <span className="warning">`gh` 미설치</span>}
            {gitStatus.ghInstalled && !gitStatus.ghAuthenticated && (
              <span className="warning">`gh auth login` 필요</span>
            )}
          </div>

          <div className="git-files">
            {gitStatus.changedFiles.map((file) => (
              <label key={file.path}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.path)}
                  onChange={() => onToggleFile(file.path)}
                />
                <span>{file.path}</span>
                <small>{file.status}</small>
              </label>
            ))}
            {gitStatus.changedFiles.length === 0 && <p className="muted">변경 파일이 없습니다.</p>}
          </div>

          <div className="git-form">
            <label>
              커밋 메시지
              <input value={commitMessage} onChange={(event) => onCommitMessage(event.target.value)} />
            </label>
            <label>
              브랜치 slug (선택)
              <input value={branchSlug} onChange={(event) => onBranchSlug(event.target.value)} />
            </label>
            <button
              type="button"
              className="btn btn--solid"
              onClick={onCommitPush}
              disabled={busy || selectedFiles.length === 0 || !commitMessage.trim()}
            >
              Commit + Push
            </button>
          </div>

          <div className="git-form">
            <label>
              PR 제목
              <input value={prTitle} onChange={(event) => onPrTitle(event.target.value)} />
            </label>
            <label>
              PR 본문
              <textarea rows={3} value={prBody} onChange={(event) => onPrBody(event.target.value)} />
            </label>
            <button
              type="button"
              className="btn"
              onClick={onCreatePr}
              disabled={busy || !ghReady || !prTitle.trim()}
              title={!ghReady ? "gh 설치 및 로그인 후 사용 가능" : "Draft PR 생성"}
            >
              Draft PR 생성
            </button>
          </div>
        </>
      )}
    </section>
  );
}
