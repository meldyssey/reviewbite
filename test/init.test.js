import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { init } from "../src/init.js";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const CLI_PATH = path.join(PROJECT_ROOT, "bin/cli.js");

function createGitRepository() {
  const directory = mkdtempSync(path.join(tmpdir(), "reviewbite-test-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: directory });
  return directory;
}

function runCli(cwd, args, input) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    input,
  });
}

test("--commit은 커밋 리뷰 파일만 설치한다", () => {
  const repository = createGitRepository();
  const result = runCli(repository, ["init", "--commit"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /설치 완료/);
  assert.equal(
    readFileSync(
      path.join(repository, ".github/scripts/ai-commit-review.mjs"),
      "utf8",
    ).includes('const MODEL = "gpt-5.4-mini"'),
    true,
  );
  assert.throws(() =>
    readFileSync(
      path.join(repository, ".github/scripts/ai-pr-review.mjs"),
      "utf8",
    ),
  );
});

test("--all은 네 파일을 모두 설치한다", () => {
  const repository = createGitRepository();
  const result = runCli(repository, ["init", "--all"]);

  assert.equal(result.status, 0, result.stderr);
  for (const file of [
    ".github/workflows/ai-commit-review.yml",
    ".github/workflows/ai-pr-review.yml",
    ".github/scripts/ai-commit-review.mjs",
    ".github/scripts/ai-pr-review.mjs",
  ]) {
    assert.doesNotThrow(() => readFileSync(path.join(repository, file)));
  }
});

test("대화형 메뉴에서 PR 리뷰를 선택할 수 있다", () => {
  const repository = createGitRepository();
  const result = runCli(repository, ["init"], "2\n");

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotThrow(() =>
    readFileSync(
      path.join(repository, ".github/workflows/ai-pr-review.yml"),
      "utf8",
    ),
  );
});

test("기존 파일은 확인 없이 덮어쓰지 않는다", async () => {
  const repository = createGitRepository();
  const target = path.join(
    repository,
    ".github/workflows/ai-commit-review.yml",
  );
  execFileSync("mkdir", ["-p", path.dirname(target)]);
  writeFileSync(target, "keep me\n");

  const answers = ["n"];
  const readline = {
    question: async () => answers.shift(),
  };
  const result = await init(["--commit"], { cwd: repository, readline });

  assert.equal(readFileSync(target, "utf8"), "keep me\n");
  assert.deepEqual(result.skipped, [
    ".github/workflows/ai-commit-review.yml",
  ]);
  assert.deepEqual(result.installed, [
    ".github/scripts/ai-commit-review.mjs",
  ]);
});

test("Git 저장소 하위 폴더에서는 설치하지 않는다", () => {
  const repository = createGitRepository();
  const child = path.join(repository, "packages/app");
  execFileSync("mkdir", ["-p", child]);

  const result = runCli(child, ["init", "--pr"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Git 저장소 최상위 폴더/);
});

test("API key가 없으면 등록 방법을 안내한다", () => {
  const repository = createGitRepository();
  writeFileSync(path.join(repository, "reviewbite_diff.txt"), "diff --git\n");

  const result = spawnSync(
    process.execPath,
    [path.join(PROJECT_ROOT, "templates/scripts/ai-commit-review.mjs")],
    {
      cwd: repository,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "" },
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Settings > Secrets and variables > Actions/);
});
