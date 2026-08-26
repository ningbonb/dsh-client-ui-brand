[English](README.md) | 中文

# dsh-client-ui-brand

这是一个非常简单的 DeepSeek Harness 的插件。在不修改 DeepSeek Harness 源码的前提下，可以自定义产品名称和 logo。

## 功能

- 自定义展开侧边栏中的产品名称；
- 自定义侧边栏和空会话中的产品图标；

浏览器标题、favicon 和 PWA 元数据不由此插件配置；它们需要构建定制的 Web Shell。
空会话中的 slogan 目前官方不接受 PR ，所以不能做到无损调整，等官方开放 dsh core 的 slot 后，本插件可以实现。

## 安装

将已发布的包安装到 Web profile：

```sh
dsh plugin --profile web add dsh-client-ui-brand
```

安装后请重启 DSH Web 进程。

## 配置

在后续 Web profile patch 中添加配置，通常是：

```text
$DSH_HOME/profiles/web/cordis.patch.yml
```

安装后的 bundle 默认使用 **Brand New Agent** 和内置 Agent 图标。所有配置项均可选；仅在需要覆盖默认值时，才添加后续 profile patch：

```yaml
- id: dsh-client-ui-brand
  config:
    productName: Acme Agent
    logoUrl: https://cdn.example.com/branding/acme-agent.svg
    logoAlt: Acme Agent logo
```

### 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `productName` | `Brand New Agent` | 侧边栏产品名称。 |
| `logoUrl` | 未设置 | 图标 HTTPS URL、同源绝对路径或 `data:image/...` URL。 |
| `logoPath` | 未设置 | 由 DSH 提供的一个本地图标绝对路径。 |
| `logoAlt` | `productName` | 图标无障碍文本。 |

`logoUrl` 和 `logoPath` 只能配置其中一个。

### 本地图标

```yaml
- id: dsh-client-ui-brand
  config:
    productName: Acme Agent
    logoPath: /absolute/path/to/acme-agent-logo.svg
    logoAlt: Acme Agent logo
```

本地文件只会通过固定路径提供：

```text
/plugins/dsh-client-ui-brand/brand-logo
```

为保证安全，`logoPath` 必须是绝对路径、非符号链接的普通文件，扩展名只能为 `gif`、`jpeg`、`jpg`、`png`、`svg` 或 `webp`。该路径只接受 `GET` 和 `HEAD` 请求，不会读取请求中提供的文件路径；配置文件无法读取时返回 `404`，响应带有 `no-store` 和 `nosniff` 头。

## 许可证

MIT
