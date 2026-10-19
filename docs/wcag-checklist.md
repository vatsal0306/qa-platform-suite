# Manual WCAG 2.1 AA checklist

Automated tools (axe-core) find roughly a third to half of WCAG problems. This checklist covers the rest. Fill in the
**Result** column per release. "Expected on seeded build" shows what the deliberate defects should produce; on the fixed
build everything should pass.

Test with: keyboard only, a screen reader (NVDA + Firefox/Chrome on Windows, VoiceOver + Safari on macOS/iOS, TalkBack on Android),
200% and 400% zoom, a 320 CSS px wide viewport, and a colour-contrast tool (axe DevTools / WebAIM Contrast Checker).

| SC | Level | Check | How | Expected on seeded build | Result |
|---|---|---|---|---|---|
| 1.1.1 Non-text content | A | Images/icons have text alternatives or are hidden from AT | Inspect; screen reader | Pass (no images) | |
| 1.3.1 Info and relationships | A | Inputs have programmatic labels; table has headers/caption; headings are real headings | axe + screen reader | **Fail: BUG-011** (login form) | |
| 1.3.5 Identify input purpose | AA | Login fields carry `autocomplete` values | Inspect | **Fail: BUG-011** | |
| 1.4.1 Use of colour | A | Status is not conveyed by colour alone | Visual | Pass (text label) | |
| 1.4.3 Contrast (minimum) | AA | Text >= 4.5:1 (3:1 large) | Contrast tool | **Fail: BUG-012** (status badge) | |
| 1.4.4 Resize text | AA | 200% zoom without loss of content | Browser zoom | Pass | |
| 1.4.10 Reflow | AA | No 2-D scrolling at 320 px / 400% zoom | Resize | **Fail: BUG-013** (orders table) | |
| 1.4.11 Non-text contrast | AA | Inputs, buttons, focus ring >= 3:1 | Contrast tool | Verify | |
| 1.4.12 Text spacing | AA | No loss with increased spacing | Text-spacing bookmarklet | Verify | |
| 2.1.1 Keyboard | A | Every action reachable and operable by keyboard | Tab / Enter / Space | **Fail: BUG-014** (Pay) | |
| 2.1.2 No keyboard trap | A | Focus can always move away | Tab / Shift+Tab | Pass | |
| 2.4.2 Page titled | A | Descriptive `<title>` | Inspect | Pass (static "QA Orders"; see note) | |
| 2.4.3 Focus order | A | Order matches visual / logical order | Tab through | Verify | |
| 2.4.6 Headings and labels | AA | Headings/labels describe purpose | Screen reader | Verify | |
| 2.4.7 Focus visible | AA | Visible focus indicator on every control | Tab through | Verify | |
| 2.5.3 Label in name | A | Visible label text is in the accessible name | Voice control / inspect | Verify | |
| 3.1.1 Language of page | A | `<html lang>` set | Inspect | Pass | |
| 3.2.2 On input | A | Changing a field does not trigger a context change | Manual | Pass | |
| 3.3.1 Error identification | A | Errors identified in text | Submit invalid forms | **Fail: BUG-015** (login) | |
| 3.3.2 Labels or instructions | A | Fields have visible labels / instructions | Visual | **Fail: BUG-011** (placeholders only) | |
| 3.3.3 Error suggestion | AA | Errors suggest how to fix | Submit invalid forms | Verify | |
| 4.1.2 Name, role, value | A | Custom controls expose name/role/state | axe + screen reader | **Fail: BUG-014, BUG-011** | |
| 4.1.3 Status messages | AA | Errors/results announced without focus move (`role=alert`) | Screen reader | **Fail: BUG-015** | |

Note on 2.4.2: in a single-page app the document title should change per view for full benefit; the app keeps one title.
This is recorded as an observation, not a seeded defect.

Also verified automatically: WCAG 2.2 AA target size 2.5.8 (24x24 CSS px) in `tests/mobile`.
