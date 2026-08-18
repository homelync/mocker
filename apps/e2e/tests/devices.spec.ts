import { expect, test } from './fixtures'

/**
 * What a consumer's suite looks like, and what only a real browser can prove.
 *
 * Every assertion here is about data that came out of `mocks/` — the files in
 * this directory are the answer, they are committed, and a reviewer can read
 * them. That is the whole argument for `fixed` defaulting to `true` here and to
 * `false` in the Storybook adapter.
 */

test('renders the devices the fixture holds', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('#reference')).toHaveText('ABC123')
  await expect(page.locator('#devices li')).toHaveCount(20)
  await expect(page.locator('#empty')).toBeHidden()

  // The first row was *edited* in the fixture — the generator called that room
  // "attero turba sperno", which teaches a reader nothing. This is the whole
  // argument for the feature: the file says the thing the test is about, and the
  // assertion can be read without running anything.
  await expect(page.locator('#devices li').first()).toHaveText(
    'Kitchen: YH091UUO00K2',
  )
  await expect(page.locator('#devices li').first()).toHaveAttribute(
    'data-status',
    'FAULT',
  )
  // A value from the committed file rather than a shape: a test that only
  // checked "more than zero rows" would pass on regenerated faker output and
  // never notice the fixture had gone.
  await expect(page.locator('#address')).toHaveText('SR3 8DP')
})

test('shows the empty state when the endpoint has nothing', async ({
  page,
  mocker,
}) => {
  // Before `goto`: a route is consulted when the request happens, so an override
  // registered afterwards never fires. This is the one rule the package asks a
  // test to keep, and it cannot be enforced.
  mocker.use('GET /api/devices?propertyReference=[reference]', { count: 0 })

  await page.goto('/')

  await expect(page.locator('#empty')).toBeVisible()
  await expect(page.locator('#devices li')).toHaveCount(0)
})

test('shows the error state when the endpoint fails', async ({
  page,
  mocker,
}) => {
  // A requested failure is never stored: a 500 written to disk would become the
  // endpoint's permanent answer, including for the tests above.
  mocker.use('GET /api/devices?propertyReference=[reference]', { status: 503 })

  await page.goto('/')

  await expect(page.locator('#error')).toBeVisible()
})

test('bends one endpoint and leaves the other alone', async ({
  page,
  mocker,
}) => {
  mocker.use('GET /api/devices?propertyReference=[reference]', { count: 1 })

  await page.goto('/')

  await expect(page.locator('#devices li')).toHaveCount(1)
  // The property endpoint still answers from its own fixture, which is what
  // stops a test about an empty table from having to describe every other
  // request the page makes.
  await expect(page.locator('#reference')).toHaveText('ABC123')
})
