import test from 'ava'

import { setupPptrTab, teardownPptrTab } from '../../tests/helpers'

// 내 킷(Kit) E2E: capture/store round-trip, preview 되돌리기, apply(style/block) 추적 + undo/redo

test.beforeEach(async t => {
  await setupPptrTab(t)
})

test.afterEach.always(teardownPptrTab)

test.serial('capture(): cleans data-* attrs from html, computes css/size/classes from a fixed-position button', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const btn = document.createElement('button')
    btn.className = 'btn primary'
    btn.textContent = '구매하기'
    btn.style.cssText = 'position:fixed;left:50px;top:50px;width:120px;height:40px;' +
      'background-color:#4f46e5;color:#ffffff;z-index:999999;'
    btn.setAttribute('data-selected', 'true')
    btn.setAttribute('data-label-id', 'abc123')
    document.body.appendChild(btn)

    const item = window.DesignPokeKit.capture(btn)

    document.body.removeChild(btn)

    return {
      html: item.html,
      bg: item.css.backgroundColor,
      w: item.size.w,
      h: item.size.h,
      classes: item.classes,
      kind: item.kind,
      name: item.name,
    }
  })

  t.false(/data-selected/.test(result.html), 'html should not contain data-selected')
  t.false(/data-label-id/.test(result.html), 'html should not contain data-label-id')
  t.regex(result.bg, /^(#|rgb)/i, 'backgroundColor should be hex or rgb()')
  t.true(result.w > 0, 'width should be > 0')
  t.true(result.h > 0, 'height should be > 0')
  t.is(result.classes, 'btn primary')
  t.is(result.kind, 'auto')
  t.truthy(result.name)
})

test.serial('add/list/get/remove/export/import round trip; builtin items are read-only; import dedupes', async t => {
  const { page } = t.context

  const result = await page.evaluate(async () => {
    const Kit = window.DesignPokeKit
    await Kit.load()

    const before = Kit.list().length

    const div = document.createElement('div')
    div.className = 'my-card'
    div.textContent = 'hello'
    div.style.cssText = 'position:fixed;left:10px;top:10px;width:100px;height:50px;'
    document.body.appendChild(div)

    const captured = Kit.capture(div)
    document.body.removeChild(div)

    const added = Kit.add(captured)
    const afterAddCount = Kit.list().length
    const foundById = Kit.get(added.id)

    const removedBuiltin = Kit.remove('builtin:does-not-exist')
    const updatedBuiltin = Kit.update('builtin:does-not-exist', { name: 'x' })

    const exported = Kit.exportJSON()
    const parsedExport = JSON.parse(exported)

    const removed = Kit.remove(added.id)
    const afterRemoveCount = Kit.list().length

    const importResult1 = Kit.importJSON(exported)
    const listAfterImport1 = Kit.list().length
    const importResult2 = Kit.importJSON(exported)
    const listAfterImport2 = Kit.list().length

    return {
      before,
      addedHasId: typeof added.id === 'string' && added.id.startsWith('kit:'),
      afterAddCount,
      foundById: !!foundById && foundById.id === added.id,
      removedBuiltin,
      updatedBuiltin,
      exportHasItem: parsedExport.items.some(it => it.id === added.id),
      removed,
      afterRemoveCount,
      importResult1,
      listAfterImport1,
      importResult2,
      listAfterImport2,
    }
  })

  t.is(result.afterAddCount, result.before + 1)
  t.true(result.addedHasId)
  t.true(result.foundById)
  t.false(result.removedBuiltin, 'removing a builtin id should return false')
  t.is(result.updatedBuiltin, null, 'updating a builtin id should return null')
  t.true(result.exportHasItem)
  t.true(result.removed)
  t.is(result.afterRemoveCount, result.before)
  t.is(result.importResult1.added, 1)
  t.is(result.listAfterImport1, result.before + 1)
  t.is(result.importResult2.added, 0)
  t.is(result.importResult2.skipped, 1, 'importing the same export again should dedupe by id')
  t.is(result.listAfterImport2, result.before + 1)
})

