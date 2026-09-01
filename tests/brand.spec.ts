import { mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND_MANIFEST_ROUTE, LOCAL_LOGO_ROUTE, SQUARE_LOGO_ROUTE, prepareBrand, renderBrandIndex, renderSquareLogo } from '../src/index.ts'
import { brandDocumentTitle } from '../src/client/title.ts'

describe('brand host configuration', () => {
  it('wraps product marks in a square SVG canvas without distortion', () => {
    expect(renderSquareLogo('https://cdn.example.test/a&b.png')).toContain(
      'href="https://cdn.example.test/a&amp;b.png" width="1" height="1" preserveAspectRatio="xMidYMid meet"',
    )
  })

  it('keeps the configured product name after runtime session-title updates', () => {
    expect(brandDocumentTitle('DSH Local Build', '千梦')).toBe('千梦')
    expect(brandDocumentTitle('Implement branding — DSH Local Build', '千梦'))
      .toBe('Implement branding — 千梦')
  })

  it('defaults to Brand New Agent without exposing a logo path', async () => {
    await expect(prepareBrand({})).resolves.toEqual({
      boot: { productName: 'Brand New Agent', logoAlt: 'Brand New Agent' },
    })
  })

  it('wraps a HTTPS logo URL in the square browser icon', async () => {
    await expect(prepareBrand({
      productName: 'Acme Agent',
      logoUrl: 'https://cdn.example.test/logo.svg',
    })).resolves.toEqual({
      boot: {
        productName: 'Acme Agent',
        logoAlt: 'Acme Agent',
        logoHref: SQUARE_LOGO_ROUTE,
        logoSquare: true,
      },
      manifest: {
        id: '/',
        name: 'Acme Agent',
        short_name: 'Acme Agent',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        icons: [{ src: SQUARE_LOGO_ROUTE, purpose: 'any', type: 'image/svg+xml' }],
      },
      squareLogoSource: 'https://cdn.example.test/logo.svg',
    })
  })

  it('rejects conflicting logo sources and insecure remote URLs', async () => {
    await expect(prepareBrand({ logoUrl: 'https://example.test/logo.svg', logoPath: '/tmp/logo.svg' }))
      .rejects.toThrow('only one of logoUrl or logoPath')
    await expect(prepareBrand({ logoUrl: 'http://example.test/logo.svg' }))
      .rejects.toThrow('only permits https')
  })

  it('maps a local image to a fixed route without leaking its pathname', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brand-logo-'))
    const image = join(root, 'logo.svg')
    await writeFile(image, '<svg xmlns="http://www.w3.org/2000/svg"/>')

    const result = await prepareBrand({ productName: 'Local Agent', logoPath: image })
    expect(result.boot).toEqual({
      productName: 'Local Agent',
      logoAlt: 'Local Agent',
      logoHref: SQUARE_LOGO_ROUTE,
      logoSquare: true,
    })
    expect(result.boot.logoHref).not.toContain(root)
    expect(result.localLogo?.canonicalPath).toContain('logo.svg')
    expect(result.localLogo?.contentType).toBe('image/svg+xml')
    expect(result.manifest?.icons).toEqual([
      { src: SQUARE_LOGO_ROUTE, purpose: 'any', type: 'image/svg+xml' },
    ])
    expect(result.squareLogoSource).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('rejects a symlink and unsupported local extension', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brand-logo-'))
    const source = join(root, 'source.svg')
    const linked = join(root, 'linked.svg')
    const text = join(root, 'logo.txt')
    await writeFile(source, '<svg/>')
    await writeFile(text, 'not an image')
    await symlink(source, linked)

    await expect(prepareBrand({ logoPath: linked })).rejects.toThrow('must not be a symbolic link')
    await expect(prepareBrand({ logoPath: text })).rejects.toThrow('must use gif')
  })

  it('replaces title, favicon, and manifest links', async () => {
    const prepared = await prepareBrand({
      productName: 'Acme <Agent>',
      logoUrl: 'https://cdn.example.test/logo.png',
    })
    const document = renderBrandIndex(`<!doctype html><head>
      <link rel="manifest" href="/manifest.webmanifest">
      <link rel="icon" type="image/svg+xml" href="/favicon.svg">
      <title>DSH Local Build</title>
    </head><body></body>`, prepared.boot, prepared.manifest)

    expect(document).toContain('<title>Acme &lt;Agent&gt;</title>')
    expect(document).toContain(`<link rel="icon" href="${SQUARE_LOGO_ROUTE}" type="image/svg+xml">`)
    expect(document).toContain(`<link rel="manifest" href="${BRAND_MANIFEST_ROUTE}">`)
    expect(document).not.toContain('/favicon.svg')
    expect(document).not.toContain('href="/manifest.webmanifest"')
  })

  it('leaves the shell favicon and manifest intact without a configured logo', async () => {
    const prepared = await prepareBrand({ productName: 'Acme Agent' })
    const document = renderBrandIndex(
      '<head><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.svg"><title>DSH</title></head>',
      prepared.boot,
      prepared.manifest,
    )

    expect(document).toContain('<title>Acme Agent</title>')
    expect(document).toContain('/favicon.svg')
    expect(document).toContain('/manifest.webmanifest')
  })
})
