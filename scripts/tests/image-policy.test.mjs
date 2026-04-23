import assert from "node:assert/strict"
import path from "node:path"
import { describe, it } from "node:test"

import { evaluateImagePolicyEntries } from "../check-image-policy.mjs"

const root = path.resolve("repo")

const toEntry = (relativePath, sizeBytes) => ({
  filePath: path.join(root, relativePath),
  sizeBytes,
})

describe("image policy", () => {
  it("passes when oversized raster has AVIF and WebP siblings", () => {
    const entries = [
      toEntry("frontend/public/assets/images/hero/cover-1200.jpg", 64 * 1024),
      toEntry("frontend/public/assets/images/hero/cover-1200.avif", 12 * 1024),
      toEntry("frontend/public/assets/images/hero/cover-1200.webp", 18 * 1024),
    ]

    const violations = evaluateImagePolicyEntries(entries, { maxBytes: 40 * 1024 })
    assert.equal(violations.length, 0)
  })

  it("passes when raster is below threshold without variants", () => {
    const entries = [
      toEntry("frontend/public/assets/images/icons/badge.png", 8 * 1024),
    ]

    const violations = evaluateImagePolicyEntries(entries, { maxBytes: 40 * 1024 })
    assert.equal(violations.length, 0)
  })

  it("fails when oversized raster misses modern siblings", () => {
    const entries = [
      toEntry("frontend/public/assets/images/hero/cover-768.png", 55 * 1024),
      toEntry("frontend/public/assets/images/hero/cover-768.webp", 18 * 1024),
    ]

    const violations = evaluateImagePolicyEntries(entries, { maxBytes: 40 * 1024 })

    assert.equal(violations.length, 1)
    assert.equal(violations[0]?.missingSiblings.length, 1)
    assert.equal(
      path.extname(violations[0]?.missingSiblings[0] ?? ""),
      ".avif",
    )
  })
})
