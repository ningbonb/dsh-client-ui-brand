import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Global name shared with this package's browser half. */
export const BRAND_GLOBAL = '__NINGBO_DSH_BRAND__'

/** Fixed path that exposes only the explicitly configured local logo. */
export const LOCAL_LOGO_ROUTE = '/plugins/dsh-client-ui-brand/brand-logo'

/** Fixed square SVG canvas around the configured product mark. */
export const SQUARE_LOGO_ROUTE = '/plugins/dsh-client-ui-brand/brand-mark.svg'

/** Fixed path that exposes the manifest generated from the configured brand. */
export const BRAND_MANIFEST_ROUTE = '/plugins/dsh-client-ui-brand/manifest.webmanifest'

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
  faviconHref?: string
  logoAlt: string
}

/** Browser manifest generated for a configured logo. */
interface BrandManifest {
  id: '/'
  name: string
  short_name: string
  start_url: '/'
  scope: '/'
  display: 'fullscreen'
  icons: Array<{
    src: string
    purpose: 'any'
    type?: string
  }>
}

interface LocalLogo {
  canonicalPath: string
  contentType: string
  dataHref: string
}

interface RemoteLogo {
  body: Buffer
  contentType: string
}

interface PreparedBrand {
  boot: BrandBootConfig
  localLogo?: LocalLogo
  manifest?: BrandManifest
  remoteLogo?: RemoteLogo
  squareLogoSource?: string
}

/** DSH service required by the Node half. */
export const inject = ['webServer']

/** Validate deployment configuration and produce browser-safe brand metadata. */
export async function prepareBrand(config: Config): Promise<PreparedBrand> {
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
    if (logoUrl.startsWith('https://')) {
      const remoteLogo = await prepareRemoteLogo(logoUrl)
      return { ...withLogo(base, logoUrl, LOCAL_LOGO_ROUTE), remoteLogo }
    }
    return withLogo(base, logoUrl)
  }

  if (config.logoPath === undefined) {
    return { boot: base }
  }

  const localLogo = await prepareLocalLogo(config.logoPath)
  return { ...withLogo(base, localLogo.dataHref), localLogo }
}

