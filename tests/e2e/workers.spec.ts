import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByText('Hyperplacity AI Workers')).toBeVisible()
  await expect(page.getByText('Workflow Hierarchy')).toBeVisible()
})
