# Pandoc — Markdown to DOCX Conversion

## Overview

Pandoc is the industry-standard document conversion tool. Written in Haskell, it runs as a CLI binary and supports conversion between dozens of formats. For our use case: markdown input, .docx output, with style templates.

## Template Support: `--reference-doc`

Pandoc's killer feature for this use case. The `--reference-doc` flag accepts any .docx file and uses it as a style source:

```bash
pandoc input.md -o output.docx --reference-doc=template.docx
```

What gets applied from the reference doc:
- Font families and sizes for body text, headings (H1-H6)
- Paragraph spacing, line spacing, margins
- Page layout (size, orientation, margins)
- Header and footer content
- Color schemes and theme
- Table styles
- List bullet/numbering styles

What does NOT transfer:
- Actual content from the template (only styles are used)
- Some inline formatting may be ignored

### Creating a Reference Doc

Users create a template in Word with their desired styles, then save as .docx. Pandoc ships a default reference doc that can be exported and customized:

```bash
pandoc -o custom-reference.docx --print-default-data-file reference.docx
```

## Node.js Integration

Pandoc is a CLI tool. In Node.js, we call it via `child_process`:

```typescript
import { execFile } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function markdownToDocx(
  markdown: string,
  templateBuffer?: Buffer,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pandoc-"));
  const inputPath = join(dir, "input.md");
  const outputPath = join(dir, "output.docx");

  await writeFile(inputPath, markdown, "utf-8");

  const args = [inputPath, "-o", outputPath];
  if (templateBuffer) {
    const templatePath = join(dir, "template.docx");
    await writeFile(templatePath, templateBuffer);
    args.push("--reference-doc", templatePath);
  }

  await new Promise<void>((resolve, reject) => {
    execFile("pandoc", args, (err) => (err ? reject(err) : resolve()));
  });

  const result = await readFile(outputPath);
  await rm(dir, { recursive: true });
  return result;
}
```

There's also `node-pandoc` (npm wrapper) but calling `execFile` directly is simpler and avoids the dependency.

## Docker Setup

Alpine Linux has pandoc in its community repository:

```dockerfile
FROM node:22-alpine

# Add pandoc (~50MB)
RUN apk add --no-cache pandoc
```

Image size impact: approximately 50MB added to the final image.

## Pros

- **Best template support** — `--reference-doc` is exactly what we need for SharePoint templates
- **Best markdown parsing** — decades of battle-tested conversion
- **Handles edge cases** — complex tables, nested lists, footnotes, math (LaTeX)
- **Simple API** — just shell out to the CLI
- **Well-documented** — extensive manual and community resources
- **Custom styles in markdown** — fenced Divs/Spans can target specific Word styles

## Cons

- **External binary dependency** — not pure JavaScript, must be installed in Docker
- **Docker image size** — adds ~50MB
- **File I/O overhead** — must write temp files (markdown in, docx out)
- **No streaming** — full file must be written before conversion
- **Version management** — Alpine's pandoc version may lag behind latest

## Links

- [Pandoc User's Guide](https://pandoc.org/MANUAL.html)
- [Pandoc --reference-doc docs](https://pandoc.org/MANUAL.html#option--reference-doc)
- [Custom DOCX styles wiki](https://github.com/jgm/pandoc/wiki/Defining-custom-DOCX-styles-in-LibreOffice-(and-Word))
