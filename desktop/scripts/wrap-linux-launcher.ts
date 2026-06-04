import { chmodSync, existsSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"

if (process.env.ELECTROBUN_OS !== "linux") {
    process.exit(0)
}

const buildDir = process.env.ELECTROBUN_BUILD_DIR
const appName = process.env.ELECTROBUN_APP_NAME

if (!buildDir || !appName) {
    throw new Error("Missing Electrobun build environment for Linux launcher wrapper")
}

const binDir = path.join(buildDir, appName, "bin")
const launcherPath = path.join(binDir, "launcher")
const nativeLauncherPath = path.join(binDir, "launcher-bin")

if (!existsSync(launcherPath)) {
    throw new Error(`Linux launcher not found at ${launcherPath}`)
}

if (!existsSync(nativeLauncherPath)) {
    renameSync(launcherPath, nativeLauncherPath)
}

writeFileSync(launcherPath, `#!/usr/bin/env sh
export WEBKIT_DISABLE_COMPOSITING_MODE="\${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$DIR/launcher-bin" "$@"
`)
chmodSync(launcherPath, 0o755)

console.log("Wrapped Linux launcher with WebKitGTK compositing workaround")
