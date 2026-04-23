import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const SCRIPT_FILE = fileURLToPath(import.meta.url)
const SCRIPT_DIR = path.dirname(SCRIPT_FILE)
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..")

const DEFAULT_ASSET_DIRECTORIES = [
  path.join(REPO_ROOT, "frontend", "public"),
  path.join(REPO_ROOT, "frontend", "src"),
]

const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"])
const SIBLING_FORMATS = [".avif", ".webp"]
const DEFAULT_MAX_BYTES = 40 * 1024

const toPosixPath = (value) => value.split(path.sep).join("/")

const collectFiles = async (directoryPath) => {
  const discovered = []

  let entries = []
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "ENOENT") {
        return discovered
      }
    }
    throw error
  }

  for (const entry of entries) {
    const resolved = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      discovered.push(...(await collectFiles(resolved)))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const stats = await fs.stat(resolved)
    discovered.push({
      filePath: resolved,
      sizeBytes: stats.size,
    })
  }

  return discovered
}

const buildFileLookup = (entries) => {
  const lookup = new Set()
  for (const entry of entries) {
    lookup.add(path.resolve(entry.filePath).toLowerCase())
  }
  return lookup
}

const requiredSiblingPaths = (filePath) => {
  const extension = path.extname(filePath)
  const basePath = filePath.slice(0, -extension.length)
  return SIBLING_FORMATS.map((siblingExt) => `${basePath}${siblingExt}`)
}

export const evaluateImagePolicyEntries = (
  entries,
  { maxBytes = DEFAULT_MAX_BYTES } = {},
) => {
  const fileLookup = buildFileLookup(entries)
  const violations = []

  for (const entry of entries) {
    const extension = path.extname(entry.filePath).toLowerCase()
    if (!RASTER_EXTENSIONS.has(extension)) {
      continue
    }

    if (entry.sizeBytes <= maxBytes) {
      continue
    }

    const missingSiblings = requiredSiblingPaths(entry.filePath).filter(
      (candidate) => !fileLookup.has(path.resolve(candidate).toLowerCase()),
    )

    if (missingSiblings.length > 0) {
      violations.push({
        filePath: entry.filePath,
        sizeBytes: entry.sizeBytes,
        missingSiblings,
      })
    }
  }

  return violations
}

const parseMaxBytes = (value) => {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_MAX_BYTES
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      "Invalid IMAGE_POLICY_MAX_BYTES: expected a non-negative number.",
    )
  }

  return parsed
}

export const runImagePolicyCheck = async ({
  assetDirectories = DEFAULT_ASSET_DIRECTORIES,
  maxBytes = parseMaxBytes(process.env.IMAGE_POLICY_MAX_BYTES),
} = {}) => {
  const entries = []
  for (const assetDirectory of assetDirectories) {
    entries.push(...(await collectFiles(assetDirectory)))
  }

  return {
    filesScanned: entries.length,
    maxBytes,
    violations: evaluateImagePolicyEntries(entries, { maxBytes }),
  }
}

const formatBytes = (value) => `${(value / 1024).toFixed(1)} KiB`

const runCli = async () => {
  const result = await runImagePolicyCheck()
  if (result.violations.length === 0) {
    console.log(
      `Image policy passed. Scanned ${result.filesScanned} files (threshold ${formatBytes(result.maxBytes)}).`,
    )
    return
  }

  console.error(
    `Image policy failed (${result.violations.length} violation${result.violations.length === 1 ? "" : "s"}):`,
  )
  for (const violation of result.violations) {
    const relativePath = toPosixPath(path.relative(REPO_ROOT, violation.filePath))
    const missing = violation.missingSiblings
      .map((candidate) => toPosixPath(path.relative(REPO_ROOT, candidate)))
      .join(", ")
    console.error(
      `- ${relativePath} is ${formatBytes(violation.sizeBytes)} and is missing sibling variants: ${missing}`,
    )
  }
  process.exitCode = 1
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT_FILE) {
  runCli().catch((error) => {
    console.error("Image policy check failed with an unexpected error.")
    console.error(error)
    process.exit(1)
  })
}
