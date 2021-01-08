const puppeteer = require('puppeteer');

let browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
})

let page;
beforeEach(async () => {
  page = await browser.newPage();
  await page.goto("http://localhost:3000");
})

afterEach(async () => { await page.close() })
afterAll(async () => { await browser.close() })

test('New note button exists', async () => {
  let button = await page.$('button');
  expect(button).toBeTruthy();
})
