import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

// The Nitro server build externalizes `tslib` and traces its CommonJS build into
// `.output/server/node_modules/tslib`. Compiled Bun binaries cannot load that CJS
// file (nor `.mjs`) from the on-disk output, which breaks SSR for some routes
// ("Cannot find package 'tslib'"). Replace it with the ESM build, which loads fine.
const frontendRoot = path.resolve(import.meta.dir, "..")
const vendorTslib = path.join(frontendRoot, "vendor", "tslib.es6.mjs")
const outputTslib = path.join(frontendRoot, ".output", "server", "node_modules", "tslib")

if (!existsSync(vendorTslib)) {
    throw new Error(`vendored tslib not found at ${vendorTslib}`)
}

rmSync(outputTslib, { recursive: true, force: true })
mkdirSync(outputTslib, { recursive: true })

writeFileSync(
    path.join(outputTslib, "package.json"),
    JSON.stringify({ name: "tslib", version: "2.8.1", main: "index.js" }, null, 2)
)

copyFileSync(vendorTslib, path.join(outputTslib, "index.js"))

console.log("Patched .output/server/node_modules/tslib with ESM build")