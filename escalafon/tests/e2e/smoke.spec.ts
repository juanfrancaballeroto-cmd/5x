import { expect, test } from '@playwright/test';

type Hook = {
  state: { month: number; pending: string | null; plots: { id: string; status: string; building: string | null }[] };
  plotPagePosition(id: string): { x: number; y: number } | null;
  setSpeed(s: number): void;
};
declare global {
  interface Window {
    __escalafon: Hook;
  }
}

test('arranca, construye, resuelve un expediente y guarda captura', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Escalafón' })).toBeVisible();
  await page.getByTestId('seed').fill('2031');
  await page.getByTestId('start').click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => !!window.__escalafon?.plotPagePosition('u2'));

  // Pause so the first folder does not arrive mid-click, then click a plot on the canvas.
  await page.getByTestId('speed-0').click();
  const pos = await page.evaluate(() => window.__escalafon.plotPagePosition('u2'));
  await page.mouse.click(pos!.x, pos!.y);
  await expect(page.getByTestId('build-panel')).toBeVisible();
  await page.getByTestId('build-parque-clean').click();
  const plot = await page.evaluate(() => window.__escalafon.state.plots.find((p) => p.id === 'u2'));
  expect(plot).toMatchObject({ building: 'parque', status: 'building' });

  // Let the clock run at x3 until a folder lands on the desk.
  await page.getByTestId('speed-3').click();
  const folder = page.getByTestId('expediente');
  await expect(folder).toBeVisible({ timeout: 30_000 });
  const before = await page.evaluate(() => window.__escalafon.state.pending);
  expect(before).toBeTruthy();
  await page.screenshot({ path: 'tests/screenshots/smoke-expediente.png' });
  await folder.locator('button.option:not([disabled])').first().click();
  await expect(folder).toBeHidden();
  const after = await page.evaluate(() => window.__escalafon.state.pending);
  expect(after).not.toBe(before);

  await page.screenshot({ path: 'tests/screenshots/smoke.png' });
  expect(errors).toEqual([]);
});
