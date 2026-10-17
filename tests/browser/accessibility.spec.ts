import { test, expect } from "@playwright/test";
import { checkAccessibility } from "./accessibility";

for (const theme of ["light", "dark"] as const) {
  test(`public pages and validation feedback meet automated WCAG checks (${theme})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const route of ["/", "/login", "/register", "/forgot-password"]) {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      // Wait for client theme initialization before measuring contrast.
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await checkAccessibility(
        page,
        testInfo,
        `${theme}-${route.replaceAll("/", "") || "home"}`,
      );
    }
    await page.goto("/register");
    await page.getByLabel("Email address").fill("accessibility@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-test-password-428!");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("Different-test-password-428!");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.locator("form").getByRole("alert")).toBeFocused();
    await checkAccessibility(page, testInfo, `${theme}-registration-error`);
  });
}
