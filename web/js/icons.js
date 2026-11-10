/* 内联 SVG 图标（stroke 风格，随 currentColor 变色） */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});

  var P = {
    home: '<path d="M3 10.6 12 3.2l9 7.4V20a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 11h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    moon: '<path d="M20.5 14.6A8.7 8.7 0 0 1 9.4 3.5 8.8 8.8 0 1 0 20.5 14.6Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    chevronsLeft: '<path d="m11 5-7 7 7 7M18 5l-7 7 7 7"/>',
    chevronsRight: '<path d="m13 5 7 7-7 7M6 5l7 7-7 7"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"/>',
    upload: '<path d="M12 21V9m0 0 4 4m-4-4L8 13M4 6V3h16v3"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7M10 20a2 2 0 0 0 4 0"/>',
    heart: '<path d="M20.5 8.5c0 4.3-8.5 10.5-8.5 10.5S3.5 12.8 3.5 8.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/>',
    drop: '<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z"/>',
    thermometer: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/>',
    scale: '<path d="M5 4h14l2 16H3z"/><path d="M12 8a3 3 0 0 1 3 3M9 9l3-1"/>',
    sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 2 .3.1-2 .7-.7 2-.7-2-2-.7 2-.3z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flower: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C12 7 10.5 4 12 3c1.5 1 0 4 0 6.8M14.2 12c2.8 0 5.8-1.5 5.8 0-1 1.5-4 0-5.8 0M12 14.2c0 2.8 1.5 5.8 0 5.8-1.5-1 0-4 0-5.8M9.8 12c-2.8 0-5.8 1.5-5.8 0 1-1.5 4 0 5.8 0"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    arrowRight: '<path d="M4 12h15m0 0-5-5m5 5-5 5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6"/>',
    star: '<path d="m12 3 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z"/>',
    note: '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/>',
    pin: '<path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6zM12 15v6"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    hourglass: '<path d="M6 3h12M6 21h12M8 3v4c0 3 4 5 4 5s4-2 4-5V3M8 21v-4c0-3 4-5 4-5s4 2 4 5v4"/>',
    flag: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
    cake: '<path d="M4 12h16v8H4zM4 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M12 8V5M9 8V6M15 8V6"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h11m0 0-3-3m3 3-3 3M20 13v2a3 3 0 0 1-3 3H6m0 0 3 3m-3-3 3-3"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.4-3H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.6Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M12 12v3"/>',
    graduation: '<path d="m2 9 10-5 10 5-10 5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
    plane: '<path d="M2 13.5 21 4l-3.5 9-3 2.5v4l-2.5-1.5-2.5 1.5v-4L2 13.5z"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9C9 9 7 8 7 6a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0c0 2-2 3-5 3z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
    sort: '<path d="M4 7h16M7 12h10M10 17h4"/>',
    minus: '<path d="M5 12h14"/>',
    dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  };

  function icon(name, size, cls) {
    var s = size || 18;
    return '<svg class="icon ' + (cls || '') + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  MC.icons = { icon: icon, paths: P };
})();
