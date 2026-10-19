# Mobile tests (Playwright device emulation)

iOS and Android are covered with **emulated devices** (WebKit = iOS Safari engine, Chromium = Android Chrome engine).
This is a deliberate trade-off: real iOS hardware needs a Mac or a device cloud (BrowserStack, Sauce Labs, AWS Device Farm).
To run on real devices, point the same specs at a device cloud's Playwright integration (see docs/test-plan.md, section 7).

```bash
cd tests/mobile && npm install && npm run install-browsers && npm test
```
