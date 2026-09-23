import puppeteer from 'puppeteer'

export const setupPptrTab = async t => {
  t.context.browser  = await puppeteer.launch({
    // headless: false,
    args: ['--no-sandbox']
  })
  t.context.page     = await t.context.browser.newPage()

  await t.context.page.goto(`http://localhost:${process.env.E2E_PORT || '3300'}`)
  await t.context.page.evaluateHandle(`document.body.setAttribute('testing', true)`)
  await t.context.page.waitForSelector('vis-bug')
}

export const teardownPptrTab = async ({context:{ page, browser }}) => {
  await page.close()
}

export const changeMode = async ({page, tool}) => {
  await page.evaluate((t) => {
    const visBug = document.querySelector('vis-bug')
    if (visBug) visBug.toolSelected(t)
  }, tool)
  await page.waitForTimeout(100)
}

export const getActiveTool = async page =>
  await page.$eval('vis-bug', el =>
    el.activeTool)

export const pptrMetaKey = async page => {
  let isMac = await page.evaluate(_ => window.navigator.platform.includes('Mac'))
  return isMac ? "Meta" : "Control"
}