/** Add browser metadata derived from one already-validated product mark. */
function withLogo(
  base: Pick<BrandBootConfig, 'productName' | 'logoAlt'>,
  sourceHref: string,
  squareLogoSource = sourceHref,
): PreparedBrand {
  return {
    boot: { ...base, logoHref: sourceHref, faviconHref: SQUARE_LOGO_ROUTE },
    manifest: {
      id: '/',
      name: base.productName,
      short_name: base.productName,
      start_url: '/',
      scope: '/',
      display: 'fullscreen',
      icons: [{ src: SQUARE_LOGO_ROUTE, purpose: 'any', type: 'image/svg+xml' }],
    },
    squareLogoSource,
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

/** Infer an image MIME type when a configured URL carries a known extension. */
function contentTypeForUrl(value: string): string | undefined {
  if (value.startsWith('data:image/')) {
    const type = /^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(value)?.[1]
    return type === 'image/jpg' ? 'image/jpeg' : type
  }
  try {
    return MIME_BY_EXTENSION[extname(new URL(value, 'https://dsh.invalid').pathname).toLowerCase()]
  } catch {
    return undefined
  }
}

/** Download one configured HTTPS product mark for same-origin browser metadata. */
async function prepareRemoteLogo(value: string): Promise<RemoteLogo> {
  const response = await fetch(value)
  if (!response.ok) throw new Error(`dsh-client-ui-brand: logoUrl returned HTTP ${response.status}`)
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() || contentTypeForUrl(value)
  if (contentType === undefined || !contentType.startsWith('image/')) {
    throw new Error('dsh-client-ui-brand: logoUrl must return an image content type')
  }
  return { body: Buffer.from(await response.arrayBuffer()), contentType }
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
  const dataHref = `data:${contentType};base64,${(await readFile(canonicalPath)).toString('base64')}`
  return { canonicalPath, contentType, dataHref }
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

/** Serve one configured remote image from a fixed same-origin route. */
function serveRemoteLogo(logo: RemoteLogo) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    res.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': String(logo.body.byteLength),
      'content-type': logo.contentType,
      'x-content-type-options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : logo.body)
  }
}

/** Serialize a value as a fixed JSON endpoint with no request-controlled data. */
function serveJson(value: unknown) {
  const body = Buffer.from(JSON.stringify(value))
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    res.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': String(body.byteLength),
      'content-type': 'application/manifest+json',
      'x-content-type-options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  }
}

/** Escape an image URL before placing it in the generated SVG attribute. */
function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** Render a square SVG canvas that centers the supplied mark without distortion. */
export function renderSquareLogo(sourceHref: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><image href="${escapeXmlAttribute(sourceHref)}" width="1" height="1" preserveAspectRatio="xMidYMid meet"/></svg>`
}

/** Serve one generated square SVG canvas around the configured product mark. */
function serveSquareLogo(sourceHref: string) {
  const body = Buffer.from(renderSquareLogo(sourceHref))
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    res.writeHead(200, {
      'cache-control': 'no-store',
      'content-length': String(body.byteLength),
      'content-type': 'image/svg+xml',
      'x-content-type-options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  }
}

/** Escape operator-supplied text before embedding it in static HTML. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Replace one required shell element and fail if an incompatible shell is mounted. */
function replaceRequired(html: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(html)) {
    throw new Error(`dsh-client-ui-brand: Web Shell has no ${label} element to brand`)
  }
  return html.replace(pattern, replacement)
}

/** Apply deterministic product metadata to the Web Shell document. */
export function renderBrandIndex(html: string, boot: BrandBootConfig, manifest: BrandManifest | undefined): string {
  let rendered = replaceRequired(
    html,
    /<title\b[^>]*>[\s\S]*?<\/title\s*>/i,
    `<title>${escapeHtml(boot.productName)}</title>`,
    'title',
  )
  if (boot.faviconHref !== undefined) {
    const contentType = contentTypeForUrl(boot.faviconHref)
    rendered = replaceRequired(
      rendered,
      /<link\b(?=[^>]*\brel\s*=\s*["']icon["'])[^>]*>/i,
      `<link rel="icon" href="${escapeHtml(boot.faviconHref)}"${contentType === undefined ? '' : ` type="${contentType}"`}>`,
      'favicon',
    )
  }
  if (manifest !== undefined) {
    rendered = replaceRequired(
      rendered,
      /<link\b(?=[^>]*\brel\s*=\s*["']manifest["'])[^>]*>/i,
      `<link rel="manifest" href="${BRAND_MANIFEST_ROUTE}">`,
      'manifest',
    )
  }
  return rendered
}

/**
 * Publish brand metadata before client code runs and optionally serve one local
 * logo file. The local filesystem path is never added to browser-visible data.
 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const { boot, localLogo, manifest, remoteLogo, squareLogoSource } = await prepareBrand(config)

  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: BRAND_GLOBAL, value: boot })
  })

  ctx.effect(
    () => ctx.webServer.tapIndex((html) => renderBrandIndex(html, boot, manifest)),
    'dsh-client-ui-brand: document metadata',
  )

  if (localLogo !== undefined) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: LOCAL_LOGO_ROUTE,
      handler: serveLocalLogo(localLogo),
    }), 'dsh-client-ui-brand: local-logo route')
  }

  if (remoteLogo !== undefined) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: LOCAL_LOGO_ROUTE,
      handler: serveRemoteLogo(remoteLogo),
    }), 'dsh-client-ui-brand: remote-logo route')
  }

  if (squareLogoSource !== undefined) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: SQUARE_LOGO_ROUTE,
      handler: serveSquareLogo(squareLogoSource),
    }), 'dsh-client-ui-brand: square-logo route')
  }

  if (manifest !== undefined) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: BRAND_MANIFEST_ROUTE,
      handler: serveJson(manifest),
    }), 'dsh-client-ui-brand: manifest route')
  }
}
