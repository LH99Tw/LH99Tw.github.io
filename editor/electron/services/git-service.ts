import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { formatDate, slugify } from "../../shared/editor-utils";
import type {
  GitCommitPushInput,
  GitPushResult,
  GitStatus,
  PRInput,
  PRResult
} from "../../shared/types";
import simpleGit from "simple-git";

const execFileAsync = promisify(execFile);

function commandExists(command: string): Promise<boolean> {
  return execFileAsync("which", [command])
    .then(() => true)
    .catch(() => false);
}

export class GitService {
  constructor(private readonly workspaceRoot: string) {}

  async status(): Promise<GitStatus> {
    const git = simpleGit({ baseDir: this.workspaceRoot });
    const isGitRepo = await git.checkIsRepo();

    const ghInstalled = await commandExists("gh");
    const ghAuthenticated = ghInstalled ? await this.isGhAuthenticated() : false;

    if (!isGitRepo) {
      return {
        isGitRepo: false,
        currentBranch: "",
        changedFiles: [],
        ghInstalled,
        ghAuthenticated,
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
      })),
      ghInstalled,
      ghAuthenticated
    };
  }

  async commitPush(input: GitCommitPushInput): Promise<GitPushResult> {
    if (!input.files.length) {
      throw new Error("커밋할 파일을 한 개 이상 선택하세요.");
    }

    const git = simpleGit({ baseDir: this.workspaceRoot });
    const status = await git.status();

    let branch = status.current ?? "";
    let createdBranch = false;

    if (branch === "main" || branch === "master") {
      const branchSlug = slugify(input.branchSlug ?? input.message) || "post-update";
      const shortDate = formatDate().replace(/-/g, "");
      let candidate = `codex/editor/${shortDate}-${branchSlug}`;

      const local = await git.branchLocal();
      let seq = 2;
      while (local.all.includes(candidate)) {
        candidate = `codex/editor/${shortDate}-${branchSlug}-${seq}`;
        seq += 1;
      }

      await git.checkoutLocalBranch(candidate);
      branch = candidate;
      createdBranch = true;
    }

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
      createdBranch
    };
  }

  async createPullRequest(input: PRInput): Promise<PRResult> {
    const ghInstalled = await commandExists("gh");
    if (!ghInstalled) {
      throw new Error("gh CLI가 설치되어 있지 않습니다. 설치 후 다시 시도하세요.");
    }

    const authenticated = await this.isGhAuthenticated();
    if (!authenticated) {
      throw new Error("gh auth login 으로 로그인 후 다시 시도하세요.");
    }

    const args = ["pr", "create", "--title", input.title, "--body", input.body];
    if (input.base) {
      args.push("--base", input.base);
    }
    if (input.draft ?? true) {
      args.push("--draft");
    }

    const result = await execFileAsync("gh", args, { cwd: this.workspaceRoot });
    const url = result.stdout.trim().split("\n").find((line) => line.startsWith("http"));

    if (!url) {
      throw new Error("PR URL을 확인할 수 없습니다. gh 출력 로그를 확인하세요.");
    }

    return { url };
  }

  private async isGhAuthenticated(): Promise<boolean> {
    try {
      await execFileAsync("gh", ["auth", "status"], { cwd: this.workspaceRoot });
      return true;
    } catch {
      return false;
    }
  }
}
