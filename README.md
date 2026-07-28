# reviewbite

GitHub 저장소에 사용자가 직접 수정할 수 있는 OpenAI 코드 리뷰 workflow와
스크립트를 설치하는 CLI입니다.

## 요구 사항

- Node.js 20 이상
- GitHub 저장소
- OpenAI API key

## 설치

설치할 Git 저장소의 최상위 폴더에서 실행합니다.

```bash
npx reviewbite init
```

대화형 메뉴에서 커밋 리뷰, PR 리뷰 또는 둘 다를 선택할 수 있습니다.

옵션으로 바로 선택할 수도 있습니다.

```bash
npx reviewbite init --commit
npx reviewbite init --pr
npx reviewbite init --all
```

## 생성 파일

커밋 리뷰:

```text
.github/workflows/ai-commit-review.yml
.github/scripts/ai-commit-review.mjs
```

PR 리뷰:

```text
.github/workflows/ai-pr-review.yml
.github/scripts/ai-pr-review.mjs
```

같은 파일이 이미 있으면 덮어쓸지 파일마다 확인합니다.

## GitHub Secret 설정

저장소에서 `Settings > Secrets and variables > Actions`로 이동하여 다음
Repository Secret을 추가합니다.

```text
OPENAI_API_KEY
```

이후 `main` 브랜치에 push하거나 Pull Request를 열면 선택한 workflow가
실행됩니다.

## 리뷰 설정 변경

생성된 `.mjs` 파일에서 모델, 언어, 최대 diff 길이와 프롬프트를 직접
수정할 수 있습니다.

```js
const MODEL = "gpt-5.4-mini";
const REVIEW_LANGUAGE = "Korean";
const MAX_CHARS = 80_000;
```

GitHub Actions는 OpenAI Node SDK `6.0.0`을 lifecycle script 실행과 lock
파일 변경 없이 임시로 설치하며 대상 저장소의 `package.json`에는 의존성을
저장하지 않습니다.

## 보안과 데이터 처리

Reviewbite는 코드 리뷰를 위해 commit 또는 PR의 diff를 OpenAI API로
전송합니다. 비밀번호, API key, 인증서, 개인정보 등 외부 서비스로
전송하면 안 되는 정보는 Git에 커밋하지 마세요.

PR 리뷰 workflow는 Secret을 사용하는 코드와 리뷰 대상 코드를 분리합니다.
신뢰할 수 있는 base commit의 리뷰 스크립트만 실행하고, PR 변경사항은
GitHub API에서 diff 텍스트로만 내려받습니다. PR branch의 코드나 스크립트는
checkout하거나 실행하지 않습니다.

현재 PR 리뷰는 원본 저장소 안에서 만든 branch의 PR에만 실행됩니다. 외부
fork에서 보낸 PR은 `OPENAI_API_KEY` 보호를 위해 자동 리뷰하지 않습니다.

> [!CAUTION]
> Reviewbite는 base commit의 `.github/scripts/ai-pr-review.mjs`를 신뢰하고
> `OPENAI_API_KEY`와 `GITHUB_TOKEN`을 전달해 실행합니다. 악성 변경이 기본
> 브랜치에 merge되면 이후 workflow에서 Secret이 유출될 수 있습니다.
> 기본 브랜치 직접 push를 제한하고, PR 승인과 필수 status check를
> 적용하세요. 가능하면 `CODEOWNERS`로 `.github/scripts/`와
> `.github/workflows/` 변경에 신뢰할 수 있는 관리자의 승인을 요구하세요.

설치 후 workflow를 수정할 때 `pull_request_target`에서 PR의 head SHA,
`github.head_ref` 또는 PR 작성자의 branch를 checkout해 실행하지 마세요.

## 개발

```bash
npm run check
npm test
npm pack --dry-run
```
