import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";

const api = "http://127.0.0.1:4400/api";
test.beforeAll(async () => {
  const { verifyBenchmarkTarget } =
    await import("../../scripts/benchmark-safety.mjs");
  await verifyBenchmarkTarget(api, process.env.DATABASE_URL || "");
});

test("workspace switching isolates CMS and downloads, export errors can be retried, and logout protects routes", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const credentials = {
    email: `isolation-${randomUUID()}@example.test`,
    password: "Browser-Test-Only-428!",
  };
  expect(
    (
      await request.post(`${api}/auth/register`, { data: credentials })
    ).status(),
  ).toBe(201);
  const login = await request.post(`${api}/auth/login`, { data: credentials });
  expect(login.status()).toBe(200);
  const headers = {
    Authorization: `Bearer ${(await login.json()).access_token}`,
  };
  for (const name of ["Isolation Alpha", "Isolation Beta"]) {
    expect(
      (
        await request.post(`${api}/tenants`, { headers, data: { name } })
      ).status(),
    ).toBe(201);
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const switchTo = async (name: string) => {
    await page.getByRole("button", { name: /Isolation (Alpha|Beta)/ }).click();
    await page.getByRole("menuitem", { name: new RegExp(name) }).click();
    await expect(page.getByRole("button", { name })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
  };
  await switchTo("Isolation Alpha");
  await page.goto("/dashboard/categories");
  await page.getByRole("button", { name: "Add Category" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Alpha private category");
  await dialog
    .getByLabel("Slug", { exact: true })
    .fill("alpha-private-category");
  await dialog.getByRole("button", { name: /create|save/i }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("Alpha private category", { exact: true }),
  ).toBeVisible();
  await page.goto(`/dashboard/exports?job=${randomUUID()}`);
  await expect(
    page.getByRole("alert").filter({ hasText: /not found|expired/i }),
  ).toBeVisible({ timeout: 15000 });
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Start date (UTC)").fill(today);
  await page.getByLabel("End date (UTC, inclusive)").fill(today);
  await page.getByRole("button", { name: "Create export" }).click();
  await expect(page.getByRole("link", { name: "Download ZIP" })).toBeVisible({
    timeout: 30000,
  });
  const downloadPath = await page
    .getByRole("link", { name: "Download ZIP" })
    .getAttribute("href");
  expect((await page.request.get(downloadPath!)).status()).toBe(200);
  await switchTo("Isolation Beta");
  await page.goto("/dashboard/categories");
  await expect(
    page.getByRole("button", { name: "Add Category" }),
  ).toBeVisible();
  await expect(
    page.getByText("Alpha private category", { exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get(downloadPath!)).status()).toBe(404);
  await switchTo("Isolation Alpha");
  await page.goto("/dashboard/categories");
  await expect(
    page.getByText("Alpha private category", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard/categories");
  await expect(page).toHaveURL(/\/login/);
  const loggedOutDownload = await page.request.get(downloadPath!, {
    maxRedirects: 0,
  });
  expect(loggedOutDownload.status()).toBe(307);
  expect(
    new URL(loggedOutDownload.headers().location, page.url()).pathname,
  ).toBe("/login");
});

test("login errors stay announced and protected pages require authentication", async ({
  page,
}) => {
  await page.goto("/dashboard/categories");
  await expect(page).toHaveURL(/\/login/);
  await page
    .getByLabel("Email address")
    .fill(`missing-${randomUUID()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Incorrect-Test-Password-428!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Invalid credentials" });
  await expect(alert).toBeVisible();
  // Regression for the previous five-second auto-dismiss.
  await page.waitForTimeout(5500);
  await expect(alert).toBeVisible();
});

test("workspace dialogs support keyboard focus and export links survive refresh", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(90000);
  const credentials = {
    email: `browser-${randomUUID()}@example.test`,
    password: "Browser-Test-Only-428!",
  };
  expect(
    (
      await request.post(`${api}/auth/register`, { data: credentials })
    ).status(),
  ).toBe(201);
  const login = await request.post(`${api}/auth/login`, { data: credentials });
  expect(login.status()).toBe(200);
  const token = (await login.json()).access_token;
  expect(
    (
      await request.post(`${api}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: "Browser review workspace" },
      })
    ).status(),
  ).toBe(201);
  await page.context().addCookies([
    {
      name: "atlas_active_tenant_id",
      value: randomUUID(),
      url: baseURL!,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/login?from=%2Fdashboard%2Fcategories");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const trigger = page.getByRole("button", { name: "Add Category" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dashboard/content/create");
  await expect(
    page.getByRole("textbox", { name: /content body/i }),
  ).toBeVisible();
  await page.goto("/dashboard/media");
  await page.getByRole("button", { name: "Upload Media", exact: true }).click();
  const upload = page.getByRole("dialog", {
    name: "Upload media",
    exact: true,
  });
  const picker = upload.getByRole("button", { name: "Choose files to upload" });
  await picker.focus();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (
    await chooserPromise
  ).setFiles(path.resolve("tests/browser/fixtures/upload.png"));
  await expect(upload.getByLabel("Upload files")).not.toHaveAttribute(
    "accept",
    /svg/,
  );
  await upload
    .getByRole("button", { name: "Upload File", exact: true })
    .click();
  await expect(
    upload.getByText("All uploads complete!", { exact: true }),
  ).toBeVisible();
  await upload
    .getByRole("button", { name: "Close dialog", exact: true })
    .first()
    .click();
  await expect(upload).toBeHidden();
  await page
    .getByRole("button", { name: "Preview file", exact: true })
    .first()
    .click();
  const preview = page.getByRole("dialog", {
    name: "Preview media",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview
        .locator("img")
        .first()
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await page.goto("/dashboard/exports");
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Start date (UTC)").fill(today);
  await page.getByLabel("End date (UTC, inclusive)").fill(today);
  await page
    .getByRole("button", { name: /create export|prepare export/i })
    .click();
  await expect(page).toHaveURL(/[?&]job=[a-f0-9-]{36}/);
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByRole("link", { name: /download/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByText(`${today} — ${today}`, { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download ZIP", exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/^audit-[a-f0-9-]{36}\.zip$/);
});
