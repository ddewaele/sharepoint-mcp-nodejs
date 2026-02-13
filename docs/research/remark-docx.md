# remark-docx (inokawa) — Markdown to DOCX Conversion

## Overview

A remark plugin by inokawa that converts markdown to .docx via the unified.js ecosystem. Parses markdown to MDAST (Markdown Abstract Syntax Tree), then generates a .docx file using the `docx` npm package.

- **npm**: `remark-docx`
- **GitHub**: [inokawa/remark-docx](https://github.com/inokawa/remark-docx)
- **Stars**: 104
- **Weekly downloads**: 5,800+
- **Playground**: https://inokawa.github.io/remark-docx/

## API Usage

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDocx from "remark-docx";
import { writeFile } from "node:fs/promises";

const markdown = "# Hello\n\nThis is **bold** text.";

const processor = unified()
  .use(remarkParse)
  .use(remarkDocx);

const file = await processor.process(markdown);
const buffer = await file.result;  // Buffer in Node.js, Blob in browser

await writeFile("output.docx", buffer);
```

### With Plugins

```typescript
import { imagePlugin } from "remark-docx/image";
import { shikiPlugin } from "remark-docx/shiki";

const processor = unified()
  .use(remarkParse)
  .use(remarkDocx, {
    plugins: [
      imagePlugin({
        load: async (url) => (await readFile(url)).buffer,
      }),
      shikiPlugin({ theme: "dark-plus" }),
    ],
  });
```

## Style Customization

Styles are defined programmatically, not from external templates. The library provides "reasonable default styling that is tunable" through the `docx` package's API.

To customize styles, you'd need to work with the `docx` package's style system directly, which means defining fonts, spacing, heading styles, etc. in code.

### External Template Workaround

Since this uses the `docx` npm package under the hood, there's a theoretical path to external templates:

1. Download .docx template from SharePoint
2. Unzip the .docx (it's a ZIP file)
3. Extract `word/styles.xml`
4. Pass to `docx` package's `externalStyles` option

**Caveats**: This only transfers style definitions. Page layout, margins, headers/footers, and theme colors do NOT transfer via `externalStyles`. This is significantly less capable than Pandoc's `--reference-doc`.

## Supported Markdown Features

- Headings (H1-H6)
- Bold, italic, strikethrough
- Links
- Code blocks (with syntax highlighting via shikiPlugin)
- Images (via imagePlugin with custom loaders)
- Tables
- Lists (ordered and unordered)
- Blockquotes
- Horizontal rules
- Advanced: RTL text, vertical layout, 2-column layout

## Pros

- **Pure JavaScript** — no external binary, works everywhere Node.js runs
- **Zero Docker impact** — just npm packages
- **unified/remark ecosystem** — composable with other remark plugins (GFM, math, etc.)
- **Syntax highlighting** — shiki plugin for code blocks
- **Interactive playground** — test conversions in the browser before integrating
- **Mature** — established project with consistent downloads

## Cons

- **No external template support** — styles must be defined in code
- **Limited style transfer** — `externalStyles` workaround only covers style definitions, not page layout
- **Smaller community** — 104 stars vs Pandoc's massive ecosystem
- **Less markdown coverage** — may miss edge cases that Pandoc handles
- **Plugin setup required** — images and syntax highlighting need separate plugin configuration

## Links

- [npm: remark-docx](https://www.npmjs.com/package/remark-docx)
- [GitHub: inokawa/remark-docx](https://github.com/inokawa/remark-docx)
- [API Documentation](https://github.com/inokawa/remark-docx/blob/main/docs/API.md)
- [Playground](https://inokawa.github.io/remark-docx/)
