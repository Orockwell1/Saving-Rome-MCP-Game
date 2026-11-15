import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const test = base.extend<{ host: { url: string; token: string } }>({
  host: async ({}, use) => {
    const reservation = createServer();
    const listening = Promise.withResolvers<void>();
    reservation.once('error', listening.reject);
    reservation.listen(0, '127.0.0.1', listening.resolve);
    await listening.promise;
    const port = (reservation.address() as AddressInfo).port;
    const released = Promise.withResolvers<void>();
    reservation.close(error => error ? released.reject(error) : released.resolve());
    await released.promise;
    const directory = await mkdtemp(join(tmpdir(), 'rome-ui-'));
    const token = randomBytes(32).toString('hex');
    const url = `http://127.0.0.1:${port}`;
    const python = join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const host = spawn(python, ['-m', 'rome', '--db', join(directory, 'campaign.db'), '--port', String(port)], {
      cwd: root,
      env: { ...process.env, ROME_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let startupError: Error | undefined;
    host.stdout.on('data', chunk => { output += chunk; });
    host.stderr.on('data', chunk => { output += chunk; });
    host.once('error', error => { startupError = error; });
    const closed = Promise.withResolvers<void>();
    host.once('close', () => closed.resolve());
    try {
      await expect.poll(async () => {
        if (startupError) throw startupError;
        if (host.exitCode !== null) throw new Error(`Rome exited during startup: ${output}`);
        try {
          return (await fetch(`${url}/health`)).ok;
        } catch {
          return false;
        }
      }, { message: 'The isolated Rome host must start', timeout: 15_000 }).toBe(true);
      await use({ url, token });
    } finally {
      host.kill('SIGTERM');
      await closed.promise;
      await rm(directory, { recursive: true, force: true });
    }
  },
});

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
