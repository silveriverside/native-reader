#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DESTINATION="${IOS_C3_DESTINATION:-platform=iOS Simulator,name=iPhone 17,OS=26.3.1}"
DERIVED_DATA_PATH="${IOS_C3_DERIVED_DATA_PATH:-ios/build-debug-evidence-release}"
RESULT_BUNDLE_PATH="${IOS_C3_RESULT_BUNDLE_PATH:-ios/TestResults_C3_iOS_$(date +%Y%m%d_%H%M%S).xcresult}"

echo "[verify-ios-c3] npm run typecheck"
npm run typecheck

echo "[verify-ios-c3] npm test -- --runInBand"
npm test -- --runInBand

echo "[verify-ios-c3] xcodebuild iOS C-3 UI tests"
echo "[verify-ios-c3] destination: ${DESTINATION}"
echo "[verify-ios-c3] result bundle: ${RESULT_BUNDLE_PATH}"
xcodebuild \
  -workspace ios/nativereader.xcworkspace \
  -scheme nativereader \
  -configuration Release \
  -destination "${DESTINATION}" \
  -derivedDataPath "${DERIVED_DATA_PATH}" \
  -resultBundlePath "${RESULT_BUNDLE_PATH}" \
  -only-testing:nativereaderTests/nativereaderUITests \
  test

echo "[verify-ios-c3] completed"
