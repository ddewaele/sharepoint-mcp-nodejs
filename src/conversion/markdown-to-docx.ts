import { execFile } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TABLE_STYLE_FILTER = `
function Table(el)
  el.attributes["custom-style"] = "Table Grid"
  return el
end
`;

export async function markdownToDocx(
  markdown: string,
  templateBuffer?: Buffer,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pandoc-"));

  try {
    const inputPath = join(dir, "input.md");
    const outputPath = join(dir, "output.docx");
    const filterPath = join(dir, "table-style.lua");

    await writeFile(inputPath, markdown, "utf-8");
    await writeFile(filterPath, TABLE_STYLE_FILTER, "utf-8");

    const args = [
      inputPath,
      "-o", outputPath,
      "--from", "markdown",
      "--lua-filter", filterPath,
    ];

    if (templateBuffer) {
      const templatePath = join(dir, "template.docx");
      await writeFile(templatePath, templateBuffer);
      args.push("--reference-doc", templatePath);
    }

    await new Promise<void>((resolve, reject) => {
      execFile("pandoc", args, (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`Pandoc conversion failed: ${stderr || err.message}`));
        } else {
          resolve();
        }
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
