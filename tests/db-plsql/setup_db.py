"""Apply sql/01_schema.sql and sql/02_pkg_qa_validation.sql (statements split on a lone '/' line)."""
import re
from pathlib import Path

from load_snapshot import connect

SQL_DIR = Path(__file__).parent / "sql"


def strip_comments(block: str) -> str:
    return "\n".join(l for l in block.splitlines() if not l.strip().startswith("--")).strip()


def statements(text: str):
    # PL/SQL blocks end with a line containing only '/', plain SQL ends with ';'
    for block in re.split(r"(?m)^/\s*$", text):
        block = strip_comments(block)
        if not block or block.upper().startswith("SHOW ERRORS"):
            continue
        if re.match(r"(?is)^(BEGIN|DECLARE|CREATE\s+(OR\s+REPLACE\s+)?(PACKAGE|PROCEDURE|FUNCTION|TRIGGER))", block):
            yield block
        else:
            for part in block.split(";"):
                part = part.strip()
                if part:
                    yield part


if __name__ == "__main__":
    with connect() as conn:
        cur = conn.cursor()
        for name in ("01_schema.sql", "02_pkg_qa_validation.sql"):
            for stmt in statements((SQL_DIR / name).read_text()):
                cur.execute(stmt)
            print("applied", name)
        cur.execute("SELECT object_name, status FROM user_objects WHERE object_name = 'QA_VALIDATION'")
        for row in cur.fetchall():
            print(row)
