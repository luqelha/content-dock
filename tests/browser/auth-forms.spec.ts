import { test, expect } from "@playwright/test";

test("login password visibility supports mouse and keyboard without submitting", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("synthetic test passphrase");
  await expect(password).toHaveAttribute("type", "password");
  const show = page.getByRole("button", { name: "Show password", exact: true });
  await show.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: "Hide password", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(password).toHaveValue("synthetic test passphrase");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await page.getByLabel("Email address").focus();
  await expect(password).toHaveAttribute("type", "password");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});

test("register visibility toggles work independently on both password fields", async ({
  page,
}) => {
  await page.goto("/register");
  const password = page.getByLabel("Password", { exact: true });
  const confirmation = page.getByLabel("Confirm password", { exact: true });
  await password.fill("synthetic test passphrase");
  await confirmation.fill("synthetic test passphrase");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show confirmation password", exact: true })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Hide confirmation password", exact: true })
    .click();
  await expect(confirmation).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveValue("synthetic test passphrase");
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});

test("password mismatch remains visible, focuses feedback, and preserves only email", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Email address").fill("Synthetic@Example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic test passphrase");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a different passphrase");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toContainText("Check the highlighted fields.");
  await expect(alert).toBeFocused();
  await expect(
    page.getByText("Passwords do not match.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Email address")).toHaveValue(
    "synthetic@example.test",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveValue("");
  // Regression: registration errors used to disappear after five seconds.
  await page.waitForTimeout(5500);
  await expect(alert).toBeVisible();
});

test("registration rejects Unicode passwords above bcrypt's byte limit", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Email address").fill("synthetic@example.test");
  await page.getByLabel("Password", { exact: true }).fill("🔒".repeat(19));
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("🔒".repeat(19));
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await expect(page.getByText(/Use no more than 72 UTF-8 bytes/)).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("login shows a neutral registration notice", async ({ page }) => {
  await page.goto("/login?registered=true");
  await expect(page.getByRole("status")).toContainText(
    "Registration request received.",
  );
  await expect(page.getByRole("status")).toContainText(
    "use your existing password",
  );
});

test("auth forms fit a narrow viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/register");
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeVisible();
  const width = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: testInfo.outputPath("register-mobile.png"), fullPage: true });
});
