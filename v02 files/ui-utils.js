/* ===================================================================
   ui-utils.js — shared UI helpers used across input pages:
   - showErrorDialog(message): a real popup modal for critical errors
     (e.g. database constraint violations), instead of a thin banner
     that's easy to miss.
   - validateRequired(fields): checks a list of {id, label} inputs,
     and if any are empty, pops up a dialog listing exactly what's
     missing and focuses the first one. Returns true if all OK.
=================================================================== */

(function () {
  function ensureDialogMount() {
    if (document.getElementById('uiErrorDialog')) return;
    const div = document.createElement('div');
    div.id = 'uiErrorDialog';
    div.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(15,42,71,0.5); z-index:100; align-items:center; justify-content:center;';
    div.innerHTML = `
      <div style="background:#fff; border-radius:10px; padding:22px 24px; width:420px; max-width:90vw; box-shadow:0 10px 40px rgba(0,0,0,0.25);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
          <div style="width:28px; height:28px; border-radius:50%; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">!</div>
          <div style="font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:16px; color:#0F2A47;" id="uiErrorTitle">Something needs attention</div>
        </div>
        <div style="font-size:13.5px; color:#374151; line-height:1.5; margin-bottom:18px; white-space:pre-wrap;" id="uiErrorBody"></div>
        <div style="text-align:right;">
          <button onclick="document.getElementById('uiErrorDialog').style.display='none';" style="background:#0F2A47; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:600; font-size:13.5px; cursor:pointer;">OK</button>
        </div>
      </div>`;
    document.body.appendChild(div);
  }

  // Translates common raw Postgres/Supabase error text into a short, readable sentence.
  function humanizeError(message) {
    if (!message) return 'An unknown error occurred. Please try again.';
    if (message.includes('duplicate key') && message.includes('note_no')) {
      return 'This Delivery/Receiving Note number is already used. Please use a different number.';
    }
    if (message.includes('duplicate key') && message.includes('return_no')) {
      return 'This Return number is already used. Please use a different number.';
    }
    if (message.includes('duplicate key') && (message.includes('_pkey') || message.includes('sn'))) {
      return 'This Serial Number is already registered in the system. Please check the S/N and try again.';
    }
    if (message.includes('duplicate key')) {
      return 'This record already exists — one of the fields you entered must be unique, and it\'s already in use.';
    }
    if (message.includes('foreign key constraint')) {
      return 'One of the values you selected doesn\'t match an existing record (e.g. a warehouse, customer, or vendor that no longer exists). Please re-check your selections.';
    }
    if (message.includes('violates not-null constraint')) {
      return 'A required field was left empty. Please fill in every field and try again.';
    }
    return message;
  }

  window.showErrorDialog = function (message, title) {
    ensureDialogMount();
    document.getElementById('uiErrorTitle').textContent = title || 'Something needs attention';
    document.getElementById('uiErrorBody').textContent = humanizeError(message);
    document.getElementById('uiErrorDialog').style.display = 'flex';
  };

  // fields: [{id: 'f_no', label: 'Receiving No.'}, ...]
  // Returns true if everything is filled in; otherwise shows a dialog and returns false.
  window.validateRequired = function (fields) {
    const missing = fields.filter(f => {
      const el = document.getElementById(f.id);
      if (!el) return false;
      return !el.value || !el.value.toString().trim();
    });
    if (missing.length === 0) return true;

    ensureDialogMount();
    document.getElementById('uiErrorTitle').textContent = 'Please complete these fields';
    document.getElementById('uiErrorBody').innerHTML = 'The following fields are required and cannot be left empty:<ul style="margin:8px 0 0; padding-left:20px;">' +
      missing.map(f => `<li>${f.label}</li>`).join('') + '</ul>';
    document.getElementById('uiErrorDialog').style.display = 'flex';
    const firstEl = document.getElementById(missing[0].id);
    if (firstEl) firstEl.focus();
    return false;
  };
})();