test.serial('preview(style) reverts to identical computed styles; preview(block) restores the same element instance at the same index', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    const Kit = window.DesignPokeKit

    // style
    const target = document.createElement('div')
    target.style.cssText = 'position:fixed;left:10px;top:120px;width:80px;height:30px;' +
      'background-color:#000000;color:#111111;'
    document.body.appendChild(target)

    const beforeBg = getComputedStyle(target).backgroundColor
    const beforeColor = getComputedStyle(target).color

    const styleItem = { id: 'kit:test-style', name: 'style-item', css: { backgroundColor: '#ff0000', color: '#00ff00' } }
    const { revert: revertStyle } = Kit.preview(target, styleItem, 'style')
    const duringBg = getComputedStyle(target).backgroundColor

    revertStyle()
    const afterBg = getComputedStyle(target).backgroundColor
    const afterColor = getComputedStyle(target).color

    document.body.removeChild(target)

    // block
    const wrap = document.createElement('div')
    wrap.id = 'block-preview-wrap'
    wrap.innerHTML = '<span>a</span><div id="block-target">original</div><span>b</span>'
    document.body.appendChild(wrap)

    const blockTarget = document.getElementById('block-target')
    const indexBefore = Array.from(wrap.children).indexOf(blockTarget)

    const blockItem = { id: 'kit:test-block', name: 'block-item', html: '<div class="new">new content</div>' }
    const { revert: revertBlock } = Kit.preview(blockTarget, blockItem, 'block')

    revertBlock()

    const restored = document.getElementById('block-target')
    const sameInstance = restored === blockTarget
    const indexAfter = Array.from(wrap.children).indexOf(restored)

    document.body.removeChild(wrap)

    return { beforeBg, duringBg, afterBg, beforeColor, afterColor, sameInstance, indexBefore, indexAfter }
  })

  t.is(result.afterBg, result.beforeBg)
  t.is(result.afterColor, result.beforeColor)
  t.not(result.duringBg, result.beforeBg)
  t.true(result.sameInstance, 'the original element instance should be back in the DOM')
  t.is(result.indexAfter, result.indexBefore)
})

test.serial('apply(style) creates one undo entry, ChangeTracker.undo() restores styles, AIFormatter mentions the kit swap', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const target = document.createElement('button')
    target.textContent = 'CTA'
    target.style.cssText = 'position:fixed;left:10px;top:220px;width:100px;height:36px;background-color:#000000;'
    document.body.appendChild(target)

    const beforeBg = getComputedStyle(target).backgroundColor

    const item = { id: 'builtin:test-style-apply', name: '테스트 스타일 킷', css: { backgroundColor: '#123456' } }
    const applyResult = window.DesignPokeKit.apply(target, item, 'style')

    const duringBg = getComputedStyle(target).backgroundColor
    const undoCountAfterApply = window.ChangeTracker.getUndoStackSnapshot().length

    const aiPrompt = window.AIFormatter.formatAllForAI()

    const undoResult = window.ChangeTracker.undo()
    const afterUndoBg = getComputedStyle(target).backgroundColor

    document.body.removeChild(target)

    return {
      mode: applyResult.mode,
      elementIsSame: applyResult.element === target,
      beforeBg,
      duringBg,
      afterUndoBg,
      undoCountAfterApply,
      undoType: undoResult && undoResult.type,
      aiHasKit: aiPrompt.includes('킷 적용'),
    }
  })

  t.is(result.mode, 'style')
  t.true(result.elementIsSame)
  t.not(result.duringBg, result.beforeBg)
  t.is(result.undoCountAfterApply, 1)
  t.is(result.undoType, 'style')
  t.true(result.aiHasKit)
  t.is(result.afterUndoBg, result.beforeBg)
})

test.serial('apply(block) transplants target content into kit html; getAllChanges has _kit(block); undo/redo swap the same instances', async t => {
  const { page } = t.context

  const result = await page.evaluate(() => {
    window.ChangeTracker.clearAll()

    const wrap = document.createElement('div')
    wrap.id = 'kit-block-wrap'
    wrap.innerHTML = '<div class="card"><h3>제목</h3><p>본문</p><a href="/x">더보기</a></div>'
    document.body.appendChild(wrap)

    const target = wrap.querySelector('.card')

    const item = {
      id: 'kit:test-block-apply',
      name: '테스트 카드 킷',
      html: '<div class="new-card"><h2>플레이스홀더 제목</h2><p>플레이스홀더 본문</p><a href="#">플레이스홀더 링크</a></div>',
      css: {},
    }

    const applyResult = window.DesignPokeKit.apply(target, item, 'block')
    const newEl = applyResult.element

    const h2Text = newEl.querySelector('h2').textContent
    const pText = newEl.querySelector('p').textContent
    const aText = newEl.querySelector('a').textContent
    const aHref = newEl.querySelector('a').getAttribute('href')

    let kitEntry = null
    window.ChangeTracker.getAllChanges().forEach((changes, el) => {
      if (el === newEl) kitEntry = changes._kit
    })

    const undoResult = window.ChangeTracker.undo()
    const backIsOriginal = undoResult.element === target && wrap.contains(target)

    const redoResult = window.ChangeTracker.redo()
    const redoIsNewInstance = redoResult.element === newEl && wrap.contains(newEl)

    document.body.removeChild(wrap)

    return {
      mode: applyResult.mode,
      h2Text, pText, aText, aHref,
      kitMode: kitEntry && kitEntry.mode,
      kitItemName: kitEntry && kitEntry.itemName,
      backIsOriginal,
      redoIsNewInstance,
    }
  })

  t.is(result.mode, 'block')
  t.is(result.h2Text, '제목')
  t.is(result.pText, '본문')
  t.is(result.aText, '더보기')
  t.is(result.aHref, '/x')
  t.is(result.kitMode, 'block')
  t.is(result.kitItemName, '테스트 카드 킷')
  t.true(result.backIsOriginal, 'undo should put the original element instance back')
  t.true(result.redoIsNewInstance, 'redo should swap the same new element instance back in')
})
