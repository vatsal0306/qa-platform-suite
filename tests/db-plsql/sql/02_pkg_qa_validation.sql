-- Data-integrity checks that run AFTER the API/UI suites have created data.
-- Each check is one INSERT ... SELECT that logs a row per violating order.

CREATE OR REPLACE PACKAGE qa_validation AS
  c_cents_tolerance CONSTANT NUMBER := 0.005;

  -- Runs every check and returns the run id (rows are in qa_validation_results).
  FUNCTION run_all RETURN NUMBER;

  FUNCTION violation_count (p_run_id IN NUMBER) RETURN NUMBER;

  -- Raises ORA-20001 when the run has violations (use as a CI gate on the fixed build).
  PROCEDURE assert_clean (p_run_id IN NUMBER);
END qa_validation;
/

CREATE OR REPLACE PACKAGE BODY qa_validation AS

  PROCEDURE chk_total_matches_items (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'TOTAL_MATCHES_ITEMS', 'BUG-007', 'HIGH', o.id,
           'order total ' || TO_CHAR(o.total) || ' but line items sum to ' || TO_CHAR(NVL(s.line_total, 0))
      FROM qa_orders o
      LEFT JOIN (SELECT order_id, SUM(quantity * unit_price) AS line_total
                   FROM qa_order_items GROUP BY order_id) s ON s.order_id = o.id
     WHERE ABS(o.total - NVL(s.line_total, 0)) > c_cents_tolerance;
  END;

  PROCEDURE chk_quantity_positive (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'QTY_POSITIVE', 'BUG-002', 'HIGH', i.order_id,
           'item ' || i.sku || ' has quantity ' || TO_CHAR(i.quantity) || ' (allowed 1..1000)'
      FROM qa_order_items i
     WHERE i.quantity < 1 OR i.quantity > 1000;
  END;

  PROCEDURE chk_status_valid (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'STATUS_VALID', NULL, 'HIGH', o.id, 'unknown status ' || o.status
      FROM qa_orders o
     WHERE o.status NOT IN ('created', 'paid', 'shipped', 'cancelled');
  END;

  PROCEDURE chk_single_payment (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'SINGLE_PAYMENT', 'BUG-004', 'CRITICAL', o.id,
           'order was paid ' || TO_CHAR(o.payment_attempts) || ' times (double charge)'
      FROM qa_orders o
     WHERE o.payment_attempts > 1;
  END;

  PROCEDURE chk_shipped_was_paid (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'SHIPPED_WAS_PAID', 'BUG-005', 'CRITICAL', o.id,
           'order shipped without a payment (paid_at is null)'
      FROM qa_orders o
     WHERE o.shipped_at IS NOT NULL AND o.paid_at IS NULL;
  END;

  PROCEDURE chk_payment_timestamps (p_run NUMBER) IS
  BEGIN
    -- paid / shipped orders must carry a payment timestamp, created orders must not
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'PAYMENT_TIMESTAMP_CONSISTENT', NULL, 'MEDIUM', o.id,
           'status ' || o.status || ' inconsistent with paid_at / payment_attempts'
      FROM qa_orders o
     WHERE (o.status = 'paid' AND o.paid_at IS NULL)
        OR (o.status = 'created' AND (o.paid_at IS NOT NULL OR o.payment_attempts > 0));
  END;

  PROCEDURE chk_cancelled_not_shipped (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'CANCELLED_NOT_SHIPPED', 'BUG-010', 'HIGH', o.id,
           'cancelled order has shipped_at set (cancelled after shipping)'
      FROM qa_orders o
     WHERE o.status = 'cancelled' AND o.shipped_at IS NOT NULL;
  END;

  PROCEDURE chk_order_has_items (p_run NUMBER) IS
  BEGIN
    INSERT INTO qa_validation_results (run_id, check_name, bug_ref, severity, order_id, details)
    SELECT p_run, 'ORDER_HAS_ITEMS', NULL, 'MEDIUM', o.id, 'order has no line items'
      FROM qa_orders o
     WHERE NOT EXISTS (SELECT 1 FROM qa_order_items i WHERE i.order_id = o.id);
  END;

  FUNCTION run_all RETURN NUMBER IS
    v_run NUMBER := qa_run_seq.NEXTVAL;
  BEGIN
    chk_total_matches_items(v_run);
    chk_quantity_positive(v_run);
    chk_status_valid(v_run);
    chk_single_payment(v_run);
    chk_shipped_was_paid(v_run);
    chk_payment_timestamps(v_run);
    chk_cancelled_not_shipped(v_run);
    chk_order_has_items(v_run);
    COMMIT;
    RETURN v_run;
  END run_all;

  FUNCTION violation_count (p_run_id IN NUMBER) RETURN NUMBER IS
    v_n NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_n FROM qa_validation_results WHERE run_id = p_run_id;
    RETURN v_n;
  END violation_count;

  PROCEDURE assert_clean (p_run_id IN NUMBER) IS
    v_n NUMBER := violation_count(p_run_id);
  BEGIN
    IF v_n > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'Data validation run ' || p_run_id || ' found ' || v_n || ' violation(s)');
    END IF;
  END assert_clean;

END qa_validation;
/

SHOW ERRORS
