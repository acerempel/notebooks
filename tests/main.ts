import puppeteer from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const baseURL = "http://localhost:3000"
const newNoteButtonXPath = '//button[text() = "New note"]'
const editorClass = "ProseMirror"
const editorSelector = `.${editorClass}`

async function getEditor(page: puppeteer.Page): Promise<puppeteer.ElementHandle> {
  const editor = await page.$(editorSelector);
  expect(editor).toBeTruthy();
  return editor!
}

let server: ChildProcess;
let dead: Promise<void>;
let browser: puppeteer.Browser;

function spawnServer(): Promise<[ChildProcess, Promise<void>]> {
  return new Promise((resolve, _reject) => {
    let child = spawn("yarn run start", { detached: false, shell: true, stdio: ['ignore', 'inherit', 'inherit'] })
    let deadPromise = new Promise<void>((resolveDead, _reject) => {
      child.on('exit', () => resolveDead())
    })
    // I want to write this, but the 'spawn' event is not available until Node
    // 15.1 and I don't feel like upgrading.
    // child.on('spawn', () => resolve([child, deadPromise]))
    child.on('error', (error: Error) => {
      console.error("Error with server: " + error);
      process.exit()
    })
    setTimeout(() => resolve([child, deadPromise]), 3000);
  })
}

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true })
  if (process.env.CI) { [server, dead] = await spawnServer(); }
}, 7000)

afterAll(async () => {
  await browser.close();
  if (server) {
    server.kill();
    await dead;
  }
})

describe("'Notes' page", () => {

  let page: puppeteer.Page;
  beforeAll(async () => { page = await browser.newPage(); })
  afterAll(() => page.close())

  beforeEach(() => page.goto(baseURL + "/notes"))

  test('has the correct title',
    () => page.title().then(title => expect(title).toBe("Notes"))
  )

})

describe("'New note' page", () => {

  let page: puppeteer.Page;
  beforeAll(async () => { page = await browser.newPage(); })
  afterAll(() => page.close())

  const isEditorFocussed = (p: puppeteer.Page) => p.evaluate((cls) => document.activeElement?.classList.contains(cls), editorClass)

  test('Clicking new note button causes editor to become focussed', async () => {
    await page.goto(baseURL + "/notes");
    const [newNoteButton] = await page.$x(newNoteButtonXPath)
    expect(newNoteButton).toBeTruthy();
    await newNoteButton!.click();
    const editorIsFocussed = await isEditorFocussed(page);
    expect(editorIsFocussed).toBe(true)
  })

  test('Navigating to /notes/new focuses the editor', async () => {
    await page.goto(baseURL + "/notes/new");
    const editorIsFocussed = await isEditorFocussed(page);
    expect(editorIsFocussed).toBe(true)
  })

  test('New note page has the correct title', async () => {
    await page.goto(baseURL + "/notes/new");
    return page.title().then(title => expect(title).toBe("New note"))
  })

})

describe('Switching between notes', () => {

  let page: puppeteer.Page;
  beforeAll(async () => { page = await browser.newPage(); })
  afterAll(() => page.close())

  const text1 = "Potato", text2 = "Tomato";
  const [para1, para2] = [text1, text2].map(t => `<p>${t}</p>`)
  const emptyPara = "<p><br></p>"

  test('Typing some text in an initial empty note', async () => {
    await page.goto(baseURL + "/notes/new");
    const editor = await getEditor(page);
    await editor.type(text1, { delay: 10 });
    expect(await editor.evaluate(el => el.innerHTML)).toBe(para1);
  })

  test('Typing some text in an additional empty note', async () => {
    const [button] = await page.$x(newNoteButtonXPath)
    await button.click();
    const editor = await getEditor(page);
    expect(await editor.evaluate(el => el.innerHTML)).toBe(emptyPara);
    await editor.type(text2, { delay: 10 });
    expect(await editor.evaluate(el => el.innerHTML)).toBe(para2);
  })

  test('Switching to the previous note', async () => {
    const prevNoteLink = await page.$('ul[aria-label="Notes"]>li:first-child a');
    expect(prevNoteLink).toBeTruthy();
    await prevNoteLink!.click();
    const editor = await getEditor(page);
    expect(await editor.evaluate(el => el.innerHTML)).toBe(para1);
  })

})
