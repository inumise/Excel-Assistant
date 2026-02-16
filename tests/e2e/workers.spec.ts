import { expect, test } from '@playwright/test'

test('workers studio renders', async ({ page }) => {
  await page.goto('/workers')
  await expect(page.getByRole('heading', { name: 'Mind Map Builder' })).toBeVisible()
  await expect(page.getByText('Node Catalog')).toBeVisible()
  await expect(page.getByText('Node Settings')).toBeVisible()
})

test('catalog boxes can be added by click and drag', async ({ page }) => {
  await page.goto('/workers')

  const nodes = page.locator('.react-flow__node')
  const initialCount = await nodes.count()

  await page.getByTestId('catalog-box').click()
  await expect(nodes).toHaveCount(initialCount + 1)

  const canvas = page.locator('.mind-canvas-shell')
  await page.getByTestId('catalog-function-box').dragTo(canvas, {
    targetPosition: { x: 360, y: 240 },
  })
  await expect(nodes).toHaveCount(initialCount + 2)
})
