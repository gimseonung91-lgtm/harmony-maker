import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Capture every saved-line canvas and stitch them into an A4 PDF.
 * @param {string[]} elementIds  – ordered list of DOM element IDs to capture
 * @param {string}   title       – document title for the PDF metadata
 */
export async function exportToPDF(elementIds, title = 'Harmony Maker') {
  if (elementIds.length === 0) return

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const A4_W = 210
  const A4_H = 297
  const MARGIN = 12
  const usableW = A4_W - MARGIN * 2

  let cursorY = MARGIN

  pdf.setFontSize(16)
  pdf.setTextColor(30, 30, 30)
  pdf.text(title, MARGIN, cursorY)
  cursorY += 10

  for (const id of elementIds) {
    const el = document.getElementById(id)
    if (!el) continue

    const canvas = await html2canvas(el, {
      backgroundColor: '#1A1A1A',
      scale: 2,
      useCORS: true,
    })

    const imgData = canvas.toDataURL('image/png')
    const aspectRatio = canvas.height / canvas.width
    const imgH = usableW * aspectRatio

    if (cursorY + imgH > A4_H - MARGIN) {
      pdf.addPage()
      cursorY = MARGIN
    }

    pdf.addImage(imgData, 'PNG', MARGIN, cursorY, usableW, imgH)
    cursorY += imgH + 6
  }

  pdf.save(`${title.replace(/\s+/g, '_')}.pdf`)
}
