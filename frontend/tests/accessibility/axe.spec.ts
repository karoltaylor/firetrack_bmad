import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const accessibleRoutes = ["/login", "/signup", "/recover-password"]

for (const route of accessibleRoutes) {
  test(`axe: no accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page }).analyze()

    expect(
      results.violations,
      results.violations
        .map((violation) => `${violation.id}: ${violation.help}`)
        .join("\n"),
    ).toEqual([])
  })
}
