
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('Digital Planner Template', {
    x: 50,
    y: height - 50,
    size: 30,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText('This is a placeholder for your custom design.', {
    x: 50,
    y: height - 100,
    size: 15,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Draw a rectangle for calendar area
  page.drawRectangle({
      x: 50,
      y: height - 400,
      width: 500,
      height: 250,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('public/template.pdf', pdfBytes);
  console.log('Template created at public/template.pdf');
}

createTemplate();
