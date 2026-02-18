export function createCallbackSystem(getSelected) {
  let selectedCallbacks = []

  const onSelectedUpdate = (cb, immediateCallback = true) => {
    selectedCallbacks.push(cb)
    if (immediateCallback) cb(getSelected())
  }

  const removeSelectedCallback = cb =>
    selectedCallbacks = selectedCallbacks.filter(callback => callback != cb)

  const tellWatchers = () =>
    selectedCallbacks.forEach(cb => cb(getSelected()))

  return { onSelectedUpdate, removeSelectedCallback, tellWatchers }
}
