import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const SCRIPT_FILE = fileURLToPath(import.meta.url)
const SCRIPT_DIR = path.dirname(SCRIPT_FILE)
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..")
const DEFAULT_SOURCE_DIR = path.join(REPO_ROOT, "frontend", "src")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

const IMPORT_REGEX =
  /\bimport(?:["'\s]*[\w*{}\n\r\t, ]+from\s*)?["']([^"']+)["']/g
const EXPORT_FROM_REGEX =
  /\bexport\s+(?:\*\s+from|{[\s\S]*?}\s+from)\s*["']([^"']+)["']/g
const DYNAMIC_IMPORT_REGEX = /\bimport\(\s*["']([^"']+)["']\s*\)/g
const REQUIRE_REGEX = /\brequire\(\s*["']([^"']+)["']\s*\)/g

const KNOWN_ICON_PACKAGE_PATTERNS = [
  /^react-icons(?:\/|$)/,
  /^@heroicons(?:\/|$)/,
  /^@fortawesome(?:\/|$)/,
  /^@iconify(?:\/|$)/,
  /^phosphor-react(?:\/|$)/,
  /^react-feather(?:\/|$)/,
  /^tabler-icons-react(?:\/|$)/,
  /^@radix-ui\/react-icons(?:\/|$)/,
]

const isLocalOrAliasedImport = (specifier) =>
  specifier.startsWith(".") ||
  specifier.startsWith("/") ||
  specifier.startsWith("@/")

const getPackageName = (specifier) => {
  if (specifier.startsWith("@")) {
    const segments = specifier.split("/")
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier
  }

  return specifier.split("/")[0]
}

export const isDisallowedIconImport = (specifier) => {
  if (specifier === "lucide-react" || specifier.startsWith("lucide-react/")) {
    return false
  }

  if (isLocalOrAliasedImport(specifier)) {
    return false
  }

  const packageName = getPackageName(specifier)
  if (KNOWN_ICON_PACKAGE_PATTERNS.some((pattern) => pattern.test(packageName))) {
    return true
  }

  return false
}

export const collectImportSpecifiers = (source) => {
  const matches = []
  for (const matcher of [
    IMPORT_REGEX,
    EXPORT_FROM_REGEX,
    DYNAMIC_IMPORT_REGEX,
    REQUIRE_REGEX,
  ]) {
    matcher.lastIndex = 0
    for (const result of source.matchAll(matcher)) {
      matches.push({
        specifier: result[1],
        index: result.index ?? 0,
      })
    }
  }
  return matches
}

const toLineNumber = (source, index) =>
  source.slice(0, index).split(/\r?\n/).length

export const evaluateIconPolicySource = ({ filePath, source }) => {
  const violations = []

  for (const match of collectImportSpecifiers(source)) {
    if (!isDisallowedIconImport(match.specifier)) {
      continue
    }

    violations.push({
      filePath,
      line: toLineNumber(source, match.index),
      specifier: match.specifier,
    })
  }

  return violations
}

const collectSourceFiles = async (directoryPath) => {
  const discovered = []
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })

  for (const entry of entries) {
    const resolved = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      discovered.push(...(await collectSourceFiles(resolved)))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      discovered.push(resolved)
    }
  }

  return discovered
}

export const runIconPolicyCheck = async ({
  sourceDirectory = DEFAULT_SOURCE_DIR,
} = {}) => {
  const sourceFiles = await collectSourceFiles(sourceDirectory)
  const violations = []

  for (const sourceFilePath of sourceFiles) {
    const source = await fs.readFile(sourceFilePath, "utf8")
    const fileViolations = evaluateIconPolicySource({
      filePath: sourceFilePath,
      source,
    })
    violations.push(...fileViolations)
  }

  return {
    sourceFilesChecked: sourceFiles.length,
    violations,
  }
}

const formatViolation = (violation) => {
  const relativePath = path.relative(REPO_ROOT, violation.filePath)
  return `- ${relativePath}:${violation.line} imports "${violation.specifier}" (only "lucide-react" is allowed)`
}

const runCli = async () => {
  const result = await runIconPolicyCheck()

  if (result.violations.length === 0) {
    console.log(
      `Icon policy passed. Checked ${result.sourceFilesChecked} source files.`,
    )
    return
  }

  console.error("Icon policy failed:")
  for (const violation of result.violations) {
    console.error(formatViolation(violation))
  }
  process.exitCode = 1
}

const isDirectCliInvocation = () => {
  if (!process.argv[1]) {
    return false
  }

  return path.normalize(path.resolve(process.argv[1])) === path.normalize(SCRIPT_FILE)
}

if (isDirectCliInvocation()) {
  runCli().catch((error) => {
    console.error("Icon policy check failed with an unexpected error.")
    console.error(error)
    process.exit(1)
  })
}
