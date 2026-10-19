-- Snapshot tables loaded from the API export (/api/export/orders), plus the validation result log.
-- Re-runnable: drops existing objects first (ORA-00942 / ORA-02289 ignored).

BEGIN
  FOR t IN (SELECT column_value AS name FROM TABLE(sys.odcivarchar2list(
              'QA_VALIDATION_RESULTS', 'QA_ORDER_ITEMS', 'QA_ORDERS'))) LOOP
    BEGIN
      EXECUTE IMMEDIATE 'DROP TABLE ' || t.name || ' PURGE';
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE != -942 THEN RAISE; END IF;
    END;
  END LOOP;
  BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE qa_run_seq';
  EXCEPTION WHEN OTHERS THEN
    IF SQLCODE != -2289 THEN RAISE; END IF;
  END;
END;
/

CREATE TABLE qa_orders (
  id                NUMBER(19)     PRIMARY KEY,
  user_id           NUMBER(19)     NOT NULL,
  customer_name     VARCHAR2(100)  NOT NULL,
  status            VARCHAR2(20)   NOT NULL,
  total             NUMBER(12,2)   NOT NULL,
  payment_attempts  NUMBER(5)      NOT NULL,
  paid_at           TIMESTAMP,
  shipped_at        TIMESTAMP,
  created_at        TIMESTAMP
);

-- Deliberately NO check constraints on quantity / unit_price / status:
-- the snapshot must be able to hold bad data so the validation package can find and report it.
CREATE TABLE qa_order_items (
  id          NUMBER(19)    PRIMARY KEY,
  order_id    NUMBER(19)    NOT NULL REFERENCES qa_orders (id),
  sku         VARCHAR2(32)  NOT NULL,
  quantity    NUMBER(10)    NOT NULL,
  unit_price  NUMBER(10,2)  NOT NULL
);

CREATE INDEX qa_order_items_order_ix ON qa_order_items (order_id);

CREATE SEQUENCE qa_run_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE qa_validation_results (
  run_id      NUMBER(10)     NOT NULL,
  check_name  VARCHAR2(60)   NOT NULL,
  bug_ref     VARCHAR2(10),
  severity    VARCHAR2(10)   NOT NULL,
  order_id    NUMBER(19),
  details     VARCHAR2(400),
  checked_at  TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX qa_validation_results_run_ix ON qa_validation_results (run_id);
