import { execFileSync } from "node:child_process";
import { copyFile, mkdir, realpath, stat } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const INSTALL_GROUPS = {
  commit: [
    {
      source: "templates/workflows/ai-commit-review.yml",
      target: ".github/workflows/ai-commit-review.yml",
    },
    {
      source: "templates/scripts/ai-commit-review.mjs",
      target: ".github/scripts/ai-commit-review.mjs",
    },
  ],
  pr: [
    {
      source: "templates/workflows/ai-pr-review.yml",
      target: ".github/workflows/ai-pr-review.yml",
    },
    {
      source: "templates/scripts/ai-pr-review.mjs",
      target: ".github/scripts/ai-pr-review.mjs",
    },
  ],
};

function parseMode(args) {
  const knownFlags = new Map([
    ["--commit", "commit"],
    ["--pr", "pr"],
    ["--all", "all"],
  ]);
  const unknown = args.filter((arg) => !knownFlags.has(arg));
  if (unknown.length > 0) {
    throw new Error(`알 수 없는 옵션입니다: ${unknown.join(", ")}`);
  }

  const modes = args.map((arg) => knownFlags.get(arg));
  if (modes.length > 1) {
    throw new Error("--commit, --pr, --all 중 하나만 사용할 수 있습니다.");
  }
  return modes[0];
}

async function chooseMode(rl) {
  console.log("어떤 리뷰를 설치할까요?\n");
  console.log("  1. Commit review");
  console.log("  2. PR review");
  console.log("  3. Both");

  while (true) {
    const answer = (await rl.question("\n번호를 선택하세요 (1-3): ")).trim();
    if (answer === "1") return "commit";
    if (answer === "2") return "pr";
    if (answer === "3") return "all";
    console.log("1, 2, 3 중 하나를 입력해 주세요.");
  }
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function confirmOverwrite(rl, relativePath) {
  const answer = (
    await rl.question(`${relativePath} 파일이 이미 있습니다. 덮어쓸까요? (y/n): `)
  )
    .trim()
    .toLowerCase();
  return answer === "y" || answer === "yes";
}

async function assertGitRoot(cwd) {
  let gitRoot;
  try {
    gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(
      "현재 폴더는 Git 저장소가 아닙니다. 설치할 Git 저장소의 최상위 폴더에서 실행해 주세요.",
    );
  }

  const [resolvedCwd, resolvedGitRoot] = await Promise.all([
    realpath(cwd),
    realpath(gitRoot),
  ]);
  if (resolvedCwd !== resolvedGitRoot) {
    throw new Error(
      `Git 저장소 최상위 폴더에서 실행해 주세요.\n저장소 최상위: ${gitRoot}`,
    );
  }
}

function filesForMode(mode) {
  if (mode === "commit") return INSTALL_GROUPS.commit;
  if (mode === "pr") return INSTALL_GROUPS.pr;
  return [...INSTALL_GROUPS.commit, ...INSTALL_GROUPS.pr];
}

export async function init(args, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const rl =
    options.readline ??
    createInterface({
      input,
      output,
    });
  const ownsReadline = !options.readline;

  try {
    await assertGitRoot(cwd);
    const mode = parseMode(args);
    const selectedMode = mode ?? (await chooseMode(rl));
    const installed = [];
    const skipped = [];

    for (const file of filesForMode(selectedMode)) {
      const source = path.join(PACKAGE_ROOT, file.source);
      const target = path.join(cwd, file.target);

      if ((await isFile(target)) && !(await confirmOverwrite(rl, file.target))) {
        skipped.push(file.target);
        continue;
      }

      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      installed.push(file.target);
    }

    if (installed.length > 0) {
      console.log("\n설치 완료:");
      for (const file of installed) console.log(`  + ${file}`);
    }
    if (skipped.length > 0) {
      console.log("\n유지된 기존 파일:");
      for (const file of skipped) console.log(`  - ${file}`);
    }

    console.log(
      "\nGitHub 저장소의 Settings > Secrets and variables > Actions에 OPENAI_API_KEY를 등록해 주세요.",
    );

    return { installed, skipped, mode: selectedMode };
  } finally {
    if (ownsReadline) rl.close();
  }
}
