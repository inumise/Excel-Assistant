import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByRole('heading', { name: 'Mind Map Builder' })).toBeVisible()
  await expect(page.getByText('Node Catalog')).toBeVisible()
  await expect(page.getByText('Node Settings')).toBeVisible()
})
