import { expect } from '@playwright/test';
import { test } from './host';

test('live system motion changes and the manual override keep map navigation immediate', async ({ page, host }) => {
  await page.goto(host.url);
  const token = page.getByLabel('Local service session token');
  await token.fill(host.token);
  await token.press('Enter');
  const port = page.getByRole('button', { name: 'Select port: Portus / Rome', exact: true });
  await expect(port).toBeVisible();
  const preferences = page.getByText('Preferences', { exact: true });
  await preferences.click();
  await expect(page.getByText(/^System reduced motion: off\./)).toBeVisible();

  // Change the OS preference after mounting, without reloading or checking the override.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByText(/^System reduced motion: on\./)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Reduce motion', exact: true })).not.toBeChecked();
  await preferences.click();

  async function expectImmediateCamera(view: 'Asia corridor' | 'Mediterranean') {
    await page.getByRole('button', { name: view, exact: true }).click();
    const positions = await port.evaluate(element => {
      const captured = Promise.withResolvers<{ x: number; y: number }[]>();
      const samples: { x: number; y: number }[] = [];
      function sample() {
        const bounds = element.getBoundingClientRect();
        samples.push({ x: bounds.x, y: bounds.y });
        if (samples.length === 10) captured.resolve(samples);
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      return captured.promise;
    });
    // A camera transition would move the real map marker across these frames.
    const xs = positions.map(position => position.x);
    const ys = positions.map(position => position.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1);
  }

  await expectImmediateCamera('Asia corridor');
  await preferences.click();
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByText(/^System reduced motion: off\./)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Reduce motion', exact: true })).toBeChecked();
  await preferences.click();
  await expectImmediateCamera('Mediterranean');
  await preferences.click();
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Reduce motion', exact: true })).not.toBeChecked();
});
