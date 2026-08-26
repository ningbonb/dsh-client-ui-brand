English | [中文](README.zh.md)

# dsh-client-ui-brand

Brand the DeepSeek Harness Web sidebar and empty-conversation mark without
changing DSH source code.

## What it changes

- product name in the expanded sidebar;
- product mark in the sidebar and empty conversation;
- an original Agent mark when no custom logo is configured.

Browser title, favicon, and PWA metadata are not configurable through this
plugin. They require a branded Web Shell build.

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
- id: ningbo-ui-brand
  config:
    productName: Acme Agent
    logoUrl: https://cdn.example.com/branding/acme-agent.svg
    logoAlt: Acme Agent logo
```

### Configuration fields

| Field | Default | Description |
| --- | --- | --- |
| `productName` | `Brand New Agent` | Sidebar product name. |
| `logoUrl` | Not set | HTTPS URL, same-origin absolute path, or `data:image/...` URL for the logo. |
| `logoPath` | Not set | Absolute path to one local logo image served by DSH. |
| `logoAlt` | `productName` | Accessible logo text. |

Configure either `logoUrl` or `logoPath`, not both.

### Local logo

```yaml
- id: ningbo-ui-brand
  config:
    productName: Acme Agent
    logoPath: /absolute/path/to/acme-agent-logo.svg
    logoAlt: Acme Agent logo
```

The local file is exposed only through the fixed route:

```text
/plugins/dsh-client-ui-brand/brand-logo
```

For safety, the path must be an absolute, non-symlink regular file with a
`gif`, `jpeg`, `jpg`, `png`, `svg`, or `webp` extension. The route accepts only
`GET` and `HEAD`, never accepts a request-controlled file path, returns `404`
when the configured file cannot be read, and sends `no-store` and `nosniff`
headers.

## License

MIT
