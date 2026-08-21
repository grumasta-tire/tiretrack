/* ===================================================================
   record-browser.js — the << < > >> + Ctrl+F record browser used on
   input/master-data pages.

   Two modes:
   - Navigate mode (default): step through records one at a time.
   - Filter mode: typing in Ctrl+F actually filters the visible table
     live (not just jumping to one match) — pass `onFilter` to enable
     this; the page's own render function decides what "filtered"
     means and redraws the table itself.

   Usage:
     const browser = RecordBrowser.init({
       mountId: 'recordBrowserMount',
       getRecords: () => records,
       searchKeys: ['no', 'sn'],
       onShow: (record, index, total) => { ... },      // navigate mode
       onFilter: (query) => { ... }                     // optional, live table filter
     });
     browser.refresh();
=================================================================== */

const RecordBrowser = {
  init({ mountId, getRecords, searchKeys, onShow, onFilter }) {
    const mount = document.getElementById(mountId);
    let index = 0;

    mount.innerHTML = `
      <div class="record-browser">
        <button class="rb-btn" id="rbFirst" title="First record">&laquo;</button>
        <button class="rb-btn" id="rbPrev" title="Previous record">&lsaquo;</button>
        <span class="rb-position" id="rbPosition">0 / 0</span>
        <button class="rb-btn" id="rbNext" title="Next record">&rsaquo;</button>
        <button class="rb-btn" id="rbLast" title="Last record">&raquo;</button>
        <div class="rb-search-wrap" id="rbSearchWrap" style="display:none;">
          <input type="text" class="rb-search" id="rbSearchInput" placeholder="Search... (Esc to clear & close)">
        </div>
        <span class="rb-hint">Ctrl+F to search</span>
      </div>`;

    function baseRecords() { return getRecords(); }
    function total() { return baseRecords().length; }
    function clamp() { if (index < 0) index = 0; if (index > total() - 1) index = Math.max(0, total() - 1); }

    function show() {
      clamp();
      const records = baseRecords();
      document.getElementById('rbPosition').textContent = total() === 0 ? '0 / 0' : `${index + 1} / ${total()}`;
      if (onShow) onShow(records[index] || null, index, total());
    }

    document.getElementById('rbFirst').onclick = () => { index = 0; show(); };
    document.getElementById('rbLast').onclick = () => { index = total() - 1; show(); };
    document.getElementById('rbPrev').onclick = () => { index--; show(); };
    document.getElementById('rbNext').onclick = () => { index++; show(); };

    const searchWrap = document.getElementById('rbSearchWrap');
    const searchInput = document.getElementById('rbSearchInput');

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchWrap.style.display = 'block';
        searchInput.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        runSearch('');
        searchWrap.style.display = 'none';
      }
    });

    function runSearch(qRaw) {
      const q = qRaw.trim().toLowerCase();
      if (onFilter) {
        // Live-filter mode: the page redraws its own table for every keystroke.
        onFilter(q);
        index = 0;
        show();
        return;
      }
      // Navigate mode: jump to the first record matching the query.
      if (!q) return;
      const records = baseRecords();
      const foundIdx = records.findIndex(r => searchKeys.some(k => String(r[k] || '').toLowerCase().includes(q)));
      if (foundIdx >= 0) { index = foundIdx; show(); }
    }

    searchInput.addEventListener('input', () => runSearch(searchInput.value));

    return {
      refresh() { index = 0; show(); },
      goTo(i) { index = i; show(); }
    };
  }
};
