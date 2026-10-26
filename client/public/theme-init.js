/* Applies the saved theme before first paint so there is no light-to-dark flash. Kept external for the CSP. */
(function () {
  try {
    var saved = localStorage.getItem('medora-theme') || 'system';
    var dark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0a0e1f' : '#3d4fe0');
  } catch {}
})();
