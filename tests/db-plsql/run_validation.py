"""Load a fresh snapshot, run the PL/SQL validation package, print + export the result.

  python run_validation.py                                  # report only (exit 0)
  python run_validation.py --expect-clean                   # exit 1 if ANY violation  (fixed build gate)
  python run_validation.py --expect-detect BUG-004,BUG-007  # exit 1 if a listed bug is NOT found (seeded build)
"""
import argparse
import json
import os
import sys
from xml.sax.saxutils import escape

import oracledb

from load_snapshot import connect, fetch_orders, load


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--expect-clean", action="store_true")
    ap.add_argument("--expect-detect", default="", help="comma separated bug ids that must appear in the results")
    ap.add_argument("--no-load", action="store_true", help="skip reloading the snapshot from the API")
    ap.add_argument("--report-dir", default="reports")
    args = ap.parse_args()

    with connect() as conn:
        if not args.no_load:
            n_o, n_i = load(conn, fetch_orders())
            print(f"snapshot: {n_o} orders, {n_i} items")
        cur = conn.cursor()
        run_id = cur.callfunc("qa_validation.run_all", oracledb.NUMBER)
        cur.execute(
            """SELECT check_name, NVL(bug_ref, '-'), severity, COUNT(*)
                 FROM qa_validation_results WHERE run_id = :r
                GROUP BY check_name, bug_ref, severity ORDER BY 3, 1""",
            r=run_id,
        )
        rows = cur.fetchall()
        cur.execute("SELECT order_id, check_name, details FROM qa_validation_results WHERE run_id = :r ORDER BY 1, 2", r=run_id)
        details = cur.fetchall()

    total = sum(r[3] for r in rows)
    print(f"\nvalidation run {run_id}: {total} violation(s)")
    for check, bug, sev, n in rows:
        print(f"  {sev:<9} {check:<32} {bug:<8} {n}")

    os.makedirs(args.report_dir, exist_ok=True)
    with open(os.path.join(args.report_dir, "db-validation.json"), "w") as f:
        json.dump({"run_id": run_id, "violations": [
            {"order_id": o, "check": c, "details": d} for o, c, d in details]}, f, indent=2)

    found_bugs = {r[1] for r in rows}
    wanted = {b.strip() for b in args.expect_detect.split(",") if b.strip()}
    missing = sorted(wanted - found_bugs)

    # JUnit report so CI can show the DB layer next to the other suites
    cases = [f'<testcase classname="db.validation" name="clean run (no violations)">'
             + ("" if total == 0 or not args.expect_clean else f'<failure message="{total} violation(s)"/>') + "</testcase>"]
    for b in sorted(wanted):
        cases.append(f'<testcase classname="db.detection" name="detects {escape(b)}">'
                     + (f'<failure message="{escape(b)} not detected"/>' if b in missing else "") + "</testcase>")
    fails = sum("<failure" in c for c in cases)
    with open(os.path.join(args.report_dir, "db-validation.xml"), "w") as f:
        f.write(f'<testsuite name="db-validation" tests="{len(cases)}" failures="{fails}">{"".join(cases)}</testsuite>')

    if args.expect_clean and total:
        print("FAIL: expected a clean run")
        return 1
    if missing:
        print("FAIL: seeded bugs not detected by the DB layer:", ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
