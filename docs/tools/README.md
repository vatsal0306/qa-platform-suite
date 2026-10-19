# Docs generator

`data.py` is the single source of truth for requirements, seeded bugs and test cases.
`python docs/tools/build_docs.py` regenerates `seeded-bugs.md`, `bug-reports/*.md`, `jira-import.csv` and `test-cases.xlsx`
(needs `pip install openpyxl`). The workbook is written with formulas only; Excel computes them on open. To store cached values
for previewers, open and save it once in Excel/LibreOffice.
Edit `data.py`, not the generated files.
