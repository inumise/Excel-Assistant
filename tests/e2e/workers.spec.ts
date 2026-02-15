import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByRole('heading', { name: 'CEO AI Worker Drawboard' })).toBeVisible()
  await expect(page.getByText('Role + Tool Library')).toBeVisible()
  await expect(page.getByText('Structure Controls')).toBeVisible()
})
