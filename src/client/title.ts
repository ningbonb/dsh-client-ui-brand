/** Project a DSH product or session title onto the configured product name. */
export function brandDocumentTitle(title: string, productName: string): string {
  const separator = ' — '
  const at = title.lastIndexOf(separator)
  return at === -1 ? productName : `${title.slice(0, at)}${separator}${productName}`
}

/** Keep the configured product name after DSH's runtime title projection writes. */
export function installDocumentTitleBrand(productName: string): () => void {
  let updating = false
  const apply = (): void => {
    if (updating) return
    const next = brandDocumentTitle(document.title, productName)
    if (document.title === next) return
    updating = true
    document.title = next
    updating = false
  }
  const observer = new MutationObserver(apply)
  observer.observe(document.head, { childList: true, characterData: true, subtree: true })
  apply()
  return () => { observer.disconnect() }
}
