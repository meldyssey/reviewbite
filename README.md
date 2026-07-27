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

GitHub Actions는 OpenAI Node SDK `6.0.0`을 임시로 설치하며 대상 저장소의
`package.json`에는 의존성을 저장하지 않습니다.

## 개발

```bash
npm run check
npm test
npm pack --dry-run
```
