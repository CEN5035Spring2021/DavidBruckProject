import 'expect-puppeteer';

describe('Home screen loads with title', () => {
    beforeEach(async() => {
        await page.goto('http://localhost:5000');
        await page.waitForSelector(
            '.modal',
            {
                hidden: true,
                timeout: 30000
            });
    });

    const h1Text = 'CEN5035 Spring 2021 David Bruck Project';
    it(`Should display header '${h1Text}'`, async() =>
        expect(page).toMatch(h1Text));
});
