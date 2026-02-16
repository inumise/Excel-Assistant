import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByRole('heading', { name: 'Owner AI Employee Structure Builder' })).toBeVisible()
  await expect(page.getByText('AI Worker List')).toBeVisible()
  await expect(page.getByText('Owner Control Window')).toBeVisible()
})
