import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const ratioThresholds = {
  AA: 4.5,
  AAA: 7,
}

const readProjectFile = async (relativePath) => {
  const filePath = path.resolve(process.cwd(), relativePath)
  return readFile(filePath, "utf8")
}

const extractBlock = (source, pattern, label) => {
  const match = source.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Could not find CSS block for ${label}`)
  }
  return match[1]
}

const parseCssVariables = (block) => {
  const variables = new Map()
  const variableRegex = /(--[\w-]+)\s*:\s*([^;]+);/g
  let match = variableRegex.exec(block)

  while (match) {
    variables.set(match[1], match[2].trim())
    match = variableRegex.exec(block)
  }

  return variables
}

const normalizeHex = (value, variableName) => {
  const trimmed = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`
  }
  throw new Error(
    `Unsupported color value "${value}" resolved for ${variableName}. Use hex tokens for contrast pairs.`,
  )
}

const resolveValue = (variableName, variables, seen = new Set()) => {
  if (seen.has(variableName)) {
    throw new Error(`Circular CSS variable reference for ${variableName}`)
  }
  seen.add(variableName)

  const rawValue = variables.get(variableName)
  if (!rawValue) {
    throw new Error(`CSS variable ${variableName} not found in token scope`)
  }

  const varReference = rawValue.match(/^var\((--[\w-]+)\)$/)
  if (varReference) {
    return resolveValue(varReference[1], variables, seen)
  }

  return normalizeHex(rawValue, variableName)
}

const toRelativeLuminance = (hex) => {
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  )
  const [r, g, b] = channels.map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

const contrastRatio = (foreground, background) => {
  const fg = toRelativeLuminance(foreground)
  const bg = toRelativeLuminance(background)
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

const cssSource = await readProjectFile("frontend/src/index.css")
const pairsConfig = JSON.parse(await readProjectFile("frontend/contrast-pairs.json"))

const rootBlock = extractBlock(cssSource, /:root\s*\{([\s\S]*?)\}/, ":root")
const lightBlock = extractBlock(
  cssSource,
  /\[data-theme="light"\]\s*\{([\s\S]*?)\}/,
  "[data-theme=\"light\"]",
)

const darkVariables = parseCssVariables(rootBlock)
const lightVariables = new Map([...darkVariables, ...parseCssVariables(lightBlock)])

const failures = []

for (const pair of pairsConfig.pairs) {
  const threshold = ratioThresholds[pair.ratio]
  if (!threshold) {
    throw new Error(
      `Unsupported ratio "${pair.ratio}" for pair ${pair.id}. Use AA or AAA.`,
    )
  }

  for (const [theme, variables] of [
    ["dark", darkVariables],
    ["light", lightVariables],
  ]) {
    const foreground = resolveValue(pair.foreground, variables)
    const background = resolveValue(pair.background, variables)
    const ratio = contrastRatio(foreground, background)
    const roundedRatio = Number(ratio.toFixed(2))

    if (ratio < threshold) {
      failures.push(
        `${pair.id} (${theme}): ${pair.foreground} on ${pair.background} = ${roundedRatio}:1 (< ${threshold}:1 ${pair.ratio})`,
      )
    } else {
      console.log(
        `PASS ${pair.id} (${theme}) => ${roundedRatio}:1 (required ${threshold}:1 ${pair.ratio})`,
      )
    }
  }
}

if (failures.length > 0) {
  console.error("\nContrast policy failed:\n")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("\nContrast policy passed for all configured token pairs.")
