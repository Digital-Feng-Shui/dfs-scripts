/* DFS night mode, part 1 (in <head>, runs before the page paints, so there is no flash).
   Decides day or night:
   1. ?night=1 / ?night=0 in the URL (for testing)
   2. the visitor's own earlier choice (remembered in this browser)
   3. DFS_NIGHT_AUTO: 'system' (follow the Mac/phone dark mode, default) | 'off' (always day)
      | 'time' (night between 20:00 and 06:00 visitor time) */
(function () {
  var AUTO = window.DFS_NIGHT_AUTO || 'system';
  var night = false, saved = null;
  try { saved = localStorage.getItem('dfs-theme'); } catch (e) {}
  var q = location.search.match(/[?&]night=([01])/);
  if (q) night = q[1] === '1';
  else if (saved) night = saved === 'night';
  else if (AUTO === 'system') night = !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  else if (AUTO === 'time') { var h = new Date().getHours(); night = h >= 20 || h < 6; }
  if (night) document.documentElement.classList.add('dfs-night');
})();
