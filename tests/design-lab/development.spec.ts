import { test, expect } from '@playwright/test';
import { defaultContent } from './fixtures';

test('inspect a blocked node, return to its graph and read long compact content', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  const node = page.getByRole('button', { name: /Pilot vessel/, includeHidden: true });
  await expect(node).toBeVisible();
  await expect(node).toBeEnabled();
  await expect(node).toHaveAttribute('aria-pressed', 'false');
  await node.focus();
  await node.press('Enter');
  await expect(node).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Pilot vessel', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commission project', exact: true })).toHaveCount(0);
  const compact = page.viewportSize()!.width <= 760;
  if (compact) {
    const back = page.getByRole('button', { name: '‹ Developments', exact: true });
    await expect(back).toBeFocused();
    await back.press('Escape');
    await expect(node).toBeFocused();
    await node.press('Space');
    await expect(back).toBeFocused();
    await back.click();
    await expect(node).toBeFocused();
  } else await expect(node).toBeFocused();

  await page.getByLabel('Scenario', { exact: true }).selectOption('long-content');
  const title = page.getByRole('heading', { name: /^A deliberately long programme/ });
  await expect(title).toHaveText('A deliberately long programme for shipbuilders, harbour crews, materials, practical learning and the lasting capacity of a coastal community');
  const discussion = page.getByRole('button', { name: 'Discuss with the steward ›', exact: true });
  await discussion.scrollIntoViewIfNeeded();
  await expect(discussion).toBeVisible();
  expect(await discussion.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.getByLabel('Scenario', { exact: true }).selectOption('empty');
  await expect(page.getByText('No development is selected. Choose a populated scenario to inspect it.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commission project', exact: true })).toHaveCount(0);
});

test('an order remains authorized until acknowledgement and rejects without a success receipt', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Scenario', { exact: true }).selectOption('available');
  const receipt = page.locator('[data-development-region="details.receipt"]');
  const acknowledgedReceipt = await receipt.innerText();
  await page.getByRole('button', { name: 'Commission project', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Order awaiting acknowledgement' })).toBeVisible();
  await expect(receipt).toHaveText(acknowledgedReceipt);
  await expect(page.locator('[data-development-region="details.action"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Deliver rejected snapshot', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Order rejected. The acknowledged state has not changed.');
  await expect(receipt).toHaveText(acknowledgedReceipt);
  await page.getByRole('button', { name: 'Commission project', exact: true }).click();
  await page.getByRole('button', { name: 'Deliver accepted snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Advance until ready', exact: true })).toBeEnabled();
  await expect(receipt).not.toHaveText(acknowledgedReceipt);
  await expect(page.getByRole('button', { name: 'Commission project', exact: true })).toHaveCount(0);
  await page.getByLabel('Scenario', { exact: true }).selectOption('disconnected');
  await expect(page.getByRole('button', { name: 'Discuss with the steward ›', exact: true })).toBeDisabled();
  await expect(page.getByText('No steward is connected. No message can be sent from local preview.')).toBeVisible();
  await page.getByLabel('Scenario', { exact: true }).selectOption('planned');
  await expect(page.getByText('No executable rule is implemented for this plan.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commission project', exact: true })).toHaveCount(0);
});

test('local reference import rejects metadata and renders allowed content without uploads or markup execution', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/');
  const input = page.getByLabel('Local reference content', { exact: true });
  await input.setInputFiles({ name: 'invalid-reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...defaultContent, sourceNodeId: 'not-a-presentation-field' })) });
  await expect(page.getByRole('alert')).toHaveText('Reference content rejected: only the documented presentation fields are allowed.');
  await expect(page.getByRole('heading', { name: 'Pilot vessel', exact: true })).toBeVisible();
  const imported = { ...defaultContent, card: { ...defaultContent.card, title: '<b>Local reference</b>' }, details: { ...defaultContent.details, title: '<b>Local reference</b>' } };
  await input.setInputFiles({ name: 'presentation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  const title = page.getByRole('heading', { name: '<b>Local reference</b>', exact: true });
  await expect(title).toBeVisible();
  await expect(title.locator('b')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'not uploaded or stored' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(writes).toEqual([]);
});
