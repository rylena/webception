import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('adds, edits, positions, animates, and downloads a site', async ({ page }) => {
  await expect(page.getByText('Webception', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Text Short paragraph' }).click()
  await expect(page.locator('.canvas-element.text')).toHaveCount(1)

  await page.locator('.inspector-stack textarea').first().fill('Hack Club launch site copy')
  await expect(page.getByLabel('Canvas').getByText('Hack Club launch site copy')).toBeVisible()

  await page.getByRole('spinbutton', { name: 'X' }).fill('160')
  await page.getByRole('spinbutton', { name: 'Y' }).fill('240')
  await expect(page.locator('.canvas-element.text')).toHaveCSS('left', '160px')
  await expect(page.locator('.canvas-element.text')).toHaveCSS('top', '240px')

  await page.getByLabel('Type').selectOption('scale')
  await page.getByRole('button', { name: 'Preview animation' }).click()
  await expect(page.locator('.canvas-element.text')).toHaveClass(/animate-scale/)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('webception-site.zip')
})

test('switches themes, applies templates, and clears the canvas', async ({ page }) => {
  await page.getByRole('button', { name: 'dark' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'dark')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Portfolio/ }).click()
  await expect(page.getByLabel('Page name')).toHaveValue('Portfolio')
  await expect(page.getByText('Rylen builds useful web experiments')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.locator('.canvas-element')).toHaveCount(0)
})
