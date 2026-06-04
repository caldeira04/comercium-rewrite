if (process.platform === "linux") {
    process.env.WEBKIT_DISABLE_COMPOSITING_MODE ??= "1"
}

await import("./app")

export {}
