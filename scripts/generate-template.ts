/**
 * Generates a styled .docx reference template for use with Pandoc's --reference-doc.
 *
 * Usage: npx tsx scripts/generate-template.ts [output-path]
 * Default output: templates/corporate-template.docx
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  convertInchesToTwip,
  TabStopPosition,
  TabStopType,
} from "docx";

const BRAND_BLUE = "1F4E79";
const BRAND_LIGHT_BLUE = "D6E4F0";
const BRAND_DARK = "2E2E2E";
const BRAND_GRAY = "666666";
const FONT_MAIN = "Calibri";
const FONT_HEADING = "Calibri Light";

// The "Table Grid" style XML that the docx npm package can't generate.
// Defines borders, header row styling (blue bg, white bold text), and alternating row shading.
const TABLE_GRID_STYLE_XML = `<w:style w:type="table" w:styleId="Table Grid" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:name w:val="Table Grid"/>
  <w:basedOn w:val="TableNormal"/>
  <w:uiPriority w:val="39"/>
  <w:tblPr>
    <w:tblStyleRowBandSize w:val="1"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblStylePr w:type="firstRow">
    <w:rPr>
      <w:b/>
      <w:color w:val="FFFFFF"/>
    </w:rPr>
    <w:tcPr>
      <w:shd w:val="clear" w:color="auto" w:fill="${BRAND_BLUE}"/>
    </w:tcPr>
  </w:tblStylePr>
  <w:tblStylePr w:type="band1Horz">
    <w:tcPr>
      <w:shd w:val="clear" w:color="auto" w:fill="${BRAND_LIGHT_BLUE}"/>
    </w:tcPr>
  </w:tblStylePr>
  <w:tblStylePr w:type="band2Horz">
    <w:tcPr>
      <w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>
    </w:tcPr>
  </w:tblStylePr>
</w:style>`;

// "Table Normal" base style that "Table Grid" inherits from
const TABLE_NORMAL_STYLE_XML = `<w:style w:type="table" w:default="1" w:styleId="TableNormal" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:name w:val="Normal Table"/>
  <w:uiPriority w:val="99"/>
  <w:semiHidden/>
  <w:unhideWhenUsed/>
  <w:tblPr>
    <w:tblInd w:w="0" w:type="dxa"/>
    <w:tblCellMar>
      <w:top w:w="0" w:type="dxa"/>
      <w:left w:w="108" w:type="dxa"/>
      <w:bottom w:w="0" w:type="dxa"/>
      <w:right w:w="108" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
</w:style>`;

/**
 * Post-process a .docx buffer to inject table styles into word/styles.xml.
 * The docx npm package doesn't support defining table styles, so we unzip,
 * patch the XML, and rezip.
 */
