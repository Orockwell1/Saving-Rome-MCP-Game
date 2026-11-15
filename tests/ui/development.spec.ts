import { expect, type Route } from '@playwright/test';
import { test } from './host';
import type { State } from '../../ui/src/types';

const proposal = {
  id: 'browser-study', title: 'Harbor studies', version: 1,
  ambition: 'Improve practical navigation and experimental ship planning.',
  provenance: { author: 'browser-regression', version: '1' },
  nodes: [
    { id: 'soundings-study', title: 'Soundings study', description: 'Research reliable coastal soundings before planning a demonstration voyage.', rule: 'research', location_id: 'rome', prerequisites: [], icon: { base: 'learning' }, scope: 'Navigation research', people: [] },
    { id: 'demonstration-planning', title: 'Demonstration planning', description: 'Apply the completed study to planning an experimental voyage.', rule: 'research', location_id: 'rome', prerequisites: ['soundings-study'], icon: { base: 'learning' }, scope: 'Voyage research', people: [] },
  ],
};

test('native graph buttons inspect without spending and commission only an accepted ready node', async ({ page, request, host, isMobile }) => {
  async function tool(name: string, arguments_: Record<string, unknown>): Promise<State> {
    const response = await request.post(`${host.url}/api/tool`, {
      headers: { Authorization: `Bearer ${host.token}` },
      data: { name, arguments: arguments_ },
    });
    expect(response.ok()).toBe(true);
    const result = await response.json();
    expect(result.isError).not.toBe(true);
    return result.structuredContent.state;
  }
  const initial = await tool('inspect_campaign', {});
  await tool('propose_development', { command_id: 'browser-proposal', expected_revision: initial.revision, proposal });
  await page.goto(host.url);
  await page.getByLabel('Local service session token').fill(host.token);
  await page.getByRole('button', { name: 'Open campaign', exact: true }).click();
  await page.getByRole('button', { name: 'Development Knowledge & capacity', exact: true }).click();
  await page.getByRole('button', { name: 'Show new projects', exact: true }).click();
  const dependent = page.getByRole('button', { name: /^Technology: Demonstration planning\./, includeHidden: true });
  const root = page.getByRole('button', { name: /^Technology: Soundings study\./, includeHidden: true });
  const inspector = page.locator('[data-development-region="details"]');
  const commission = page.getByRole('button', { name: 'Commission project', exact: true });
  const selectionReceived = Promise.withResolvers<void>();
  const releaseSelection = Promise.withResolvers<void>();
  let heldSelection = false;
  const holdAcknowledgement = async (route: Route) => {
    const body = route.request().postDataJSON();
    if (!heldSelection && body?.name === 'issue_order' && body.arguments?.action === 'select') {
      heldSelection = true;
      const response = await route.fetch();
      selectionReceived.resolve();
      await releaseSelection.promise;
      await route.fulfill({ response });
    } else {
      await route.continue();
    }
  };
  await page.route(`${host.url}/api/tool`, holdAcknowledgement);

  // This must hit the native button through React Flow's noninteractive wrapper.
  await dependent.click({ timeout: 5000 });
  try {
    await selectionReceived.promise;
    await expect(root).toBeDisabled();
    await expect(dependent).toBeFocused();
  } finally {
    releaseSelection.resolve();
  }
  await expect(inspector.getByRole('heading', { name: 'Demonstration planning', exact: true })).toBeVisible();
  await expect(root).toBeEnabled();
  await page.unroute(`${host.url}/api/tool`, holdAcknowledgement);
  await expect(commission).toHaveCount(0);
  expect((await tool('inspect_campaign', {})).resources).toEqual(initial.resources);
  if (isMobile) {
    await page.getByRole('button', { name: '‹ Developments', exact: true }).click();
    await expect(dependent).toBeFocused();
  }

  await page.getByRole('button', { name: 'Council Ambitions & decisions', exact: true }).click();
  await page.getByRole('button', { name: 'Accept this ambition', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Accept this ambition', exact: true })).toHaveCount(0);
  const accepted = await tool('inspect_campaign', {});
  expect(accepted.resources).toEqual(initial.resources);
  await page.getByRole('button', { name: 'Development Knowledge & capacity', exact: true }).click();
  await page.getByRole('button', { name: 'Show new projects', exact: true }).click();
  await dependent.click();
  await expect(inspector.getByText('! Unmet · Soundings study', { exact: true })).toBeVisible();
  await expect(commission).toHaveCount(0);
  if (isMobile) await page.getByRole('button', { name: '‹ Developments', exact: true }).click();

  await expect(root).toBeEnabled();
  const camera = await page.locator('.react-flow__viewport').getAttribute('style');
  await root.press('Enter');
  await expect(commission).toBeEnabled();
  await commission.click();
  await expect(page.getByRole('button', { name: 'Advance until ready', exact: true })).toBeEnabled();
  await expect(commission).toHaveCount(0);
  const commissioned = await tool('inspect_campaign', {});
  const readyNode = accepted.trees.find(tree => tree.id === proposal.id)!.nodes.find(node => node.id === 'soundings-study')!;
  const project = commissioned.trees.find(tree => tree.id === proposal.id)!.nodes.find(node => node.id === readyNode.id)!;
  expect(project.status).toBe('underway');
  expect(commissioned.resources).toEqual(Object.fromEntries(Object.entries(accepted.resources).map(([resource, amount]) => [resource, amount - (readyNode.costs[resource] ?? 0)])));

  if (isMobile) {
    await page.getByRole('button', { name: '‹ Developments', exact: true }).click();
    await expect(root).toBeFocused();
    await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', camera!);
    await root.press('Enter');
    await expect(inspector.getByRole('heading', { name: 'Soundings study', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(root).toBeFocused();
    await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', camera!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});
