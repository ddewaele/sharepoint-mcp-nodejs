# Markdown-to-DOCX Conversion — Framework Comparison

## Summary

We need to convert markdown/plain text to .docx format, with optional style templates from SharePoint. Three approaches evaluated.

## Comparison Table

| Criteria | Pandoc | remark-docx (inokawa) | @md2docx/remark-docx |
|----------|--------|-----------------------|----------------------|
| **Type** | System binary (CLI) | Pure JS (npm) | Pure JS (npm) |
| **Template support** | Native `--reference-doc` — applies fonts, headings, margins, colors from any .docx | No external template — styles defined in code via docx.js API | No external template — styles defined in code via docx.js API |
| **Markdown quality** | Excellent — industry standard parser | Good — unified/remark ecosystem | Good — unified/remark ecosystem |
| **Tables** | Yes | Yes | Yes (GFM auto-injected) |
| **Images** | Yes | Yes (via imagePlugin) | Yes (via @m2d/image) |
| **Code blocks** | Yes | Yes + syntax highlighting (shikiPlugin) | Yes |
| **Math** | Yes (LaTeX) | No | Yes (via @m2d/math) |
| **Docker impact** | ~50MB added (apk add pandoc) | Zero — pure npm | Zero — pure npm |
| **Maturity** | Very high — decades old, widely used | Moderate — 104 stars, 5.8k weekly downloads | Newer — actively maintained (Jan 2026) |
| **API complexity** | Low — shell out to CLI | Medium — unified pipeline setup | Medium — unified pipeline + plugins |
| **Underlying engine** | Haskell binary | docx npm package | docx npm package |

## Key Insight: Template Support

The critical differentiator is **external .docx template support**:

- **Pandoc** is the only option with native support. The `--reference-doc` flag takes any .docx file and applies its styles (fonts, heading styles, margins, page layout, colors) to the generated output. This means users can create a corporate-branded template in Word, upload it to SharePoint, and reference it directly.

- **remark-docx** and **@md2docx/remark-docx** both use the `docx` npm package under the hood. The `docx` package supports an `externalStyles` option that accepts a `styles.xml` string — but NOT a full .docx template. To use a SharePoint template with these libraries, we would need to:
  1. Download the .docx template from SharePoint
  2. Unzip it (docx files are ZIP archives)
  3. Extract `word/styles.xml`
  4. Pass it to docx's `externalStyles` option

  This is more fragile than Pandoc's approach and only transfers style definitions (not page layout, headers/footers, margins, etc.).

## Recommendation

**If template support is critical**: Pandoc is the clear winner. The Docker image size increase (~50MB) is a reasonable trade-off for native, reliable template support.

**If no templates needed**: remark-docx (inokawa) is the most mature pure-JS option with good markdown feature coverage and syntax highlighting support.

**If modularity matters**: @md2docx/remark-docx offers a pick-and-choose plugin architecture, which is nice for keeping bundle size down but adds install complexity.

## See Also

- [pandoc.md](pandoc.md) — Detailed Pandoc analysis
- [remark-docx.md](remark-docx.md) — Detailed remark-docx (inokawa) analysis
- [md2docx-remark-docx.md](md2docx-remark-docx.md) — Detailed @md2docx/remark-docx analysis
