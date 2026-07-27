#!/usr/bin/env node

import { init } from "../src/init.js";

const HELP = `reviewbite

사용법:
  reviewbite init
  reviewbite init --commit
  reviewbite init --pr
  reviewbite init --all

옵션:
  --commit  커밋 리뷰만 설치
  --pr      Pull Request 리뷰만 설치
  --all     커밋 리뷰와 Pull Request 리뷰 모두 설치
  -h, --help  도움말 표시`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  const command = args.shift();
  if (command !== "init") {
    if (command) {
      console.error(`알 수 없는 명령어입니다: ${command}\n`);
    }
    console.log(HELP);
    process.exitCode = 1;
    return;
  }

  await init(args);
}

main().catch((error) => {
  console.error(`reviewbite init 실패: ${error.message}`);
  process.exitCode = 1;
});
