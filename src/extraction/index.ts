import { extractPdf } from "./pdf.js";
import { extractWord } from "./word.js";
import { extractExcel } from "./excel.js";
import { extractText } from "./text.js";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".csv", ".json", ".xml", ".html", ".htm",
  ".md", ".yaml", ".yml", ".log", ".ini", ".cfg",
  ".js", ".ts", ".py", ".java", ".c", ".cpp", ".h",
  ".css", ".sql", ".sh", ".bat", ".ps1",
]);

export async function extractContent(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));

  if (ext === ".pdf") {
    return extractPdf(buffer);
  }
  if (ext === ".docx") {
    return extractWord(buffer);
  }
  if (ext === ".xlsx") {
    return extractExcel(buffer);
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return extractText(buffer);
  }

  return `[Binary file: ${fileName}, ${buffer.length} bytes. Content extraction not supported for ${ext} files.]`;
}
