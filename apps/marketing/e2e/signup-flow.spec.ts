import { expect, test } from "@playwright/test";

const companyName = "Acme Incorporated";
const subdomain = "acme-co";
const email = "founder@example.com";
const password = "Password123!";

async function fillSignupForm(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/signup");

  await page.getByLabel(/organization name/i).fill(companyName);
  await page.getByLabel(/your full name/i).fill("Jane Founder");
  await page.getByLabel(/your email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);

  const subdomainInput = page.getByLabel(/subdomain/i);
  await subdomainInput.fill("" + subdomain);

  await expect(subdomainInput).toHaveValue(subdomain);
}

test.describe("Marketing signup flow", () => {
  test("prompts for email confirmation when session missing", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_SIGNUP_MODE === "replay",
      "Requires live Supabase session"
    );

    await fillSignupForm(page);

    await page.getByRole("button", { name: /create organization/i }).click();

    await expect(
      page.getByText(/check your inbox to confirm your email/i)
    ).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveURL(/signup\/success/);
  });
});
