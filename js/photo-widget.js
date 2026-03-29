/* ============================================
   photo-widget.js
   纯 JS 触发 file picker，不在 DOM 里放 input
   ============================================ */
(function initWidgets() {

    setupWidget({
        widgetId: 'glassWidget',
        imgId: 'glassImg',
        phId: 'glassPlaceholder',
        storageKey: 'sim_glass_photo',
    });

    setupWidget({
        widgetId: 'photoWidget',
        imgId: 'photoImg',
        phId: 'photoPlaceholder',
        storageKey: 'sim_photo_widget',
    });

    /* ── 头像也走同一套逻辑 ── */
    setupWidget({
        widgetId: 'avatarWrapper',
        imgId: 'avatarImg',
        phId: 'avatarPlaceholder',  /* svg id */
        storageKey: 'sim_avatar',
        onApply(img) {
            /* 头像额外：隐藏 svg placeholder */
            const svg = document.getElementById('avatarPlaceholder');
            if (svg) svg.style.display = 'none';
            img.style.borderRadius = '50%';
        },
    });

    /* ─────────────────────────────────────────
       核心函数：点击容器 → 创建隐藏 input → 
       用户选图 → 读取 → 显示 → 存储
    ───────────────────────────────────────── */
    function setupWidget({ widgetId, imgId, phId, storageKey, onApply }) {
        const widget = document.getElementById(widgetId);
        const imgEl = document.getElementById(imgId);
        if (!widget || !imgEl) return;

        /* 读取已保存 */
        const saved = localStorage.getItem(storageKey);
        if (saved) applyPhoto(saved);

        /* 点击容器触发选文件 */
        widget.addEventListener('click', (e) => {
            /* 如果点击的是 contenteditable 字段内部，不触发 */
            if (e.target.closest('[contenteditable]')) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            /* 不插入 DOM，直接触发 */
            input.addEventListener('change', function () {
                const file = this.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    toast('图片请勿超过 5MB');
                    return;
                }
                const reader = new FileReader();
                reader.onload = ev => {
                    localStorage.setItem(storageKey, ev.target.result);
                    applyPhoto(ev.target.result);
                };
                reader.readAsDataURL(file);
            });
            input.click();
        });

        function applyPhoto(src) {
            imgEl.src = src;
            imgEl.style.display = 'block';
            const ph = document.getElementById(phId);
            if (ph) ph.style.display = 'none';
            widget.classList.add('has-photo');
            if (onApply) onApply(imgEl);
        }
    }

    /* ── 轻提示 ── */
    function toast(msg) {
        let el = document.getElementById('_sim_toast');
        if (!el) {
            el = document.createElement('div');
            el.id = '_sim_toast';
            Object.assign(el.style, {
                position: 'absolute', bottom: '108px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(30,30,30,0.8)', color: '#fff',
                fontSize: '12px', padding: '6px 16px', borderRadius: '20px',
                whiteSpace: 'nowrap', zIndex: '999', pointerEvents: 'none',
                backdropFilter: 'blur(8px)', transition: 'opacity 0.3s',
            });
            document.querySelector('.phone-screen')?.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
    }

})();
