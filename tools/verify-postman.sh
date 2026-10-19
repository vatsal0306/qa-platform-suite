#!/usr/bin/env bash
# Sanity check of the Postman suite against the reference mock API (no PHP/MySQL/Docker needed).
#   fixed build  -> every assertion must pass, on every run
#   seeded build -> the suite must fail, with the SAME number of failures on every run
# Each build is run twice against ONE server instance (persistent data), which catches tests that only
# detect a bug the first time and pass for the wrong reason afterwards.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8000}"
RUNS="${RUNS:-2}"
run() {   # run <env assignment> <out prefix>  -> prints failed-assertion counts, one per run
  local env_assign="$1" out="$2"
  env "$env_assign" PORT="$PORT" node "$ROOT/tools/mock-api/server.js" >/dev/null 2>&1 & local pid=$!
  sleep 1
  local counts=()
  for i in $(seq 1 "$RUNS"); do
    ( cd "$ROOT/tests/postman" && npx newman run qa-orders.postman_collection.json -e local.postman_environment.json \
        --env-var "baseUrl=http://localhost:$PORT" --reporters json --reporter-json-export "$out.$i.json" >/dev/null 2>&1 )
    counts+=("$(node -e 'console.log(require(process.argv[1]).run.stats.assertions.failed)' "$out.$i.json")")
  done
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
  echo "${counts[*]}"
}
TMP="$(mktemp -d)"
FIXED=$(run SEEDED_BUGS=false "$TMP/fixed")
SEEDED=$(run SEEDED_BUGS=true "$TMP/seeded")
echo "fixed build  : failed assertions per run = $FIXED (expected all 0)"
echo "seeded build : failed assertions per run = $SEEDED (expected identical, > 0)"
ok=1
for n in $FIXED; do [ "$n" = "0" ] || ok=0; done
first="${SEEDED%% *}"
for n in $SEEDED; do [ "$n" = "$first" ] || ok=0; done
[ "$first" -gt 0 ] || ok=0
[ $ok = 1 ] && echo "OK" || { echo "FAILED"; exit 1; }
