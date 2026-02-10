import ExcelJS from "exceljs";

const MAX_ROWS_PER_SHEET = 50;

export async function extractExcel(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);

  const parts: string[] = [];

  workbook.eachSheet((sheet) => {
    parts.push(`\n--- Sheet: ${sheet.name} ---`);
    let rowCount = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowCount >= MAX_ROWS_PER_SHEET) return;
      const values = (row.values as unknown[])
        .slice(1) // exceljs row.values is 1-indexed with empty [0]
        .map((v) => (v != null ? String(v) : ""));
      parts.push(`Row ${rowNumber}: ${values.join(" | ")}`);
      rowCount++;
    });

    if (sheet.rowCount > MAX_ROWS_PER_SHEET) {
      parts.push(`... (${sheet.rowCount - MAX_ROWS_PER_SHEET} more rows truncated)`);
    }
  });

  return parts.join("\n");
}
