#!/usr/bin/env bash
# expect.sh <pass|fail> <command...>
#   pass: the command must succeed                       (fixed build: regression gate)
#   fail: the command must FAIL; success is an error     (seeded build: proves the suite detects the bugs)
set -u
mode="$1"; shift
"$@"; rc=$?
if [ "$mode" = "pass" ]; then exit $rc; fi
if [ $rc -eq 0 ]; then
  echo "::error::'$*' passed against the SEEDED build - the suite is not detecting the seeded bugs"
  exit 1
fi
echo "OK: '$*' failed against the seeded build as expected (rc=$rc)"
exit 0
