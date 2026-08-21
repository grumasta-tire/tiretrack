/* ===================================================================
   export-utils.js — one function, reused by every Report page.
   Requires SheetJS (xlsx) to be included on the page.
=================================================================== */
function exportTableToExcel(tableId, filename) {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, { sheet: 'Report' });
  XLSX.writeFile(wb, filename);
}
