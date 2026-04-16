import type { GitStatus } from "../../../shared/types";

interface GitPanelProps {
  gitStatus: GitStatus | null;
  selectedFiles: string[];
  commitMessage: string;
  busy: boolean;
  onToggleFile: (path: string) => void;
  onCommitMessage: (message: string) => void;
  onRefresh: () => void;
  onCommitPush: () => void;
  onClose: () => void;
}

export default function GitPanel({
  gitStatus,
  selectedFiles,
  commitMessage,
  busy,
  onToggleFile,
  onCommitMessage,
  onRefresh,
  onCommitPush,
  onClose
}: GitPanelProps) {
  return (
    <section className="git-panel" aria-label="Git 패널">
      <div className="git-panel__header">
        <h2>Git Commit</h2>
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
            <button
              type="button"
              className="btn btn--solid"
              onClick={onCommitPush}
              disabled={busy || selectedFiles.length === 0 || !commitMessage.trim()}
            >
              Commit + Push
            </button>
          </div>
        </>
      )}
    </section>
  );
}
