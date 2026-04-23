import { spawn } from "node:child_process"
import process from "node:process"

const previewHost = "127.0.0.1"
const previewPort = 4173
const baseUrl = `http://${previewHost}:${previewPort}/login`

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForPreview = async (url, timeoutMs = 60_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server is not ready yet.
    }
    await wait(1000)
  }
  throw new Error(`Preview server did not become ready within ${timeoutMs}ms`)
}

const run = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    })
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`))
    })
  })
}

const preview = spawn(
  "bun",
  [
    "run",
    "preview",
    "--",
    "--host",
    previewHost,
    "--port",
    String(previewPort),
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
)

try {
  await waitForPreview(baseUrl)
  await run("bunx", [
    "lhci",
    "autorun",
    "--config",
    ".lighthouserc.mobile.json",
  ])
  await run("bunx", [
    "lhci",
    "autorun",
    "--config",
    ".lighthouserc.desktop.json",
  ])
} finally {
  preview.kill("SIGTERM")
}
