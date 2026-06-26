#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

JAVA_HOME_VALUE="${ANDROID_RELEASE_JAVA_HOME:-/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home}"
APK_PATH="${ANDROID_RELEASE_APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"
EVIDENCE_DIR="${ANDROID_RELEASE_EVIDENCE_DIR:-.trae/evidence/android_release_$(date +%Y%m%d_%H%M%S)}"
SUMMARY_FILE="${EVIDENCE_DIR}/summary.txt"

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: scripts/build-android-release.sh

Builds the Android release APK without loading local .env files and without inlining EXPO_PUBLIC client env vars.
This prevents local debug API seed values from being embedded into the release bundle.
EOF
  exit 0
fi

mkdir -p "$EVIDENCE_DIR"
touch "$SUMMARY_FILE"

note() {
  echo "$1" | tee -a "$SUMMARY_FILE"
}

note "[build-android-release] evidence dir: ${EVIDENCE_DIR}"
note "[build-android-release] npm run typecheck"
npm run typecheck

note "[build-android-release] npm test -- --runInBand"
npm test -- --runInBand

note "[build-android-release] export embedded Android bundle without dotenv"
EXPO_NO_DOTENV=1 \
EXPO_NO_CLIENT_ENV_VARS=1 \
EXPO_PUBLIC_DEBUG_API_SEED_ENABLED=false \
EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START=false \
EXPO_PUBLIC_DEBUG_API_KEY= \
EXPO_PUBLIC_DEBUG_API_ENDPOINT= \
EXPO_PUBLIC_DEBUG_API_MODEL= \
EXPO_PUBLIC_DEBUG_API_PROVIDER= \
npx expo export:embed --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

note "[build-android-release] assemble release apk"
(
  cd android
  EXPO_NO_DOTENV=1 \
  EXPO_NO_CLIENT_ENV_VARS=1 \
  EXPO_PUBLIC_DEBUG_API_SEED_ENABLED=false \
  EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START=false \
  EXPO_PUBLIC_DEBUG_API_KEY= \
  EXPO_PUBLIC_DEBUG_API_ENDPOINT= \
  EXPO_PUBLIC_DEBUG_API_MODEL= \
  EXPO_PUBLIC_DEBUG_API_PROVIDER= \
  JAVA_HOME="$JAVA_HOME_VALUE" \
  ./gradlew :app:assembleRelease -Dorg.gradle.java.installations.auto-download=false
)

if [[ ! -f "$APK_PATH" ]]; then
  note "[build-android-release] FAILED: APK not found at ${APK_PATH}"
  exit 1
fi

shasum -a 256 "$APK_PATH" | tee "${EVIDENCE_DIR}/app-release.apk.sha256" >/dev/null
cp "$APK_PATH" "${EVIDENCE_DIR}/app-release.apk"

note "[build-android-release] apk path: ${APK_PATH}"
note "[build-android-release] release artifact copied to ${EVIDENCE_DIR}/app-release.apk"
note "[build-android-release] completed"
