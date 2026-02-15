import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByRole('heading', { name: 'Autonomous Worker Mind Map' })).toBeVisible()
  await expect(page.getByText('Worker Types')).toBeVisible()
  await expect(page.getByText('Mind Map Builder')).toBeVisible()
})
