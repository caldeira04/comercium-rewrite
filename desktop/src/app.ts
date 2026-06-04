import { BrowserWindow, app } from "electrobun"
import { desktopApiBaseUrl, getDesktopFrontendUrl, startLocalBackend, startFrontendServer, stopRuntimeProcess } from "./local-runtime"

const backend = startLocalBackend()
const frontendServer = startFrontendServer()
const frontendUrl = getDesktopFrontendUrl()

new BrowserWindow({
    title: "Comercium",
    frame: {
        x: 80,
        y: 80,
        width: 1440,
        height: 900,
    },
    url: frontendUrl,
    titleBarStyle: "default",
    renderer: "native",
})

process.on("exit", () => {
    backend.kill()
    stopRuntimeProcess(frontendServer)
})

app.on("quit", () => {
    backend.kill()
    stopRuntimeProcess(frontendServer)
})

console.log(`Comercium local backend: ${desktopApiBaseUrl}`)
console.log(`Comercium desktop frontend: ${frontendUrl}`)
