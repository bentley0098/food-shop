import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/alice.json' })

test('a signed-in user reaches the app, not the login screen', async ({ page }) => {
  await page.goto('/')
  await expect(page).not.toHaveURL(/\/login/)
})
