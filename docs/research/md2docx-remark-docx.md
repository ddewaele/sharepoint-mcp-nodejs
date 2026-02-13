# @md2docx/remark-docx — Markdown to DOCX Conversion

## Overview

A newer, modular remark plugin ecosystem for markdown-to-docx conversion. Built on the unified.js and `docx` npm package, with a plugin architecture that lets you install only what you need.

- **npm**: `@md2docx/remark-docx` (also published as `@m2d/remark-docx`)
- **GitHub**: [md2docx/remark-docx](https://github.com/md2docx/remark-docx)
- **Core**: [md2docx/mdast2docx](https://github.com/md2docx/mdast2docx)
- **Last updated**: January 2026 (actively maintained)

## Architecture

Modular plugin system — install only what you need:

| Package | Purpose |
|---------|---------|
| `@m2d/core` | Core MDAST-to-docx converter |
| `@m2d/remark-docx` | Remark plugin wrapper |
| `@m2d/image` | Image support |
| `@m2d/table` | Table support |
| `@m2d/math` | Math equation support |
| `@m2d/html` | Inline HTML support |
| `mdast2docx` | All-in-one package (includes everything) |

## API Usage

### With remark plugin

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDocx from "@m2d/remark-docx";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkDocx);

const file = await processor.process(markdown);
const buffer = await file.result;  // Buffer (Node.js) or Blob (browser)
```

### Direct core usage

```typescript
import { toDocx } from "@m2d/core";
import { imagePlugin } from "@m2d/image";
import remarkParse from "remark-parse";
import { unified } from "unified";

const mdast = unified().use(remarkParse).parse(markdown);
const docxBuffer = await toDocx(mdast, docxProps, {
  plugins: [imagePlugin()],
});
```

### ISectionProps — Document Configuration

The `toDocx` function accepts `ISectionProps` for document-level configuration:

```typescript
const docxBuffer = await toDocx(mdast, {
  useTitle: true,  // Treats H1 as Title style, H2 as Heading1, etc.
  // Additional docx.js section properties for margins, orientation, etc.
});
```

## Style Customization

Like remark-docx (inokawa), styles are programmatic via the `docx` npm package API. No native support for loading an external .docx template.

### External Template Workaround

Same approach as remark-docx — extract `styles.xml` from a .docx template and use `docx`'s `externalStyles`:

1. Download .docx from SharePoint
2. Unzip, extract `word/styles.xml`
3. Pass to docx's `externalStyles` option

Same limitations apply: only style definitions transfer, not page layout or theme.

## Supported Markdown Features

- Headings (with `useTitle` option for H1-as-Title mapping)
- Bold, italic, strikethrough
- Links
- Code blocks
- Images (via @m2d/image)
- Tables (via @m2d/table, GFM tables auto-injected)
- Lists (auto-injected support)
- Math equations (via @m2d/math)
- Inline HTML (via @m2d/html)
- Footnotes (with customizable styling)

## Environment Notes

- On Node.js, `htmlPlugin` and `imagePlugin` are **automatically excluded** by default to avoid DOM dependency issues
- Need to explicitly install and configure these plugins for Node.js usage
- SVG images require PNG fallback for legacy Word compatibility

## Pros

- **Pure JavaScript** — no external binary
- **Modular** — install only what you need, smaller bundle
- **Actively maintained** — updates as of January 2026
- **Math support** — LaTeX equations via @m2d/math
- **GFM auto-injection** — tables and lists work without extra config
- **React integration** — `@md2docx/react-markdown` available for React apps

## Cons

- **No external template support** — styles are programmatic only
- **Newer/less proven** — smaller community than both Pandoc and inokawa's remark-docx
- **Plugin complexity** — need to manually install and wire up multiple @m2d/* packages
- **Node.js caveats** — some plugins excluded by default in Node, need explicit setup
- **Download stats unknown** — harder to gauge adoption
- **Multiple package names** — published under both `@md2docx/*` and `@m2d/*`, which can be confusing

## Links

- [npm: @m2d/remark-docx](https://www.npmjs.com/package/@m2d/remark-docx)
- [GitHub: md2docx/remark-docx](https://github.com/md2docx/remark-docx)
- [GitHub: md2docx/mdast2docx](https://github.com/md2docx/mdast2docx)
- [Medium: Unlocking the Power of MDAST to DOCX](https://mayank1513.medium.com/unlocking-the-power-of-mdast-to-docx-a-game-changer-for-generative-ai-and-beyond-d28a92a6879d)
