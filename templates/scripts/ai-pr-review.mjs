import { readFileSync } from "node:fs";
const MODEL = "gpt-5.4-mini";
const REVIEW_LANGUAGE = "Korean";
const MAX_CHARS = 80_000;
const DIFF_PATH = "reviewbite_diff.txt";

function requireEnvironment() {
  const required = [
    "OPENAI_API_KEY",
    "GITHUB_TOKEN",
    "GITHUB_REPOSITORY",
    "PR_NUMBER",
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length === 0) return;

  if (missing.includes("OPENAI_API_KEY")) {
    throw new Error(
      "OPENAI_API_KEY가 없습니다. GitHub 저장소의 Settings > Secrets and variables > Actions에서 등록해 주세요.",
    );
  }
  throw new Error(`필수 환경 변수가 없습니다: ${missing.join(", ")}`);
}

async function postComment(body) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER } = process.env;
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub PR 댓글 등록 실패 (${response.status}): ${detail}`,
    );
  }
}

function createPrompt(diff, truncated) {
  return `You are a senior software engineer performing a code review.
Review the diff without assuming a specific language, framework, or architecture.
Respond in ${REVIEW_LANGUAGE}.

Review criteria:
1. Correctness, bugs, and unintended behavior
2. Security vulnerabilities and exposed sensitive information
3. Error handling and important edge cases
4. Performance and resource usage
5. Readability, maintainability, and unnecessary complexity
6. Duplication, naming, and consistency
7. Missing or insufficient tests

Format:
- 🔴 **Critical** — must fix
- 🟡 **Warning** — recommended fix
- 🟢 **Suggestion** — improvement idea
- ✅ **Good** — well done

Reference concrete files and changed lines when possible.
Keep feedback concise and actionable.
If there are no meaningful issues, give a short positive summary.

\`\`\`diff
${diff}
\`\`\`
${truncated ? "\n> ⚠️ diff가 너무 커서 앞부분만 리뷰되었습니다." : ""}`;
}

async function main() {
  requireEnvironment();

  let diff = readFileSync(DIFF_PATH, "utf8");
  if (!diff.trim()) {
    console.log("변경사항이 없어 리뷰를 건너뜁니다.");
    return;
  }

  const truncated = diff.length > MAX_CHARS;
  if (truncated) diff = diff.slice(0, MAX_CHARS);

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: MODEL,
    input: [{ role: "user", content: createPrompt(diff, truncated) }],
    max_output_tokens: 2_000,
  });

  const review = response.output_text;
  if (!review?.trim()) {
    console.log("리뷰 내용이 없어 댓글 등록을 건너뜁니다.");
    return;
  }

  await postComment(
    `## AI 코드 리뷰\n\n${review}\n\n---\n*Powered by OpenAI ${MODEL}*`,
  );
  console.log("Pull Request에 리뷰 댓글을 등록했습니다.");
}

main().catch((error) => {
  console.error(`AI 코드 리뷰 실패: ${error.message}`);
  process.exit(1);
});
