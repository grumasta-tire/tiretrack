/* ===================================================================
   app-shell.js — builds the sidebar + page chrome on every page.

   Each page sets: <body data-page="dashboard"> ... and includes:
     <div id="sidebarMount"></div>
   then calls AppShell.init() at the bottom of the page.
=================================================================== */

const NAV_STRUCTURE = [
  { type: 'link', key: 'dashboard', label: 'Dashboard', icon: '&#9635;', href: 'dashboard.html' },
  {
    type: 'group', key: 'movement', label: 'Goods Movement', icon: '&#8646;',
    children: [
      { key: 'goods-delivery', label: 'Goods Delivery', href: 'goods-delivery.html' },
      { key: 'goods-receiving', label: 'Goods Receiving', href: 'goods-receiving.html' },
      { key: 'customer-return', label: 'Return', href: 'customer-return.html' }
    ]
  },
  {
    type: 'group', key: 'inventory', label: 'Inventory Management', icon: '&#9737;',
    children: [
      { key: 'inventory-stock', label: 'Inventory Stock', href: 'inventory-stock.html' },
      { key: 'stock-adjustment', label: 'Stock Adjustment', href: 'stock-adjustment.html' },
      { key: 'storage-location', label: 'Storage Location', href: 'storage-location.html' }
    ]
  },
  {
    type: 'group', key: 'reports', label: 'Reports', icon: '&#9776;',
    children: [
      { key: 'receiving-report', label: 'Receiving Report', href: 'receiving-report.html' },
      { key: 'delivery-report', label: 'Delivery Report', href: 'delivery-report.html' },
      { key: 'inventory-report', label: 'Inventory Report', href: 'inventory-report.html' },
      { key: 'delivery-performance', label: 'Delivery Performance', href: 'delivery-performance.html' }
    ]
  },
  {
    type: 'group', key: 'master', label: 'Master Data', icon: '&#9998;',
    children: [
      { key: 'master-tire', label: 'Master Tire', href: 'master-tire.html' },
      { key: 'warehouse', label: 'Warehouse', href: 'warehouse.html' },
      { key: 'customer', label: 'Customer', href: 'customer.html' },
      { key: 'vendor', label: 'Vendor', href: 'vendor.html' }
    ]
  }
];

const AppShell = {
  init() {
    const currentPage = document.body.dataset.page;
    const mount = document.getElementById('sidebarMount');
    mount.innerHTML = this._buildSidebar(currentPage);
    document.getElementById('sidebarToggleBtn').addEventListener('click', this._toggleCollapse);

    // Open the group containing the active page by default
    const activeGroup = document.querySelector('.nav-group:has(.nav-link.active)');
    if (activeGroup) activeGroup.classList.add('open');

    document.querySelectorAll('.nav-group-head').forEach(head => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
  },

  _toggleCollapse() {
    document.getElementById('appShell').classList.toggle('collapsed');
  },

  _buildSidebar(currentPage) {
    const items = NAV_STRUCTURE.map(item => {
      if (item.type === 'link') {
        const active = item.key === currentPage ? ' active' : '';
        return `<a class="nav-link${active}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>
        </a>`;
      }
      // group
      const children = item.children.map(c => {
        if (!c.href) {
          return `<span class="nav-link" style="opacity:0.4; cursor:not-allowed;" title="Not available yet"><span class="nav-label">${c.label}</span></span>`;
        }
        const active = c.key === currentPage ? ' active' : '';
        return `<a class="nav-link${active}" href="${c.href}"><span class="nav-label">${c.label}</span></a>`;
      }).join('');
      return `<div class="nav-group" data-group="${item.key}">
        <div class="nav-group-head">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-group-label">${item.label}</span>
          <span class="nav-chevron">&#9656;</span>
        </div>
        <div class="nav-submenu">${children}</div>
      </div>`;
    }).join('');

    return `
      <div class="brand">
        <div class="brand-mark"></div>
        <div class="brand-text">
          <div class="brand-name">TireTrack</div>
          <div class="brand-sub">Luan Tire Indonesia</div>
        </div>
        <button class="sidebar-toggle" id="sidebarToggleBtn" title="Collapse menu">&#9776;</button>
      </div>
      <div class="tread"></div>
      ${items}
      <div class="sidebar-foot">TireTrack v1.0 (Preview)<br>Trial only</div>
    `;
  }
};
