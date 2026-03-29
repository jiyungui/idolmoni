/* ============================================
   homescreen.js
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {

    /* ── 时钟 ── */
    function tick() {
        const el = document.getElementById('statusTime');
        if (!el) return;
        const n = new Date();
        el.textContent =
            String(n.getHours()).padStart(2, '0') + ':' +
            String(n.getMinutes()).padStart(2, '0');
    }
    tick();
    setInterval(tick, 10000);

    /* ── 可编辑字段：从 localStorage 恢复内容 ── */
    const FIELDS = [
        { id: 'statusText', key: 'sim_status', def: '幸好爱是小小的奇迹' },
        { id: 'babyText', key: 'sim_baby', def: 'call Aero' },
        { id: 'contactText', key: 'sim_contact', def: "http//>Aero's love.com" },
    ];

    FIELDS.forEach(({ id, key, def }) => {
        const el = document.getElementById(id);
        if (!el) return;

        /* 恢复 */
        const saved = localStorage.getItem(key);
        el.textContent = saved !== null ? saved : def;

        /* 失焦保存 */
        el.addEventListener('blur', () => {
            localStorage.setItem(key, el.textContent);
        });

        /* Enter 确认，Esc 恢复 */
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            if (e.key === 'Escape') {
                const prev = localStorage.getItem(key);
                el.textContent = prev !== null ? prev : def;
                el.blur();
            }
        });

        /* 粘贴纯文本 */
        el.addEventListener('paste', e => {
            e.preventDefault();
            const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, txt);
        });

        /* 点击：空内容时手动放置光标确保可输入 */
        el.addEventListener('click', () => {
            if (!el.textContent.trim()) setCursor(el);
        });
    });

    /* ── APP 跳转 ── */
    /* 用事件委托，避免与 contenteditable 点击冲突 */
    document.querySelector('.homescreen')?.addEventListener('click', e => {
        /* 点在可编辑字段内：不触发APP跳转 */
        if (e.target.closest('[contenteditable]')) return;
        const item = e.target.closest('[data-app]');
        if (item) openApp(item.dataset.app);
    });

    document.querySelector('.dock')?.addEventListener('click', e => {
        const item = e.target.closest('[data-app]');
        if (item) openApp(item.dataset.app);
    });

    function openApp(id) {
        const page = document.getElementById(`app-${id}`);
        if (!page) return;
        page.classList.add('open');
        if (navigator.vibrate) navigator.vibrate(8);
    }

    /* ── 返回 ── */
    document.querySelectorAll('.app-nav-back').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.app-page')?.classList.remove('open');
        });
    });

    /* ── 工具：在空 contenteditable 内放置光标 ── */
    function setCursor(el) {
        el.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(el, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    /* ── 宝丽来底部标题 localStorage 恢复 ── */
    const captionEl = document.getElementById('polaroidCaption');
    if (captionEl) {
        const saved = localStorage.getItem('sim_polaroid_caption');
        if (saved !== null) captionEl.textContent = saved;

        captionEl.addEventListener('blur', () => {
            localStorage.setItem('sim_polaroid_caption', captionEl.textContent);
        });
        captionEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); captionEl.blur(); }
        });
        /* 阻止点击标题条时冒泡触发换图 */
        captionEl.addEventListener('click', e => e.stopPropagation());
    }

});
