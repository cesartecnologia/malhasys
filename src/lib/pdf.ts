type PdfText = {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
};

type PdfLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PdfImageData = {
  name: string;
  width: number;
  height: number;
  dataHex: string;
};

type PdfPageCommand =
  | { type: "text"; value: PdfText }
  | { type: "line"; value: PdfLine }
  | { type: "rect"; x: number; y: number; width: number; height: number; fill: string }
  | { type: "image"; image: PdfImageData; x: number; y: number; width: number; height: number };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

export class SimplePdf {
  private pages: PdfPageCommand[][] = [[]];
  private images = new Map<string, PdfImageData>();

  addPage() {
    this.pages.push([]);
  }

  text(value: PdfText) {
    this.currentPage().push({ type: "text", value });
  }

  line(value: PdfLine) {
    this.currentPage().push({ type: "line", value });
  }

  rect(x: number, y: number, width: number, height: number, fill: string) {
    this.currentPage().push({ type: "rect", x, y, width, height, fill });
  }

  image(image: PdfImageData, x: number, y: number, width: number, height: number) {
    this.images.set(image.name, image);
    this.currentPage().push({ type: "image", image, x, y, width, height });
  }

  save(filename: string) {
    const blob = new Blob([this.render()], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private render() {
    const objects: string[] = [];
    const pageObjectIds: number[] = [];
    const contentObjectIds: number[] = [];

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const imageObjectIds = new Map<string, number>();
    Array.from(this.images.values()).forEach((image) => {
      const objectId = objects.length + 1;
      imageObjectIds.set(image.name, objectId);
      objects.push(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${image.dataHex.length + 1} >>\nstream\n${image.dataHex}>\nendstream`);
    });

    this.pages.forEach((page) => {
      const contentId = objects.length + 1;
      const pageId = contentId + 1;
      contentObjectIds.push(contentId);
      pageObjectIds.push(pageId);
      const stream = renderPage(page);
      const xObjects = Array.from(imageObjectIds.entries()).map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
      const xObjectResource = xObjects ? `/XObject << ${xObjects} >>` : "";
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObjectResource} >> /Contents ${contentId} 0 R >>`);
    });

    objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }
}

export function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function renderPage(commands: PdfPageCommand[]) {
  return commands.map((command) => {
    if (command.type === "text") {
      const { text, x, y, size = 11, bold = false } = command.value;
      return `0.12 0.12 0.13 rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
    }

    if (command.type === "line") {
      const { x1, y1, x2, y2 } = command.value;
      return `0.82 0.84 0.88 RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`;
    }

    if (command.type === "image") {
      const { image, x, y, width, height } = command;
      return `q ${width} 0 0 ${height} ${x} ${y} cm /${image.name} Do Q`;
    }

    const { x, y, width, height, fill } = command;
    return `${fill} rg ${x} ${y} ${width} ${height} re f`;
  }).join("\n");
}

function escapePdfText(text: string) {
  return text
    .replace(/[\u00a0\u202f]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}
