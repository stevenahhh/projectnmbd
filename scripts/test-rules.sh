#!/usr/bin/env bash
# 규칙 13케이스 게이트 (S10) — Firestore 에뮬레이터 위에서 실행.
set -euo pipefail

# macOS 는 /usr/bin/java 스텁이 존재하되 실행은 실패한다 —
# 존재 여부가 아니라 실제 실행 성공 여부로 판정한다.
java_works() { java -version >/dev/null 2>&1; }

if ! java_works; then
  for candidate in "${JAVA_HOME:-}" /opt/homebrew/opt/openjdk@21 /opt/homebrew/opt/openjdk /usr/local/opt/openjdk; do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      export PATH="$candidate/bin:$PATH"
      java_works && break
    fi
  done
fi

if ! java_works; then
  echo "java 런타임이 필요합니다 (Firestore 에뮬레이터). brew install openjdk@21" >&2
  exit 1
fi

exec bunx firebase emulators:exec \
  --only firestore \
  --project demo-teamledger \
  "bunx vitest run tests/rules"
