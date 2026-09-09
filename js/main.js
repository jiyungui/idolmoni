let currentPage = 0;
const TOTAL_PAGES = 2; // 精确 2 页

function updateClock() {
  const now = new Date();
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const clockEl = document.getElementById('status-clock');
  if (clockEl) clockEl.textContent = `${hrs}:${mins}`;
}

function goToPage(index) {
  if (index < 0 || index >= TOTAL_PAGES) return;
  currentPage = index;
  const track = document.getElementById('pagesTrack');
  track.style.transform = `translateX(-${(currentPage * 100) / TOTAL_PAGES}%)`;
  
  const dots = document.querySelectorAll('.page-indicator-bar .dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentPage);
  });
}

function initTouchNavigation() {
  const viewport = document.getElementById('viewport');
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;

  viewport.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    if (!isSwiping) return;
    const diff = currentX - startX;
    if (Math.abs(diff) > 40 && currentX !== 0) {
      if (diff < 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
    startX = 0;
    currentX = 0;
    isSwiping = false;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  updateClock();
  setInterval(updateClock, 1000);
  await loadWidgets();
  initWidgetEvents();
  initTouchNavigation();
});
