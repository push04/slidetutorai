import jsPDF from 'jspdf';

interface PdfSection {
  heading?: string;
  body: string;
}

function addText(doc: jsPDF, text: string, startY: number): number {
  let y = startY;
  const lines = doc.splitTextToSize(text, 180);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 14, y);
    y += 6;
  }
  return y;
}

export function downloadTextSectionsAsPdf(title: string, sections: PdfSection[], filename: string, accent: [number, number, number] = [59, 59, 248]) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.setFontSize(18);
  doc.text(title, 14, y);
  y += 10;

  doc.setTextColor(33, 37, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  sections.forEach((section) => {
    if (section.heading) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, 14, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
    }
    y = addText(doc, section.body, y);
    y += 4;
  });

  doc.save(filename);
}

export function markdownToPlain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/#+\s*(.*)/g, '$1')
    .replace(/>-?/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
