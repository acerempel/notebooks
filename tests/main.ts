import puppeteer from 'puppeteer';

let browser: puppeteer.Browser;
beforeAll(async () => { browser = await puppeteer.launch({ headless: true }); })
afterAll(async () => { await browser.close() })

describe("'Notes' page", () => {

  let page: puppeteer.Page;
  beforeAll(async () => { page = await browser.newPage(); })
  afterAll(() => page.close())

  beforeEach(() => page.goto("http://localhost:3000/notes"))

  test('has the correct title',
    () => page.title().then(title => expect(title).toBe("Notes"))
  )

})

describe("'New note' page", () => {

  let page: puppeteer.Page;
  beforeAll(async () => { page = await browser.newPage(); })
  afterAll(() => page.close())

  let newNoteButton: puppeteer.ElementHandle;

  test('New note button exists', async () => {
    await page.goto("http://localhost:3000/notes");
    const [button] = await page.$x('//button[text() = "New note"]')
    // Really I would like to check that it's an instance of `ElementHandle`,
    // but I don't know how to import the class.
    expect(button).toBeTruthy();
    newNoteButton = button;
  })

  const isEditorFocussed = (p: puppeteer.Page) => p.evaluate(() => document.activeElement?.classList.contains("ProseMirror"))

  test('Clicking new note button causes editor to become focussed', async () => {
    await newNoteButton.click();
    const editorIsFocussed = await isEditorFocussed(page);
    expect(editorIsFocussed).toBe(true)
  })

  test('Navigating to /notes/new focuses the editor', async () => {
    await page.goto("http://localhost:3000/notes/new");
    const editorIsFocussed = await isEditorFocussed(page);
    expect(editorIsFocussed).toBe(true)
  })

  test('New note page has the correct title', async () => {
    await page.goto("http://localhost:3000/notes/new");
    return page.title().then(title => expect(title).toBe("New note"))
  })

})
