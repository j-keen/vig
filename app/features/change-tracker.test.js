import test from 'ava'
import puppeteer from 'puppeteer'

// Custom setup for this test file using port 3333
const setupPptrTab = async t => {
  t.context.browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  t.context.page = await t.context.browser.newPage()
  await t.context.page.goto(`http://localhost:${process.env.E2E_PORT || '3300'}`)
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
      hasMarginTop: original && original.marginTop !== undefined,
      hasShorthandMargin: original && original.margin !== undefined,
      hasShorthandPadding: original && original.padding !== undefined,
      hasInline: original && original._inline !== undefined,
    }
  })

  t.true(result.hasWidth, 'Should capture width')
  t.true(result.hasHeight, 'Should capture height')
  t.true(result.hasMarginTop, 'Should capture marginTop longhand')
  t.falsy(result.hasShorthandMargin, 'Should not track shorthand margin')
  t.falsy(result.hasShorthandPadding, 'Should not track shorthand padding')
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

test('margin change tracks longhand only, not shorthand', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.style.marginTop = '8px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    el.style.marginTop = '24px'
    window.ChangeTracker.updateCurrent(el)

    const changes = window.ChangeTracker.getChanges(el)
    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return {
      keys: Object.keys(changes),
      marginTop: changes.marginTop,
      hasMargin: 'margin' in changes,
    }
  })

  t.true(result.keys.includes('marginTop'), 'Should track marginTop')
  t.false(result.hasMargin, 'Should not also emit shorthand margin')
  t.is(result.marginTop, '24px')
})

test('undo is step-by-step across multiple commits, redo restores each step', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.style.width = '100px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)

    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    el.style.width = '300px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    el.style.width = '400px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    const afterThree = el.style.width

    window.ChangeTracker.undo()
    const afterUndo1 = el.style.width
    const changesAfterUndo1 = window.ChangeTracker.getChanges(el).width

    window.ChangeTracker.undo()
    const afterUndo2 = el.style.width

    window.ChangeTracker.undo()
    const afterUndo3 = el.style.width
    const changeCountAfterFullUndo = window.ChangeTracker.getAllChanges().size

    window.ChangeTracker.redo()
    const afterRedo1 = el.style.width
    window.ChangeTracker.redo()
    const afterRedo2 = el.style.width
    window.ChangeTracker.redo()
    const afterRedo3 = el.style.width
    const changesAfterFullRedo = window.ChangeTracker.getChanges(el).width

    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return {
      afterThree,
      afterUndo1,
      changesAfterUndo1,
      afterUndo2,
      afterUndo3,
      changeCountAfterFullUndo,
      afterRedo1,
      afterRedo2,
      afterRedo3,
      changesAfterFullRedo,
    }
  })

  t.is(result.afterThree, '400px')
  t.is(result.afterUndo1, '300px', 'First undo should restore the previous commit, not the original')
  t.is(result.changesAfterUndo1, '300px', 'Tracking should recompute after undo, not drop the element')
  t.is(result.afterUndo2, '200px')
  t.is(result.afterUndo3, '100px')
  t.is(result.changeCountAfterFullUndo, 0, 'Matching original should yield empty changes')
  t.is(result.afterRedo1, '200px')
  t.is(result.afterRedo2, '300px')
  t.is(result.afterRedo3, '400px')
  t.is(result.changesAfterFullRedo, '400px')
})

test('trackDeletion ignores overlay nodes and undo skips invalid deletion records', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'real-del-el'
    el.textContent = 'Keep me'
    document.body.appendChild(el)

    const overlay = document.createElement('visbug-handles')
    overlay.setAttribute('data-label-id', '0')
    document.body.appendChild(overlay)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.trackDeletion(el)
    window.ChangeTracker.trackDeletion(overlay)
    overlay.remove()

    const afterTrack = window.ChangeTracker.getDeletedElements().map(d => d.identifier)

    el.remove()

    const undo1 = window.ChangeTracker.undo()
    const restored = undo1 && undo1.element && undo1.element.id
    const parentOk = !!(undo1 && undo1.parent && undo1.parent.isConnected)

    window.ChangeTracker.clearAll()
    return { afterTrack, undoType: undo1 && undo1.type, restored, parentOk }
  })

  t.deepEqual(result.afterTrack, ['#real-del-el'])
  t.is(result.undoType, 'deletion')
  t.is(result.restored, 'real-del-el')
  t.true(result.parentOk)
})

test('trackDeletion stores clonedNode for AI HTML snippets', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('button')
    el.id = 'snippet-delete'
    el.textContent = 'Close'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.trackDeletion(el)

    const deleted = window.ChangeTracker.getDeletedElements()[0]
    const html = deleted && deleted.clonedNode && deleted.clonedNode.outerHTML

    window.ChangeTracker.clearAll()

    return {
      hasClonedNode: !!(deleted && deleted.clonedNode),
      html,
    }
  })

  t.true(result.hasClonedNode, 'deletedElements should keep clonedNode')
  t.true(result.html.includes('Close'), 'clonedNode should preserve element HTML')
})

