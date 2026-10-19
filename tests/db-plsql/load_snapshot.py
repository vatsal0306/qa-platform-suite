"""Copy orders + items from the API export endpoint into the Oracle snapshot tables."""
import json
import os
import urllib.request
from datetime import datetime, timezone

import oracledb

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")
EXPORT_KEY = os.getenv("QA_EXPORT_KEY", "qa-export-key")


def connect():
    return oracledb.connect(
        user=os.getenv("ORACLE_USER", "qa"),
        password=os.getenv("ORACLE_PASSWORD", "qa_password"),
        dsn=os.getenv("ORACLE_DSN", "localhost:1521/XEPDB1"),
    )


def fetch_orders():
    req = urllib.request.Request(
        f"{API_BASE}/api/export/orders",
        headers={"X-QA-Export-Key": EXPORT_KEY, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)["data"]


def ts(value):
    """ISO-8601 (with offset) -> naive UTC datetime for TIMESTAMP columns."""
    if not value:
        return None
    return datetime.fromisoformat(value).astimezone(timezone.utc).replace(tzinfo=None)


def load(conn, orders):
    cur = conn.cursor()
    cur.execute("DELETE FROM qa_order_items")
    cur.execute("DELETE FROM qa_orders")
    cur.executemany(
        """INSERT INTO qa_orders (id, user_id, customer_name, status, total, payment_attempts,
                                  paid_at, shipped_at, created_at)
           VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)""",
        [(o["id"], o["user_id"], o["customer_name"][:100], o["status"], o["total"], o["payment_attempts"],
          ts(o["paid_at"]), ts(o["shipped_at"]), ts(o["created_at"])) for o in orders],
    )
    items = [(i["id"], o["id"], i["sku"], i["quantity"], i["unit_price"]) for o in orders for i in o["items"]]
    cur.executemany(
        "INSERT INTO qa_order_items (id, order_id, sku, quantity, unit_price) VALUES (:1, :2, :3, :4, :5)",
        items,
    )
    conn.commit()
    return len(orders), len(items)


if __name__ == "__main__":
    with connect() as c:
        n_orders, n_items = load(c, fetch_orders())
    print(f"loaded {n_orders} orders and {n_items} items")
