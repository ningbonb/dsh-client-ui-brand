English | [中文](README.zh.md)

# dsh-client-ui-brand

This is a simple DeepSeek Harness plugin. It customizes product branding
without changing DeepSeek Harness source code.

## Preview

![Branding plugin preview](assets/web-preview.png)

## What it changes

- product name in the expanded sidebar and browser title;
- product mark in the sidebar and empty conversation;
- browser favicon and PWA manifest when a logo is configured.

The plugin displays configured marks with centered, proportional fitting in the
Web interface. It separately wraps every favicon and PWA icon in a square,
transparent SVG canvas, so non-square marks do not stretch. HTTPS images are
cached by the plugin and served from a fixed same-origin route for browser
metadata. DSH's runtime session title remains visible and ends with the
configured product name.

DSH Core does not currently provide an accepted slot for the empty-conversation
slogan. This plugin therefore cannot change it without an intrusive
modification; it can support the slogan when DSH Core exposes that slot.

## Install

Install the published package into the Web profile:

```sh
dsh plugin --profile web add dsh-client-ui-brand
```

Restart the DSH Web process after installation.

## Configure

Add a later Web profile patch, usually at:

```text
$DSH_HOME/profiles/web/cordis.patch.yml
```

The installed bundle already uses **Brand New Agent** and its default Agent
mark. Every configuration field is optional. Add this later profile patch only
when overriding the defaults:

```yaml
- id: dsh-client-ui-brand
  config:
    productName: Acme Agent
    logoUrl: https://cdn.example.com/branding/acme-agent.svg
    logoAlt: Acme Agent logo
```

### Configuration fields

| Field | Default | Description |
| --- | --- | --- |
| `productName` | `Brand New Agent` | Sidebar product name, browser title, and PWA name. |
| `logoUrl` | Not set | HTTPS URL, same-origin absolute path, or `data:image/...` URL for the logo, favicon, and PWA icon. |
| `logoPath` | Not set | Absolute path to one local image served by DSH for the logo, favicon, and PWA icon. |
| `logoAlt` | `productName` | Accessible logo text. |

Configure either `logoUrl` or `logoPath`, not both.

### Local logo

```yaml
- id: dsh-client-ui-brand
  config:
    productName: Acme Agent
    logoPath: /absolute/path/to/acme-agent-logo.svg
    logoAlt: Acme Agent logo
```

The local file is exposed only through the fixed route:

```text
/plugins/dsh-client-ui-brand/brand-logo
```

When a logo is configured, the plugin serves the square brand image at
`/plugins/dsh-client-ui-brand/brand-mark.svg`, generates a PWA manifest at
`/plugins/dsh-client-ui-brand/manifest.webmanifest`, and replaces the Web
Shell's favicon and manifest links. Without a configured logo, the Web Shell
keeps its default favicon and manifest.

For safety, the path must be an absolute, non-symlink regular file with a
`gif`, `jpeg`, `jpg`, `png`, `svg`, or `webp` extension. The route accepts only
`GET` and `HEAD`, never accepts a request-controlled file path, returns `404`
when the configured file cannot be read, and sends `no-store` and `nosniff`
headers.

## License

MIT
