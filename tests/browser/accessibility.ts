import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

export async function checkAccessibility(
  page: Page,
  testInfo: TestInfo,
  state: string,
) {
  // Inspect the settled state; opacity during an entrance animation creates
  // transient contrast failures, especially in Firefox/WebKit.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await expect
    .poll(
      () =>
        page
          .getByRole("dialog")
          .evaluateAll((dialogs) =>
            dialogs.every((dialog) =>
              [...dialog.querySelectorAll<HTMLElement>("[style]")].every(
                (element) =>
                  !element.style.opacity ||
                  element.getAttribute("aria-hidden") === "true" ||
                  element.getBoundingClientRect().width === 0 ||
                  Number(element.style.opacity) === 1,
              ),
            ),
          ),
      { message: "Dialog entrance opacity has settled" },
    )
    .toBe(true);
  const missingDescriptions = await page.evaluate(() =>
    [...document.querySelectorAll("[aria-describedby]")].flatMap((element) =>
      (element.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((id) => !document.getElementById(id))
        .map((id) => ({ element: element.tagName, id })),
    ),
  );
  expect
    .soft(missingDescriptions, `Description references in ${state}`)
    .toEqual([]);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach(`axe-${state}`, {
    body: JSON.stringify(
      {
        url: page.url(),
        violations: result.violations,
        incomplete: result.incomplete,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect
    .soft(result.violations, `Accessibility violations in ${state}`)
    .toEqual([]);
}
