# Android C-3 Min Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal Android device verification script for the current phone and current debug seed so C-3 overlap behavior can be re-run with one command.

**Architecture:** Add one bash script under `scripts/` that rebuilds the embedded Android bundle, assembles and installs the debug APK, validates the Reader page on the connected phone, performs one comment tap and one highlight tap, and saves screenshots/UI dumps into a timestamped evidence directory. Expose it through `package.json` and document the scope and limitations in the existing C-3 project document.

**Tech Stack:** Bash, ADB, Expo export:embed, Gradle assembleDebug, React Native debug APK, UIAutomator dump

---

### Task 1: Add Android minimal verification script

**Files:**
- Create: `scripts/verify-android-c3-min.sh`

- [ ] **Step 1: Write the script with fixed device id, page precheck, evidence capture, and two tap assertions**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEVICE_ID="${ANDROID_C3_DEVICE_ID:-EP0110MZ0BB291436W}"
JAVA_HOME_VALUE="${ANDROID_C3_JAVA_HOME:-/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home}"
APP_ID="com.anonymous.native_reader"
MAIN_ACTIVITY="${APP_ID}/.MainActivity"
EVIDENCE_DIR="${ANDROID_C3_EVIDENCE_DIR:-.trae/evidence/android_verify_$(date +%Y%m%d_%H%M%S)}"
COMMENT_TAP_X="${ANDROID_C3_COMMENT_TAP_X:-__COMMENT_X__}"
COMMENT_TAP_Y="${ANDROID_C3_COMMENT_TAP_Y:-__COMMENT_Y__}"
HIGHLIGHT_TAP_X="${ANDROID_C3_HIGHLIGHT_TAP_X:-700}"
HIGHLIGHT_TAP_Y="${ANDROID_C3_HIGHLIGHT_TAP_Y:-988}"
```

- [ ] **Step 2: Verify the fixed coordinates manually once before finalizing the script**

Run:

```bash
adb -s EP0110MZ0BB291436W shell dumpsys window | rg 'mCurrentFocus|mFocusedApp'
adb -s EP0110MZ0BB291436W shell uiautomator dump /sdcard/coord_check.xml >/dev/null
adb -s EP0110MZ0BB291436W shell cat /sdcard/coord_check.xml | rg '第1页|本页词汇|The roots of science'
```

Expected: front app is `com.anonymous.native_reader/.MainActivity` and Reader keywords are present before tapping.

- [ ] **Step 3: Run the finished script once end-to-end**

Run:

```bash
scripts/verify-android-c3-min.sh
```

Expected: exit code `0`, evidence directory created, comment tap reports `评论`, highlight tap reports `高亮`.

### Task 2: Expose the script via package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add npm entrypoint**

```json
"verify:android-c3-min": "scripts/verify-android-c3-min.sh"
```

- [ ] **Step 2: Verify npm script resolves correctly**

Run:

```bash
npm run verify:android-c3-min -- --help
```

Expected: script starts from npm entrypoint. If `--help` is not implemented, run the script normally instead and confirm npm resolves the file.

### Task 3: Document scope and usage

**Files:**
- Modify: `.trae/documents/cross_language_reader_app_plan.md`

- [ ] **Step 1: Document the new minimal Android verification entrypoint**

Add:

```md
- 最小版 Android 真机验证入口：`npm run verify:android-c3-min`
- 适用范围：仅当前设备 `EP0110MZ0BB291436W` + 当前 debug seed + 当前页面布局
- 输出：时间戳 evidence 目录，包含点击前后截图和 UI dump
```

- [ ] **Step 2: Record limitations explicitly**

Add:

```md
- 该脚本未做分辨率适配、OCR 定位或通用坐标推导；如果设备、字号、布局变化，需要重新校准固定坐标。
```

### Task 4: Verification

**Files:**
- Test: `scripts/verify-android-c3-min.sh`
- Test: `package.json`
- Test: `.trae/documents/cross_language_reader_app_plan.md`

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code `0`.

- [ ] **Step 2: Run Jest**

Run:

```bash
npm test -- --runInBand
```

Expected: all suites pass.

- [ ] **Step 3: Run Android minimal verification**

Run:

```bash
npm run verify:android-c3-min
```

Expected: rebuild/install succeeds, comment tap opens `评论`, highlight tap opens `高亮`, evidence files are saved.