test('setNote/getNote track a note-only element as a change without style edits', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'note-only'
    document.body.appendChild(el)

    const beforeHasChanges = window.ChangeTracker.hasChanges()

    window.ChangeTracker.setNote(el, '  더 눈에 띄게  ')

    const note = window.ChangeTracker.getNote(el)
    const hasChanges = window.ChangeTracker.hasChanges()
    const trackedCount = window.ChangeTracker.getTrackedCount()

    const allChanges = window.ChangeTracker.getAllChanges()
    let foundNote = null
    for (const [element, changes] of allChanges) {
      if (element === el) foundNote = changes._note
    }

    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return { beforeHasChanges, note, hasChanges, trackedCount, foundNote }
  })

  t.false(result.beforeHasChanges, 'no note yet -> no changes')
  t.is(result.note, '더 눈에 띄게', 'note should be trimmed')
  t.true(result.hasChanges, 'a note alone should count as a change')
  t.is(result.trackedCount, 1, 'note-only element should count as one tracked item')
  t.is(result.foundNote, '더 눈에 띄게', 'getAllChanges should surface _note')
})

test('setNote with empty text clears the note, removeTrackedById clears it too', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'note-clear'
    document.body.appendChild(el)

    window.ChangeTracker.setNote(el, 'hello')
    window.ChangeTracker.setNote(el, '   ')
    const noteAfterClear = window.ChangeTracker.getNote(el)
    const countAfterClear = window.ChangeTracker.getTrackedCount()

    window.ChangeTracker.setNote(el, 'hello again')
    const id = window.ChangeTracker.getElementId(el)
    window.ChangeTracker.removeTrackedById(id)
    const noteAfterRemove = window.ChangeTracker.getNote(el)

    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return { noteAfterClear, countAfterClear, noteAfterRemove }
  })

  t.is(result.noteAfterClear, null, 'blank text should clear the note')
  t.is(result.countAfterClear, 0, 'no tracked items once note is cleared')
  t.is(result.noteAfterRemove, null, 'removeTrackedById should also drop the note')
})

test('setPageNote/getPageNote and clearAll reset page-level note', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const before = window.ChangeTracker.getPageNote()
    window.ChangeTracker.setPageNote('  전체적으로 더 모던하게  ')
    const after = window.ChangeTracker.getPageNote()
    const hasChanges = window.ChangeTracker.hasChanges()
    const trackedCount = window.ChangeTracker.getTrackedCount()

    window.ChangeTracker.clearAll()
    const afterClear = window.ChangeTracker.getPageNote()

    return { before, after, hasChanges, trackedCount, afterClear }
  })

  t.is(result.before, null)
  t.is(result.after, '전체적으로 더 모던하게')
  t.true(result.hasChanges)
  t.is(result.trackedCount, 1, 'page note should count as one item')
  t.is(result.afterClear, null, 'clearAll should reset the page note')
})

test('getUndoStackSnapshot exposes commits without mutating the real undo stack', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.style.width = '100px'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)
    window.ChangeTracker.pushToUndoStack(el)

    const snapshotBefore = window.ChangeTracker.getUndoStackSnapshot()
    // Calling it again / reading it should not consume the stack
    const snapshotAgain = window.ChangeTracker.getUndoStackSnapshot()

    const undoResult = window.ChangeTracker.undo()
    const widthAfterUndo = el.style.width

    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return {
      lengthBefore: snapshotBefore.length,
      lengthAgain: snapshotAgain.length,
      firstType: snapshotBefore[0] && snapshotBefore[0].type,
      undoType: undoResult && undoResult.type,
      widthAfterUndo,
    }
  })

  t.is(result.lengthBefore, 1)
  t.is(result.lengthAgain, 1, 'reading the snapshot twice should not pop entries')
  t.is(result.firstType, 'style')
  t.is(result.undoType, 'style', 'the real undo stack should still work after snapshotting')
  t.is(result.widthAfterUndo, '100px')
})

test('toggleCompareMode/restoreFromCompare cover text changes without altering tracked state', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const el = document.createElement('div')
    el.id = 'compare-text'
    el.textContent = 'Original text'
    document.body.appendChild(el)

    window.ChangeTracker.captureOriginal(el)
    window.ChangeTracker.captureOriginalText(el)

    el.style.width = '200px'
    window.ChangeTracker.updateCurrent(el)

    el.textContent = 'Changed text'
    window.ChangeTracker.updateCurrentText(el)

    const beforeChanges = JSON.stringify([...window.ChangeTracker.getAllChanges()].map(([, c]) => c))

    const saved = window.ChangeTracker.toggleCompareMode(true)
    const duringWidth = el.style.width
    const duringText = el.textContent

    window.ChangeTracker.restoreFromCompare(saved)
    const afterWidth = el.style.width
    const afterText = el.textContent
    const afterChanges = JSON.stringify([...window.ChangeTracker.getAllChanges()].map(([, c]) => c))

    document.body.removeChild(el)
    window.ChangeTracker.clearAll()

    return { beforeChanges, duringWidth, duringText, afterWidth, afterText, afterChanges }
  })

  t.is(result.duringWidth, '', 'compare mode should show original (empty inline) width')
  t.is(result.duringText, 'Original text', 'compare mode should show original text')
  t.is(result.afterWidth, '200px', 'restoring should bring back the changed width')
  t.is(result.afterText, 'Changed text', 'restoring should bring back the changed text')
  t.is(result.afterChanges, result.beforeChanges, 'getAllChanges should be unaffected by a preview cycle')
})
