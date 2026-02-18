import test from 'ava'
import puppeteer from 'puppeteer'

// Custom setup for this test file using port 3333
const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  await t.context.page.goto('http://localhost:3333')
  await t.context.page.evaluateHandle(`document.body.setAttribute('testing', true)`)
  await t.context.page.waitForSelector('vis-bug', { timeout: 10000 })
}

const teardownPptrTab = async ({context:{ page, browser }}) => {
  if (page) await page.close()
  if (browser) await browser.close()
}

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach.always(async t => {
  await teardownPptrTab(t)
})

test('ChangeTracker is available on window', async t => {
  const { page } = t.context

  const available = await page.evaluate(() => {
    return typeof window.ChangeTracker !== 'undefined'
  })

  t.true(available, 'window.ChangeTracker should be available')
})

test('captureOriginal stores original computed styles', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.width = '100px'
    el.style.height = '50px'
    el.style.margin = '10px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    const original = window.ChangeTracker.getOriginalStyles(el)

    document.body.removeChild(el)

    return {
      hasWidth: original && original.width !== undefined,
      hasHeight: original && original.height !== undefined,
      hasMargin: original && original.margin !== undefined,
      hasInline: original && original._inline !== undefined,
    }
  })

  t.true(result.hasWidth, 'Should capture width')
  t.true(result.hasHeight, 'Should capture height')
  t.true(result.hasMargin, 'Should capture margin')
  t.true(result.hasInline, 'Should store inline styles')
})

test('updateCurrent detects style changes', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.width = '100px'
    el.style.height = '50px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)

    // Modify styles
    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)

    document.body.removeChild(el)

    return {
      hasWidthChange: changes.width !== undefined,
      hasHeightChange: changes.height !== undefined,
      widthValue: changes.width,
    }
  })

  t.true(result.hasWidthChange, 'Should detect width change')
  t.false(result.hasHeightChange, 'Should not show unchanged height')
  t.is(result.widthValue, '200px', 'Should capture new width value')
})

test('getAllChanges returns only changed elements', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    el1.style.width = '100px'
    el2.style.width = '100px'
    document.body.appendChild(el1)
    document.body.appendChild(el2)

    window.ChangeTracker.captureOriginal(el1)
    window.ChangeTracker.captureOriginal(el2)

    // Change only el1
    el1.style.width = '200px'
    window.ChangeTracker.updateCurrent(el1)

    // Update el2 but don't change it
    window.ChangeTracker.updateCurrent(el2)

    const allChanges = window.ChangeTracker.getAllChanges()
    const changeCount = allChanges.size

    document.body.removeChild(el1)
    document.body.removeChild(el2)
    window.ChangeTracker.clearAll()

    return { changeCount }
  })

  t.is(result.changeCount, 1, 'Should only return changed elements')
})

test('getOriginalStyles returns stored original styles', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.width = '100px'
    el.style.height = '50px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)

    const original = window.ChangeTracker.getOriginalStyles(el)

    // Modify element
    el.style.width = '200px'

    // Original should remain unchanged
    const originalAfter = window.ChangeTracker.getOriginalStyles(el)

    document.body.removeChild(el)

    return {
      originalWidth: original.width,
      stillSameWidth: originalAfter.width === original.width,
    }
  })

  t.is(result.originalWidth, '100px', 'Should return original width')
  t.true(result.stillSameWidth, 'Original should not change after modification')
})

test('trackDeletion records deleted element info', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'test-delete'
    el.style.width = '100px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.trackDeletion(el)

    const deleted = window.ChangeTracker.getDeletedElements()

    return {
      deletedCount: deleted.length,
      identifier: deleted[0]?.identifier,
      tagName: deleted[0]?.tagName,
      hasOriginal: deleted[0]?.original !== undefined,
    }
  })

  t.is(result.deletedCount, 1, 'Should have one deleted element')
  t.is(result.identifier, '#test-delete', 'Should store element identifier')
  t.is(result.tagName, 'div', 'Should store tag name')
  t.true(result.hasOriginal, 'Should store original styles')
})

