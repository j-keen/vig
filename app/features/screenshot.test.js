import test from 'ava'

import { setupPptrTab, teardownPptrTab } from '../../tests/helpers'

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach(teardownPptrTab)

test('annotateImage draws numbered rects onto a PNG and returns a larger data:image/png URL', async t => {
  const { page } = t.context

  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 20
    canvas.height = 20
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 20, 20)
    const dataUrl = canvas.toDataURL('image/png')

    const rects = [
      { x: 1, y: 1, w: 8, h: 8, index: 1 },
      { x: 10, y: 10, w: 8, h: 8, index: 2 },
    ]

    const annotated = await window.ScreenshotAPI.annotateImage(dataUrl, rects)

    return {
      inputLength: dataUrl.length,
      outputLength: annotated.length,
      isPng: annotated.startsWith('data:image/png'),
    }
  })

  t.true(result.isPng, 'annotateImage should resolve to a PNG data URL')
  t.true(result.outputLength > result.inputLength, 'drawing 2 rects should make the image larger than the plain input')
})

test('annotateImage with no rects returns a valid PNG data URL (pass-through)', async t => {
  const { page } = t.context

  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 10, 10)
    const dataUrl = canvas.toDataURL('image/png')

    const annotated = await window.ScreenshotAPI.annotateImage(dataUrl, [])
    return { isPng: annotated.startsWith('data:image/png') }
  })

  t.true(result.isPng)
})

test('captureAnnotated fails gracefully in the sandbox (no extension bridge) without throwing', async t => {
  const { page } = t.context

  const result = await page.evaluate(async () => {
    window.ChangeTracker.clearAll()
    return await window.ScreenshotAPI.captureAnnotated()
  })

  t.false(result.success, 'no extension bridge is present in the sandbox, so capture should fail')
  t.truthy(result.message, 'a failure message should be provided instead of throwing')
})
