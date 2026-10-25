import { expect } from '@playwright/test';

/**
 * Fails when a page scrolls sideways. Inner scroll containers (tables, tab
 * strips) are fine as long as they do not grow the document itself.
 */
export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth;
  });

  expect(overflow, `page has ${overflow}px of horizontal overflow`).toBeLessThanOrEqual(1);
}
