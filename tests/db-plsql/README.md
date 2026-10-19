# PL/SQL database validation (Oracle XE)

The app itself runs on MySQL. This layer takes a **snapshot of the data the other suites created** (via the key-protected
`/api/export/orders` endpoint), loads it into Oracle, and runs a PL/SQL package of integrity checks. It finds defects
that API responses alone can hide (double charges, shipped-but-unpaid orders, totals that do not match line items...).

| Check (`qa_validation`)         | Detects  |
|---------------------------------|----------|
| `TOTAL_MATCHES_ITEMS`           | BUG-007  |
| `QTY_POSITIVE`                  | BUG-002  |
| `SINGLE_PAYMENT`                | BUG-004  |
| `SHIPPED_WAS_PAID`              | BUG-005  |
| `CANCELLED_NOT_SHIPPED`         | BUG-010  |
| `STATUS_VALID`, `PAYMENT_TIMESTAMP_CONSISTENT`, `ORDER_HAS_ITEMS` | general integrity |

```bash
docker compose --profile db up -d oracle          # gvenzl/oracle-xe, ~1-2 min first start
pip install -r requirements.txt
# one-off: create the schema + package (SQLcl / SQL*Plus / SQL Developer), user qa / qa_password, service XEPDB1
#   @sql/01_schema.sql   @sql/02_pkg_qa_validation.sql
python run_validation.py                           # after the API / UI suites have run
python run_validation.py --expect-clean            # fixed build gate
python run_validation.py --expect-detect BUG-002,BUG-004,BUG-005,BUG-007,BUG-010   # seeded build
```
`setup_db.py` applies both SQL files for you (used by CI): `python setup_db.py`.
