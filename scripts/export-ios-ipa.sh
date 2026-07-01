#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild not found. Make sure Xcode is installed."
  exit 1
fi

VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
SKIP_WEB_BUILD="${SKIP_WEB_BUILD:-0}"
SKIP_SIGNING="${SKIP_SIGNING:-0}"
SKIP_EXPORT="${SKIP_EXPORT:-0}"
IOS_WORKSPACE="${IOS_WORKSPACE:-$PROJECT_ROOT/ios/App/App.xcworkspace}"
IOS_SCHEME="${IOS_SCHEME:-App}"
IOS_CONFIGURATION="${IOS_CONFIGURATION:-Release}"
IOS_DESTINATION="${IOS_DESTINATION:-generic/platform=iOS}"
IOS_ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$PROJECT_ROOT/ios/App/build/cashmind.xcarchive}"
IOS_EXPORT_PATH="${IOS_EXPORT_PATH:-$PROJECT_ROOT/ios/App/build/ipa}"
IOS_EXPORT_METHOD="${IOS_EXPORT_METHOD:-app-store}"
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-${APPLE_TEAM_ID:-}}"
CODE_SIGN_IDENTITY="${CODE_SIGN_IDENTITY:-}"
PROVISIONING_PROFILE_SPECIFIER="${PROVISIONING_PROFILE_SPECIFIER:-}"
ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-1}"

if [ "$SKIP_WEB_BUILD" != "1" ]; then
  if [ -z "$VITE_API_BASE_URL" ]; then
    read -r -p "Enter VITE_API_BASE_URL (required for iOS API host): " VITE_API_BASE_URL
    echo
  fi
  echo "Building web assets for iOS..."
  VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build
  echo "Syncing Capacitor iOS project..."
  npm run cap:sync
fi

if [ ! -d "$IOS_WORKSPACE" ]; then
  echo "Workspace not found: $IOS_WORKSPACE"
  exit 1
fi

mkdir -p "$(dirname "$IOS_ARCHIVE_PATH")"
mkdir -p "$IOS_EXPORT_PATH"

rm -rf "$IOS_ARCHIVE_PATH"
rm -rf "$IOS_EXPORT_PATH"/*

ARCHIVE_SIGNING_ARGS=()
if [ "$SKIP_SIGNING" = "1" ]; then
  ARCHIVE_SIGNING_ARGS+=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_STYLE=Manual)
else
  if [ -n "$DEVELOPMENT_TEAM" ]; then
    ARCHIVE_SIGNING_ARGS+=(DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM")
  fi
  if [ "$ALLOW_PROVISIONING_UPDATES" = "1" ]; then
    ARCHIVE_SIGNING_ARGS+=(-allowProvisioningUpdates)
  fi
  if [ -n "$CODE_SIGN_IDENTITY" ]; then
    ARCHIVE_SIGNING_ARGS+=(CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY")
  fi
  if [ -n "$PROVISIONING_PROFILE_SPECIFIER" ]; then
    ARCHIVE_SIGNING_ARGS+=(PROVISIONING_PROFILE_SPECIFIER="$PROVISIONING_PROFILE_SPECIFIER")
  fi
fi

echo "Archiving app..."
xcodebuild -workspace "$IOS_WORKSPACE" \
  -scheme "$IOS_SCHEME" \
  -configuration "$IOS_CONFIGURATION" \
  -destination "$IOS_DESTINATION" \
  -archivePath "$IOS_ARCHIVE_PATH" \
  "${ARCHIVE_SIGNING_ARGS[@]}" \
  archive

export_options_plist="$IOS_EXPORT_PATH/exportOptions.plist"
team_id_block=""
if [ -n "$DEVELOPMENT_TEAM" ]; then
  team_id_block=$(
cat <<TEAMID
    <key>teamID</key>
    <string>${DEVELOPMENT_TEAM}</string>
TEAMID
)
fi

cat > "$export_options_plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>$IOS_EXPORT_METHOD</string>
${team_id_block}    <key>signingStyle</key>
    <string>AUTOMATIC</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>thinning</key>
    <string>none</string>
</dict>
</plist>
PLIST

echo "Exporting IPA..."
if [ "$SKIP_EXPORT" = "1" ]; then
  echo "SKIP_EXPORT=1, skipping export."
  echo "Archive path: $IOS_ARCHIVE_PATH"
  exit 0
fi

if [ "$ALLOW_PROVISIONING_UPDATES" = "1" ]; then
  xcodebuild -exportArchive \
    -archivePath "$IOS_ARCHIVE_PATH" \
    -exportPath "$IOS_EXPORT_PATH" \
    -exportOptionsPlist "$export_options_plist" \
    -allowProvisioningUpdates
else
  xcodebuild -exportArchive \
    -archivePath "$IOS_ARCHIVE_PATH" \
    -exportPath "$IOS_EXPORT_PATH" \
    -exportOptionsPlist "$export_options_plist"
fi

IPA_PATH="$(find "$IOS_EXPORT_PATH" -name '*.ipa' | head -n 1 || true)"
if [ -z "$IPA_PATH" ]; then
  echo "No .ipa found in $IOS_EXPORT_PATH"
  echo "Check xcodebuild output above."
  exit 1
fi

echo "Done. IPA path: $IPA_PATH"
echo "Open folder:"
echo "$IOS_EXPORT_PATH"