test('undo restores original styles', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.width = '100px'
    document.body.appendChild(el)

    window.ChangeTracker.clearAll()
    window.ChangeTracker.captureOriginal(el)

    // Change style
    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    // Undo
    const undoResult = window.ChangeTracker.undo()
    const widthAfterUndo = el.style.width

    document.body.removeChild(el)

    return {
      undoType: undoResult?.type,
      widthAfterUndo,
    }
  })

  t.is(result.undoType, 'style', 'Should undo style change')
  t.is(result.widthAfterUndo, '100px', 'Should restore original width')
})

test('redo re-applies changes', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const el = document.createElement('div')
    el.style.width = '100px'
    document.body.appendChild(el)

    window.ChangeTracker.clearAll()
    window.ChangeTracker.captureOriginal(el)

    // Change style
    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    // Undo
    window.ChangeTracker.undo()
    const widthAfterUndo = el.style.width

    // Redo
    const redoResult = window.ChangeTracker.redo()
    const widthAfterRedo = el.style.width

    document.body.removeChild(el)

    return {
      widthAfterUndo,
      widthAfterRedo,
      redoType: redoResult?.type,
    }
  })

  t.is(result.widthAfterUndo, '100px', 'Undo should restore original')
  t.is(result.widthAfterRedo, '200px', 'Redo should re-apply change')
  t.is(result.redoType, 'style', 'Should redo style change')
})

test('getTrackedCount includes deleted elements', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    el1.style.width = '100px'
    el2.style.width = '100px'
    document.body.appendChild(el1)
    document.body.appendChild(el2)

    window.ChangeTracker.captureOriginal(el1)
    window.ChangeTracker.captureOriginal(el2)

    // Change el1
    el1.style.width = '200px'
    window.ChangeTracker.updateCurrent(el1)

    // Delete el2
    window.ChangeTracker.trackDeletion(el2)

    const count = window.ChangeTracker.getTrackedCount()

    document.body.removeChild(el1)
    window.ChangeTracker.clearAll()

    return { count }
  })

  t.is(result.count, 2, 'Should count changed element + deleted element')
})

test('addScreenshot and getScreenshots work', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    window.ChangeTracker.addScreenshot({
      url: 'data:image/png;base64,ABC123',
      timestamp: Date.now(),
      description: 'Test screenshot'
    })

    const screenshots = window.ChangeTracker.getScreenshots()

    return {
      count: screenshots.length,
      hasId: screenshots[0]?.id !== undefined,
      url: screenshots[0]?.url,
      description: screenshots[0]?.description,
    }
  })

  t.is(result.count, 1, 'Should have one screenshot')
  t.true(result.hasId, 'Screenshot should have auto-generated id')
  t.is(result.url, 'data:image/png;base64,ABC123', 'Should store url')
  t.is(result.description, 'Test screenshot', 'Should store description')
})

test('undo deletion provides element restoration info', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'restore-test'
    el.textContent = 'Test Content'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.trackDeletion(el)

    // Remove from DOM
    el.remove()

    // Check deleted count
    const deletedCount = window.ChangeTracker.getDeletedElements().length

    // Undo deletion
    const undoResult = window.ChangeTracker.undo()

    // Check deleted count after undo
    const deletedCountAfter = window.ChangeTracker.getDeletedElements().length

    return {
      deletedCount,
      deletedCountAfter,
      undoType: undoResult?.type,
      hasElement: undoResult?.element !== undefined,
      hasParent: undoResult?.parent !== undefined,
    }
  })

  t.is(result.deletedCount, 1, 'Should have one deleted element')
  t.is(result.deletedCountAfter, 0, 'Should have zero deleted elements after undo')
  t.is(result.undoType, 'deletion', 'Should undo deletion')
  t.true(result.hasElement, 'Should provide element for restoration')
  t.true(result.hasParent, 'Should provide parent for restoration')
})
