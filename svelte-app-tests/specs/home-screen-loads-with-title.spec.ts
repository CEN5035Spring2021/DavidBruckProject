import 'expect-puppeteer';

describe('Home screen loads with title', () => {
    beforeAll(async() =>
        page.goto('http://127.0.0.1:5000'));

    const h1Text = 'CEN5035 Spring 2021 David Bruck Project'
    it(`Should display header '${h1Text}'`, async () =>
        expect(page).toMatch(h1Text));
});
