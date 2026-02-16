import ExcelJS from "exceljs";

const BRAND_BLUE = "1F4E79";
const BRAND_LIGHT_BLUE = "D6E4F0";

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Extract all markdown tables from a string.
 * Each table becomes a { headers, rows } object.
 */
function parseMarkdownTables(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = markdown.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect a table header row: must contain |
    if (line.startsWith("|") && i + 1 < lines.length) {
      const separator = lines[i + 1].trim();
      // The separator row must have | and dashes
      if (/^\|[\s\-:|]+\|$/.test(separator)) {
        const headers = parseCells(line);
        const rows: string[][] = [];

        // Skip header + separator
        i += 2;

        // Read data rows
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(parseCells(lines[i].trim()));
          i++;
        }

        if (headers.length > 0) {
          tables.push({ headers, rows });
        }
        continue;
      }
    }
    i++;
  }

  return tables;
}

function parseCells(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1) // Remove empty first/last from leading/trailing |
    .map((cell) => cell.trim().replace(/\*\*/g, "")); // Strip bold markers
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function markdownToXlsx(markdown: string): Promise<Buffer> {
  const tables = parseMarkdownTables(markdown);

  if (tables.length === 0) {
    throw new Error("No markdown tables found in the provided content");
  }

  const workbook = new ExcelJS.Workbook();

  tables.forEach((table, index) => {
    const sheetName = tables.length === 1 ? "Sheet 1" : `Table ${index + 1}`;
    const sheet = workbook.addWorksheet(sheetName);

    // Add header row
    const headerRow = sheet.addRow(table.headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND_BLUE}` },
      };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
    });

    // Add data rows with alternating shading
    table.rows.forEach((row, rowIndex) => {
      // Pad or trim to match header count
      const cells = table.headers.map((_, colIdx) => row[colIdx] ?? "");
      const dataRow = sheet.addRow(cells);

      dataRow.eachCell((cell) => {
        cell.border = THIN_BORDER;
        if (rowIndex % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${BRAND_LIGHT_BLUE}` },
          };
        }
      });
    });

    // Auto-fit column widths
    sheet.columns.forEach((col, colIndex) => {
      const headerLen = table.headers[colIndex]?.length ?? 10;
      const maxDataLen = table.rows.reduce((max, row) => {
        return Math.max(max, (row[colIndex] ?? "").length);
      }, 0);
      col.width = Math.min(Math.max(headerLen, maxDataLen) + 4, 50);
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
