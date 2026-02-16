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

test('company composer generates automated workforce graph', async ({ page }) => {
  await page.goto('/workers')
  await page.getByRole('button', { name: 'Build New Company' }).click()

  const nodes = page.locator('.react-flow__node')
  await expect.poll(async () => nodes.count()).toBeGreaterThan(8)
  await expect(page.getByText('Generated')).toBeVisible()
})

test('company composer can generate full structure', async ({ page }) => {
  await page.goto('/workers')

  await page
    .getByRole('button', { name: 'Build New Company' })
    .click()

  const nodeCount = await page.locator('.react-flow__node').count()
  expect(nodeCount).toBeGreaterThanOrEqual(7)
  await expect(page.getByText('Generated')).toBeVisible()
})
