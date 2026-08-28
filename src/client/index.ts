import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createBrandMark, createBrandName } from './Brand.tsx'
import { normalizeBrandConfig, type BrandConfig } from './config.ts'
import { installDocumentTitleBrand } from './title.ts'

/** Global injected by the host half before client modules execute. */
export const BRAND_GLOBAL = '__NINGBO_DSH_BRAND__'

declare global {
  interface Window {
    __NINGBO_DSH_BRAND__?: BrandConfig
  }
}

/** Required service: the generic slot registry. */
export const inject = ['slots']

/**
 * Install one brand across all first-class brand slots. Nesting makes the
 * registration declaration-aware and ensures teardown removes every surface.
 */
export function installBrand(ctx: ClientContext, config: BrandConfig = {}): void {
  const brand = normalizeBrandConfig(config)
  const BrandMark = createBrandMark(brand)
  const BrandName = createBrandName(brand)

  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, BrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, BrandName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, BrandMark)
      })))
}

/** Read host-injected metadata and occupy the shipped brand extension slots. */
export function apply(ctx: ClientContext): void {
  const brand = normalizeBrandConfig(window[BRAND_GLOBAL] ?? {})
  installBrand(ctx, brand)
  ctx.effect(() => installDocumentTitleBrand(brand.productName), 'dsh-client-ui-brand: document title')
}
