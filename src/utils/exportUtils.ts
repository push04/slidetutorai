// Export utilities for lessons, quizzes, and flashcards

export function exportAsJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsPDF(content: string, filename: string) {
  // Create a printable HTML version
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        h1, h2, h3 { color: #222; margin-top: 24px; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      ${content.replace(/\n/g, '<br>')}
      <script>
        window.print();
        window.onafterprint = () => window.close();
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