function injectTableStyles(docxBuffer: Buffer, outputPath: string): void {
  const { mkdtempSync, rmSync, cpSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");
  const { tmpdir } = require("node:os") as typeof import("node:os");

  const tmpDir = mkdtempSync(join(tmpdir(), "docx-patch-"));
  const zipPath = join(tmpDir, "template.docx");
  const extractDir = join(tmpDir, "extracted");

  try {
    writeFileSync(zipPath, docxBuffer);
    mkdirSync(extractDir, { recursive: true });

    // Unzip
    execSync(`unzip -q -o "${zipPath}" -d "${extractDir}"`);

    // Read and patch styles.xml
    const stylesPath = join(extractDir, "word", "styles.xml");
    let stylesXml = readFileSync(stylesPath, "utf-8");

    // Insert table styles before the closing </w:styles> tag
    const closingTag = "</w:styles>";
    if (!stylesXml.includes("Normal Table") && !stylesXml.includes("Table Grid")) {
      stylesXml = stylesXml.replace(
        closingTag,
        `${TABLE_NORMAL_STYLE_XML}\n${TABLE_GRID_STYLE_XML}\n${closingTag}`,
      );
    } else if (!stylesXml.includes("Table Grid")) {
      stylesXml = stylesXml.replace(
        closingTag,
        `${TABLE_GRID_STYLE_XML}\n${closingTag}`,
      );
    }

    writeFileSync(stylesPath, stylesXml, "utf-8");

    // Rezip - must use stored method for [Content_Types].xml to be valid
    execSync(`cd "${extractDir}" && zip -q -r "${outputPath}" .`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function generateTemplate(): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_MAIN,
            size: 22, // 11pt
            color: BRAND_DARK,
          },
          paragraph: {
            spacing: { after: 120, line: 276 }, // 1.15 line spacing
          },
        },
        heading1: {
          run: {
            font: FONT_HEADING,
            size: 52, // 26pt
            bold: true,
            color: BRAND_BLUE,
          },
          paragraph: {
            spacing: { before: 360, after: 200 },
            border: {
              bottom: {
                color: BRAND_BLUE,
                space: 4,
                style: BorderStyle.SINGLE,
                size: 8,
              },
            },
          },
        },
        heading2: {
          run: {
            font: FONT_HEADING,
            size: 36, // 18pt
            bold: true,
            color: BRAND_BLUE,
          },
          paragraph: {
            spacing: { before: 280, after: 120 },
          },
        },
        heading3: {
          run: {
            font: FONT_HEADING,
            size: 28, // 14pt
            bold: true,
            color: BRAND_DARK,
          },
          paragraph: {
            spacing: { before: 200, after: 80 },
          },
        },
        heading4: {
          run: {
            font: FONT_HEADING,
            size: 24, // 12pt
            bold: true,
            italics: true,
            color: BRAND_GRAY,
          },
          paragraph: {
            spacing: { before: 160, after: 80 },
          },
        },
        title: {
          run: {
            font: FONT_HEADING,
            size: 64, // 32pt
            bold: true,
            color: BRAND_BLUE,
          },
          paragraph: {
            spacing: { after: 300 },
            alignment: AlignmentType.LEFT,
          },
        },
        listParagraph: {
          run: {
            font: FONT_MAIN,
            size: 22,
          },
          paragraph: {
            spacing: { after: 60 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Subtitle",
          name: "Subtitle",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: FONT_HEADING,
            size: 28,
            color: BRAND_GRAY,
            italics: true,
          },
          paragraph: {
            spacing: { after: 200 },
          },
        },
        {
          id: "Quote",
          name: "Quote",
          basedOn: "Normal",
          next: "Normal",
          run: {
            italics: true,
            color: BRAND_GRAY,
          },
          paragraph: {
            indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
            spacing: { before: 120, after: 120 },
            border: {
              left: {
                color: BRAND_BLUE,
                space: 8,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "CONFIDENTIAL",
                    font: FONT_MAIN,
                    size: 16, // 8pt
                    color: BRAND_GRAY,
                    bold: true,
                    allCaps: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: {
                    color: BRAND_LIGHT_BLUE,
                    space: 4,
                    style: BorderStyle.SINGLE,
                    size: 4,
                  },
                },
                spacing: { after: 200 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: {
                    color: BRAND_LIGHT_BLUE,
                    space: 4,
                    style: BorderStyle.SINGLE,
                    size: 4,
                  },
                },
                spacing: { before: 200 },
                tabStops: [
                  {
                    type: TabStopType.CENTER,
                    position: TabStopPosition.MAX / 2,
                  },
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                children: [
                  new TextRun({
                    text: "Generated by SharePoint MCP",
                    font: FONT_MAIN,
                    size: 16,
                    color: BRAND_GRAY,
                  }),
                  new TextRun({
                    children: ["\t"],
                  }),
                  new TextRun({
                    children: ["\t", "Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                    font: FONT_MAIN,
                    size: 16,
                    color: BRAND_GRAY,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            text: "Document Title",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Subtitle or description goes here",
                font: FONT_HEADING,
                size: 28,
                color: BRAND_GRAY,
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Heading 1 Example",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "This is body text under a Heading 1. The font is Calibri 11pt with 1.15 line spacing.",
          }),
          new Paragraph({
            text: "Heading 2 Example",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "Body text under Heading 2.",
          }),
          new Paragraph({
            text: "Table Example",
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Column A", bold: true, color: "FFFFFF", font: FONT_MAIN, size: 22 })] })],
                    shading: { type: ShadingType.SOLID, color: BRAND_BLUE },
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Column B", bold: true, color: "FFFFFF", font: FONT_MAIN, size: 22 })] })],
                    shading: { type: ShadingType.SOLID, color: BRAND_BLUE },
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Column C", bold: true, color: "FFFFFF", font: FONT_MAIN, size: 22 })] })],
                    shading: { type: ShadingType.SOLID, color: BRAND_BLUE },
                    width: { size: 34, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Value 1")] }),
                  new TableCell({ children: [new Paragraph("Value 2")] }),
                  new TableCell({ children: [new Paragraph("Value 3")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Value 4")],
                    shading: { type: ShadingType.SOLID, color: BRAND_LIGHT_BLUE },
                  }),
                  new TableCell({
                    children: [new Paragraph("Value 5")],
                    shading: { type: ShadingType.SOLID, color: BRAND_LIGHT_BLUE },
                  }),
                  new TableCell({
                    children: [new Paragraph("Value 6")],
                    shading: { type: ShadingType.SOLID, color: BRAND_LIGHT_BLUE },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: "Blockquote Example",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This is a blockquote with a blue left border.",
                italics: true,
                color: BRAND_GRAY,
              }),
            ],
            indent: { left: convertInchesToTwip(0.5) },
            border: {
              left: {
                color: BRAND_BLUE,
                space: 8,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? "templates/corporate-template.docx";
  const absOutputPath = require("node:path").resolve(outputPath);

  mkdirSync(dirname(absOutputPath), { recursive: true });

  const buffer = await generateTemplate();

  // Post-process: inject Table Grid style into styles.xml
  injectTableStyles(buffer, absOutputPath);

  const finalSize = readFileSync(absOutputPath).length;
  console.log(`Template generated: ${outputPath}`);
  console.log(`Size: ${(finalSize / 1024).toFixed(1)} KB`);
  console.log(`\nStyles included:`);
  console.log(`  - Title: Calibri Light 32pt, blue`);
  console.log(`  - Heading 1: Calibri Light 26pt, blue, bottom border`);
  console.log(`  - Heading 2: Calibri Light 18pt, blue`);
  console.log(`  - Heading 3: Calibri Light 14pt, bold`);
  console.log(`  - Heading 4: Calibri Light 12pt, bold italic`);
  console.log(`  - Body: Calibri 11pt, 1.15 line spacing`);
  console.log(`  - Table Grid: borders on all sides + inner gridlines`);
  console.log(`  - Header: "CONFIDENTIAL" right-aligned`);
  console.log(`  - Footer: "Generated by SharePoint MCP" + page numbers`);
}

main().catch(console.error);
