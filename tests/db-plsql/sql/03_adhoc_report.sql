-- Run in SQL*Plus / SQLcl / SQL Developer after qa_validation.run_all:
--   EXEC DBMS_OUTPUT.PUT_LINE(qa_validation.run_all);
SET LINESIZE 200 PAGESIZE 100
COLUMN check_name FORMAT A32
COLUMN bug_ref    FORMAT A8
COLUMN details    FORMAT A90

SELECT run_id, check_name, bug_ref, severity, COUNT(*) AS violations
  FROM qa_validation_results
 WHERE run_id = (SELECT MAX(run_id) FROM qa_validation_results)
 GROUP BY run_id, check_name, bug_ref, severity
 ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, check_name;

SELECT order_id, check_name, details
  FROM qa_validation_results
 WHERE run_id = (SELECT MAX(run_id) FROM qa_validation_results)
 ORDER BY order_id, check_name;
