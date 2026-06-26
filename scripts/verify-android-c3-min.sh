#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: scripts/verify-android-c3-min.sh

Minimal Android C-3 verification for the current phone and current debug seed.
Runs typecheck, Jest, Android rebuild/install, comment tap verification, and highlight tap verification.
EOF
  exit 0
fi

DEVICE_ID="${ANDROID_C3_DEVICE_ID:-EP0110MZ0BB291436W}"
JAVA_HOME_VALUE="${ANDROID_C3_JAVA_HOME:-/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home}"
APP_ID="com.anonymous.native_reader"
MAIN_ACTIVITY="${APP_ID}/.MainActivity"
EVIDENCE_DIR="${ANDROID_C3_EVIDENCE_DIR:-.trae/evidence/android_verify_$(date +%Y%m%d_%H%M%S)}"
COMMENT_TAP_X="${ANDROID_C3_COMMENT_TAP_X:-557}"
COMMENT_TAP_Y="${ANDROID_C3_COMMENT_TAP_Y:-1092}"
HIGHLIGHT_TAP_X="${ANDROID_C3_HIGHLIGHT_TAP_X:-700}"
HIGHLIGHT_TAP_Y="${ANDROID_C3_HIGHLIGHT_TAP_Y:-988}"
HIGHLIGHT_FALLBACK_TAP_X="${ANDROID_C3_HIGHLIGHT_FALLBACK_TAP_X:-750}"
HIGHLIGHT_FALLBACK_TAP_Y="${ANDROID_C3_HIGHLIGHT_FALLBACK_TAP_Y:-1044}"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
BUNDLE_PATH="android/app/src/main/assets/index.android.bundle"
SUMMARY_FILE="${EVIDENCE_DIR}/summary.txt"
CURRENT_STAGE="bootstrap"

mkdir -p "$EVIDENCE_DIR"
touch "$SUMMARY_FILE"

echo "[verify-android-c3-min] evidence dir: $EVIDENCE_DIR"

note() {
  echo "$1" | tee -a "$SUMMARY_FILE"
}

fail() {
  note "[verify-android-c3-min] FAILED at stage: ${CURRENT_STAGE}"
  note "[verify-android-c3-min] evidence dir: ${EVIDENCE_DIR}"
  note "[verify-android-c3-min] reason: $1"
  exit 1
}

require_device() {
  adb devices -l | rg -q "^${DEVICE_ID}[[:space:]]+device\\b" || {
    fail "device ${DEVICE_ID} not available"
  }
}

start_reader() {
  adb -s "$DEVICE_ID" shell am start -n "$MAIN_ACTIVITY" >/dev/null
  sleep 2
}

assert_reader_page() {
  local label="$1"
  local focus_output page_dump attempt
  for attempt in 1 2 3 4 5; do
    focus_output="$(adb -s "$DEVICE_ID" shell dumpsys window | rg 'mCurrentFocus|mFocusedApp' || true)"
    page_dump="$(adb -s "$DEVICE_ID" shell uiautomator dump /sdcard/android_verify_current.xml >/dev/null && adb -s "$DEVICE_ID" shell cat /sdcard/android_verify_current.xml || true)"

    echo "$focus_output" > "${EVIDENCE_DIR}/${label}_focus.txt"
    printf '%s' "$page_dump" > "${EVIDENCE_DIR}/${label}_page.xml"

    if echo "$focus_output" | rg -q "${APP_ID}/.MainActivity" \
      && printf '%s' "$page_dump" | rg -q '第1页|本页词汇|The roots of science|原文|译文|双语'; then
      return 0
    fi

    sleep 2
  done

  if echo "$focus_output" | rg -q 'AlternateBouncerView'; then
    fail "system biometric overlay is covering the app during ${label}; unlock or dismiss the overlay before rerunning"
  fi

  if printf '%s' "$page_dump" | rg -q '面部、指纹识别中|指纹传感器'; then
    fail "system biometric overlay text is present during ${label}; unlock or dismiss the overlay before rerunning"
  fi

  if ! echo "$focus_output" | rg -q "${APP_ID}/.MainActivity"; then
    fail "app is not in foreground during ${label}"
  fi

  fail "reader page keywords missing during ${label}"
}

capture_screen() {
  local name="$1"
  adb -s "$DEVICE_ID" exec-out screencap -p > "${EVIDENCE_DIR}/${name}.png"
}

