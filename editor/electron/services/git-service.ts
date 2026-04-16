import type {
  GitCommitPushInput,
  GitPushResult,
  GitStatus
} from "../../shared/types";
import simpleGit from "simple-git";

export class GitService {
  constructor(private readonly workspaceRoot: string) {}

  async status(): Promise<GitStatus> {
    const git = simpleGit({ baseDir: this.workspaceRoot });
    const isGitRepo = await git.checkIsRepo();

    if (!isGitRepo) {
      return {
        isGitRepo: false,
        currentBranch: "",
        changedFiles: [],
        message: "Git 저장소를 찾을 수 없습니다."
      };
    }

    const status = await git.status();

    return {
      isGitRepo: true,
      currentBranch: status.current ?? "",
      changedFiles: status.files.map((file) => ({
        path: file.path,
        status: `${file.index}${file.working_dir}`.trim() || "??",
        staged: file.index !== " " && file.index !== "?",
        unstaged: file.working_dir !== " "
      }))
    };
  }

  async commitPush(input: GitCommitPushInput): Promise<GitPushResult> {
    if (!input.files.length) {
      throw new Error("커밋할 파일을 한 개 이상 선택하세요.");
    }

    const git = simpleGit({ baseDir: this.workspaceRoot });
    const status = await git.status();

    const branch = status.current ?? "";

    await git.add(input.files);
    const commit = await git.commit(input.message);

    if (!commit.commit) {
      throw new Error("커밋 생성에 실패했습니다.");
    }

    if (!branch) {
      throw new Error("현재 브랜치 정보를 찾을 수 없습니다.");
    }

    await git.raw(["push", "-u", "origin", branch]);

    return {
      branch,
      commitHash: commit.commit,
      pushed: true,
      createdBranch: false
    };
  }
}
