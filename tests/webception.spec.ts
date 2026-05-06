import { expect, test } from '@playwright/test'

test('adds blocks, edits copy, and opens export markup', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Webception')).toBeVisible()

  await page.locator('.block-tile').filter({ hasText: 'Text' }).click()
  await expect(page.locator('.canvas-block.text')).toHaveCount(2)

  await page.locator('.inspector-stack textarea').first().fill('Hack Club launch site copy')
  await expect(page.getByLabel('Canvas').getByText('Hack Club launch site copy')).toBeVisible()

  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('dialog', { name: 'Export HTML' })).toBeVisible()
  await expect(page.locator('.export-modal textarea')).toContainText('Exported from Webception')
})
