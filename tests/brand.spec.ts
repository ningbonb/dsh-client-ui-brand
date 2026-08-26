import { mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCAL_LOGO_ROUTE, prepareBrand } from '../src/index.ts'

describe('brand host configuration', () => {
  it('defaults to Brand New Agent without exposing a logo path', async () => {
    await expect(prepareBrand({})).resolves.toEqual({
      boot: { productName: 'Brand New Agent', logoAlt: 'Brand New Agent' },
    })
  })

  it('accepts a HTTPS logo URL', async () => {
    await expect(prepareBrand({
      productName: 'Acme Agent',
      logoUrl: 'https://cdn.example.test/logo.svg',
    })).resolves.toEqual({
      boot: {
        productName: 'Acme Agent',
        logoAlt: 'Acme Agent',
        logoHref: 'https://cdn.example.test/logo.svg',
      },
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
      logoHref: LOCAL_LOGO_ROUTE,
    })
    expect(result.boot.logoHref).not.toContain(root)
    expect(result.localLogo?.canonicalPath).toContain('logo.svg')
    expect(result.localLogo?.contentType).toBe('image/svg+xml')
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
})
