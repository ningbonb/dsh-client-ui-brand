import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Global name shared with this package's browser half. */
export const BRAND_GLOBAL = '__NINGBO_DSH_BRAND__'

/** Fixed path that exposes only the explicitly configured local logo. */
export const LOCAL_LOGO_ROUTE = '/plugins/dsh-client-ui-brand/brand-logo'

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

/** Static deployment configuration supplied from the Cordis plugin row. Every field is optional. */
export interface Config {
  /** Product name rendered in the expanded sidebar. Defaults to Brand New Agent. */
  productName?: string
  /** HTTPS, same-origin, or data URL for the product mark. */
  logoUrl?: string
  /** Absolute local image file path served through the fixed plugin route. */
  logoPath?: string
  /** Accessible text for the product mark; defaults to productName. */
  logoAlt?: string
}

/** Immutable, browser-safe configuration injected into the initial document. */
export interface BrandBootConfig {
  productName: string
  logoHref?: string
  logoAlt: string
}

interface LocalLogo {
  canonicalPath: string
  contentType: string
}

/** DSH service required by the Node half. */
export const inject = ['webServer']

/** Validate deployment configuration and produce browser-safe brand metadata. */
export async function prepareBrand(config: Config): Promise<{ boot: BrandBootConfig; localLogo?: LocalLogo }> {
  if (config.logoUrl !== undefined && config.logoPath !== undefined) {
    throw new Error('dsh-client-ui-brand: configure only one of logoUrl or logoPath')
  }

  const productName = config.productName?.trim() || 'Brand New Agent'
  const logoAlt = config.logoAlt?.trim() || productName
  const logoUrl = config.logoUrl?.trim()
  const base = {
    productName,
    logoAlt,
  }

  if (logoUrl !== undefined && logoUrl.length === 0) {
    throw new Error('dsh-client-ui-brand: logoUrl must not be empty')
  }

  if (logoUrl !== undefined) {
    assertLogoUrl(logoUrl)
    return { boot: { ...base, logoHref: logoUrl } }
  }

  if (config.logoPath === undefined) {
    return { boot: base }
  }

  const localLogo = await prepareLocalLogo(config.logoPath)
  return {
    boot: { ...base, logoHref: LOCAL_LOGO_ROUTE },
    localLogo,
  }
}

/** Validate a remote/same-origin/data logo URL without doing a network request. */
function assertLogoUrl(value: string): void {
  if (value.startsWith('/') || value.startsWith('data:image/')) return
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('dsh-client-ui-brand: logoUrl must be an absolute HTTPS URL, a same-origin path, or a data:image URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('dsh-client-ui-brand: logoUrl only permits https: URLs')
  }
}

/** Resolve and validate one configured local logo without exposing its path to clients. */
async function prepareLocalLogo(value: string): Promise<LocalLogo> {
  if (!isAbsolute(value)) throw new Error('dsh-client-ui-brand: logoPath must be an absolute path')
  const input = await lstat(value)
  if (input.isSymbolicLink()) throw new Error('dsh-client-ui-brand: logoPath must not be a symbolic link')
  const canonicalPath = await realpath(value)
  const info = await stat(canonicalPath)
  if (!info.isFile()) throw new Error('dsh-client-ui-brand: logoPath must resolve to a regular file')
  const contentType = MIME_BY_EXTENSION[extname(canonicalPath).toLowerCase()]
  if (contentType === undefined) {
    throw new Error('dsh-client-ui-brand: logoPath must use gif, jpeg, jpg, png, svg, or webp')
  }
  return { canonicalPath, contentType }
}

/** Serve exactly one already-validated local asset, never a request-controlled path. */
function serveLocalLogo(logo: LocalLogo) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }

    try {
      const body = await readFile(logo.canonicalPath)
      res.writeHead(200, {
        'cache-control': 'no-store',
        'content-length': String(body.byteLength),
        'content-type': logo.contentType,
        'x-content-type-options': 'nosniff',
      })
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.writeHead(404)
      res.end()
    }
  }
}

/**
 * Publish brand metadata before client code runs and optionally serve one local
 * logo file. The local filesystem path is never added to browser-visible data.
 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const { boot, localLogo } = await prepareBrand(config)

  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: BRAND_GLOBAL, value: boot })
  })

  if (localLogo !== undefined) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: LOCAL_LOGO_ROUTE,
      handler: serveLocalLogo(localLogo),
    }), 'dsh-client-ui-brand: local-logo route')
  }
}
