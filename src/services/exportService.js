// Lazy boundary for the PDF stack. jsPDF + html2canvas load only when the
// user clicks Export PDF — never in the eager entry graph.

let exporterPromise = null

/** Load (once) and return the PDF export module. */
export function loadPdfExporter() {
  if (!exporterPromise) exporterPromise = import('../utils/pdfExport')
  return exporterPromise
}
