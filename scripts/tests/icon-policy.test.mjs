import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  evaluateIconPolicySource,
  isDisallowedIconImport,
} from "../check-icon-policy.mjs"

describe("icon import policy", () => {
  it("allows lucide and local imports", () => {
    assert.equal(isDisallowedIconImport("lucide-react"), false)
    assert.equal(isDisallowedIconImport("lucide-react/dynamicIconImports"), false)
    assert.equal(isDisallowedIconImport("@/components/ui/button"), false)
    assert.equal(isDisallowedIconImport("./local-icon"), false)
  })

  it("rejects known icon-pack imports", () => {
    assert.equal(isDisallowedIconImport("react-icons/fa"), true)
    assert.equal(isDisallowedIconImport("@heroicons/react/24/outline"), true)
    assert.equal(isDisallowedIconImport("@radix-ui/react-icons"), true)
  })

  it("reports pass and fail paths while scanning source", () => {
    const validSource = `
      import { Search } from "lucide-react"
      import { Button } from "@/components/ui/button"
    `
    const invalidSource = `
      import { Search } from "lucide-react"
      import { FaGithub } from "react-icons/fa"
      export { Archive } from "@heroicons/react/24/outline"
      const icons = require("@radix-ui/react-icons")
    `

    const validViolations = evaluateIconPolicySource({
      filePath: "valid.tsx",
      source: validSource,
    })
    const invalidViolations = evaluateIconPolicySource({
      filePath: "invalid.tsx",
      source: invalidSource,
    })

    assert.equal(validViolations.length, 0)
    assert.equal(invalidViolations.length, 3)
    assert.equal(invalidViolations[0]?.specifier, "react-icons/fa")
    assert.equal(invalidViolations[1]?.specifier, "@heroicons/react/24/outline")
    assert.equal(invalidViolations[2]?.specifier, "@radix-ui/react-icons")
  })
})