capture_dump() {
  local name="$1"
  adb -s "$DEVICE_ID" shell uiautomator dump "/sdcard/${name}.xml" >/dev/null
  adb -s "$DEVICE_ID" shell cat "/sdcard/${name}.xml" > "${EVIDENCE_DIR}/${name}.xml"
}

assert_dump_contains() {
  local dump_name="$1"
  local expected_regex="$2"
  rg -q "$expected_regex" "${EVIDENCE_DIR}/${dump_name}.xml" || {
    fail "expected pattern not found in ${dump_name}.xml: ${expected_regex}"
  }
}

try_highlight_probe() {
  local label="$1"
  local tap_x="$2"
  local tap_y="$3"

  adb -s "$DEVICE_ID" shell am force-stop "$APP_ID" >/dev/null
  sleep 1
  start_reader
  assert_reader_page "reader_before_highlight_${label}"
  capture_screen "reader_before_highlight_${label}"
  capture_dump "reader_before_highlight_${label}"

  note "[verify-android-c3-min] tap non-overlapped highlight (${label}) at ${tap_x},${tap_y}"
  adb -s "$DEVICE_ID" shell input tap "$tap_x" "$tap_y"
  sleep 1
  capture_screen "highlight_after_${label}"
  capture_dump "highlight_after_${label}"

  if rg -q '高亮' "${EVIDENCE_DIR}/highlight_after_${label}.xml" \
    && rg -q 'How may this knowledge help us to comprehend the world and hence guide' "${EVIDENCE_DIR}/highlight_after_${label}.xml" \
    && rg -q '添加评论|删除|关闭' "${EVIDENCE_DIR}/highlight_after_${label}.xml"; then
    return 0
  fi

  return 1
}

CURRENT_STAGE="device_check"
note "[verify-android-c3-min] checking device"
require_device

CURRENT_STAGE="typecheck"
note "[verify-android-c3-min] npm run typecheck"
npm run typecheck

CURRENT_STAGE="jest"
note "[verify-android-c3-min] npm test -- --runInBand"
npm test -- --runInBand

CURRENT_STAGE="android_bundle"
note "[verify-android-c3-min] export embedded Android bundle"
npx expo export:embed --platform android --dev false --bundle-output "$BUNDLE_PATH" --assets-dest android/app/src/main/res

CURRENT_STAGE="android_build"
note "[verify-android-c3-min] assemble debug apk"
(
  cd android
  JAVA_HOME="$JAVA_HOME_VALUE" ./gradlew :app:assembleDebug -Dorg.gradle.java.installations.auto-download=false
)

CURRENT_STAGE="android_install"
note "[verify-android-c3-min] install apk"
adb -s "$DEVICE_ID" install -r "$APK_PATH"

CURRENT_STAGE="reader_open"
note "[verify-android-c3-min] open reader"
start_reader
assert_reader_page "reader_before_comment"
capture_screen "reader_before_comment"
capture_dump "reader_before_comment"

CURRENT_STAGE="comment_probe"
note "[verify-android-c3-min] tap overlapped comment at ${COMMENT_TAP_X},${COMMENT_TAP_Y}"
adb -s "$DEVICE_ID" shell input tap "$COMMENT_TAP_X" "$COMMENT_TAP_Y"
sleep 1
capture_screen "comment_after_detail"
capture_dump "comment_after_detail"
assert_dump_contains "comment_after_detail" '评论'
assert_dump_contains "comment_after_detail" 'Debug note for iOS annotation tap\.'
assert_dump_contains "comment_after_detail" '编辑评论|删除|关闭'

CURRENT_STAGE="comment_cleanup"
note "[verify-android-c3-min] close detail and reopen reader"
adb -s "$DEVICE_ID" shell input keyevent BACK >/dev/null 2>&1 || true
sleep 1

CURRENT_STAGE="highlight_probe"
if ! try_highlight_probe "primary" "$HIGHLIGHT_TAP_X" "$HIGHLIGHT_TAP_Y"; then
  note "[verify-android-c3-min] primary highlight point missed, retrying fallback"
  try_highlight_probe "fallback" "$HIGHLIGHT_FALLBACK_TAP_X" "$HIGHLIGHT_FALLBACK_TAP_Y" || {
    fail "expected pattern not found in highlight_after_primary.xml and highlight_after_fallback.xml: 高亮"
  }
fi

CURRENT_STAGE="completed"
note "[verify-android-c3-min] completed"
note "[verify-android-c3-min] evidence saved to ${EVIDENCE_DIR}"
