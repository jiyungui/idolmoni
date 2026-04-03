/* ================================================
   settings-icon.js
   应用图标主题 & 自定义图片控制器
   ================================================ */
const IconTheme = (() => {

    const KEY_STYLE = 'icon_style';        // 风格 id
    const KEY_LABEL_CLR = 'icon_label_color';  // 文字颜色
    const KEY_CUSTOM_IMG = 'icon_custom_imgs';  // {appKey: dataURL}

    /* 9 个图标槽配置（对应主屏 apps-grid 的 7 个 + dock 区 3 个，这里取前 9 个展示/定制）*/
    const SLOTS = [
        { key: 'contacts', label: '人脉', svgId: 'contacts' },
        { key: 'world', label: '大世界', svgId: 'world' },
        { key: 'weibo', label: '微博', svgId: 'weibo' },
        { key: 'bubble', label: 'bubble', svgId: 'bubble' },
        { key: 'douban', label: '豆瓣', svgId: 'douban' },
        { key: 'music', label: '音乐', svgId: 'music' },
        { key: 'settings', label: '设置', svgId: 'settings' },
        { key: 'profile', label: '个人', svgId: 'profile' },
        { key: 'social', label: '社交', svgId: 'social' },
    ];

    /* 各 app-icon 的内联 SVG（从主页复制，方便在槽中展示） */
    const SVGS = {
        contacts: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="14" r="6"/><path d="M6 34c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke-linecap="round"/><line x1="32" y1="8" x2="32" y2="16"/><line x1="28" y1="12" x2="36" y2="12"/></svg>`,
        world: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="20" r="13"/><ellipse cx="20" cy="20" rx="6" ry="13"/><line x1="7" y1="20" x2="33" y2="20"/><line x1="9" y1="13" x2="31" y2="13"/><line x1="9" y1="27" x2="31" y2="27"/></svg>`,
        weibo: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 8 C28 8 33 13 33 20 C33 28 26 34 18 34 C11 34 7 30 7 24 C7 18 12 14 18 14" stroke-linecap="round"/><circle cx="26" cy="12" r="3"/><circle cx="17" cy="23" r="2" fill="currentColor"/><path d="M13 27c1-2 3-3 5-3s3.5 1 3.5 2.5" stroke-linecap="round"/></svg>`,
        bubble: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 10 H32 A4 4 0 0 1 36 14 V24 A4 4 0 0 1 32 28 H22 L16 34 V28 H8 A4 4 0 0 1 4 24 V14 A4 4 0 0 1 8 10Z"/><line x1="12" y1="18" x2="28" y2="18"/><line x1="12" y1="23" x2="22" y2="23"/></svg>`,
        douban: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><line x1="10" y1="8" x2="30" y2="8"/><rect x="8" y="12" width="24" height="14" rx="3"/><path d="M14 30 Q20 36 26 30" stroke-linecap="round"/><line x1="20" y1="26" x2="20" y2="32"/></svg>`,
        music: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 30 V12 L32 9 V27" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="30" r="4"/><circle cx="28" cy="27" r="4"/></svg>`,
        settings: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="20" r="4"/><path d="M20 7v3M20 30v3M7 20h3M30 20h3M10.5 10.5l2 2M27.5 27.5l2 2M27.5 10.5l-2 2M10.5 27.5l2-2" stroke-linecap="round"/><circle cx="20" cy="20" r="9"/></svg>`,
        profile: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="14" r="6"/><path d="M8 34c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke-linecap="round"/><circle cx="20" cy="20" r="18" stroke-dasharray="3 3"/></svg>`,
        social: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="20" r="4"/><circle cx="30" cy="12" r="4"/><circle cx="30" cy="28" r="4"/><line x1="14" y1="18" x2="26" y2="14"/><line x1="14" y1="22" x2="26" y2="26"/></svg>`,
    };

    let _style = 'default';
    let _labelColor = '#3a3a4a';
    let _customImgs = {};   // { appKey: dataURL }

    /* ================================================================
       页面开关
       ================================================================ */
    function open() {
        document.getElementById('pageIconTheme').classList.add('page-active');
        _buildGrid();
        _syncUI();
    }

    function close() {
        document.getElementById('pageIconTheme').classList.remove('page-active');
    }

    /* ================================================================
       初始化：从 Storage 恢复
       ================================================================ */
    function init() {
        _style = Storage.get(KEY_STYLE) || 'default';
        _labelColor = Storage.get(KEY_LABEL_CLR) || '#3a3a4a';
        _customImgs = Storage.get(KEY_CUSTOM_IMG) || {};
        _applyStyleToDOM(_style);
        _applyLabelColorToDOM(_labelColor);
        _applyCustomImagesToDOM();
    }

    /* ================================================================
       构建 3×3 自定义图标网格
       ================================================================ */
    function _buildGrid() {
        const grid = document.getElementById('itCustomGrid');
        if (!grid) return;
        grid.innerHTML = '';

        SLOTS.forEach(slot => {
            const hasImg = !!_customImgs[slot.key];
            const div = document.createElement('div');
            div.className = 'it-slot';
            div.innerHTML = `
                <div class="it-slot-icon${hasImg ? ' it-slot-custom' : ''}" id="itSlot_${slot.key}">
                    ${SVGS[slot.key] || ''}
                    <img id="itSlotImg_${slot.key}" src="${hasImg ? _customImgs[slot.key] : ''}"
                         alt="" class="${hasImg ? 'loaded' : ''}" />
                    <div class="it-slot-badge"></div>
                </div>
                <span class="it-slot-name">${slot.label}</span>
            `;
            /* 点击：选择自定义图片 */
            div.querySelector('.it-slot-icon').addEventListener('click', () => _pickIconImage(slot.key));
            /* 长按：重置该图标 */
            let pressTimer = null;
            div.querySelector('.it-slot-icon').addEventListener('pointerdown', () => {
                pressTimer = setTimeout(() => _resetSingleIcon(slot.key), 600);
            });
            div.querySelector('.it-slot-icon').addEventListener('pointerup', () => clearTimeout(pressTimer));
            div.querySelector('.it-slot-icon').addEventListener('pointerleave', () => clearTimeout(pressTimer));

            grid.appendChild(div);
        });
    }

    /* ================================================================
       同步 UI 选中态
       ================================================================ */
    function _syncUI() {
        /* 风格卡片 */
        document.querySelectorAll('.it-preset-card').forEach(el => {
            el.classList.toggle('it-preset-active', el.dataset.style === _style);
        });
        /* 颜色点 */
        document.querySelectorAll('.it-color-dot').forEach(el => {
            el.classList.toggle('it-dot-active', el.dataset.color === _labelColor);
        });
        /* 颜色选择器 */
        const picker = document.getElementById('itColorPicker');
        if (picker) picker.value = _labelColor;
        /* 预览文字颜色 */
        const prev = document.getElementById('itPreviewText');
        if (prev) prev.style.color = _labelColor;
    }

    /* ================================================================
       应用风格预设
       ================================================================ */
    function applyStyle(styleId) {
        _style = styleId;
        Storage.set(KEY_STYLE, styleId);
        _applyStyleToDOM(styleId);
        /* 同步卡片选中态 */
        document.querySelectorAll('.it-preset-card').forEach(el => {
            el.classList.toggle('it-preset-active', el.dataset.style === styleId);
        });
        _toast('图标风格已切换');
    }

    function _applyStyleToDOM(styleId) {
        const grid = document.getElementById('appsGrid');
        const dock = document.getElementById('dock');
        /* 移除所有旧风格类 */
        const styles = ['default', 'frosted', 'clear', 'ins', 'korean', 'ios', 'dark', 'cream'];
        styles.forEach(s => {
            grid && grid.classList.remove(`icon-style-${s}`);
        });
        /* 加新风格类（default 不加类，用原始样式）*/
        if (styleId !== 'default') {
            grid && grid.classList.add(`icon-style-${styleId}`);
        }
        /* dock 图标内层也需要更新 */
        if (dock) {
            dock.querySelectorAll('.dock-icon-inner').forEach(el => {
                styles.forEach(s => el.classList.remove(`icon-style-${s}`));
                if (styleId !== 'default') el.classList.add(`icon-style-${styleId}`);
            });
        }
    }

    /* ================================================================
       设置文字颜色
       ================================================================ */
    function setLabelColor(color) {
        _labelColor = color;
        Storage.set(KEY_LABEL_CLR, color);
        _applyLabelColorToDOM(color);
        /* 同步颜色点选中态 */
        document.querySelectorAll('.it-color-dot').forEach(el => {
            el.classList.toggle('it-dot-active', el.dataset.color === color);
        });
        /* 预览文字 */
        const prev = document.getElementById('itPreviewText');
        if (prev) prev.style.color = color;
    }

    function _applyLabelColorToDOM(color) {
        document.documentElement.style.setProperty('--icon-label-color', color);
    }

    /* ================================================================
       自定义图标图片
       ================================================================ */
    function _pickIconImage(appKey) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) { input.remove(); return; }
            /* 压缩到 96×96 再存储，节省空间 */
            const reader = new FileReader();
            reader.onload = (ev) => {
                _compressIcon(ev.target.result, 96, (dataURL) => {
                    _customImgs[appKey] = dataURL;
                    Storage.set(KEY_CUSTOM_IMG, _customImgs);
                    /* 更新设置页槽 */
                    const slotEl = document.getElementById(`itSlot_${appKey}`);
                    const imgEl = document.getElementById(`itSlotImg_${appKey}`);
                    if (slotEl) slotEl.classList.add('it-slot-custom');
                    if (imgEl) { imgEl.src = dataURL; imgEl.classList.add('loaded'); }
                    /* 更新主屏 */
                    _applyCustomImagesToDOM();
                    _toast('图标已更换');
                });
                input.remove();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    /* 压缩图片到指定尺寸 */
    function _compressIcon(dataURL, size, cb) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            /* 居中裁剪为正方形 */
            const s = Math.min(img.width, img.height);
            const ox = (img.width - s) / 2;
            const oy = (img.height - s) / 2;
            ctx.drawImage(img, ox, oy, s, s, 0, 0, size, size);
            cb(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = dataURL;
    }

    /* 将自定义图片应用到主屏图标 */
    function _applyCustomImagesToDOM() {
        SLOTS.forEach(slot => {
            const dataURL = _customImgs[slot.key];
            /* 主屏 app-icon */
            const appIconEl = document.querySelector(`.app-icon[data-app="${slot.key}"] .app-icon-inner`);
            if (appIconEl) {
                let img = appIconEl.querySelector('img.it-custom-img');
                if (dataURL) {
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'it-custom-img';
                        Object.assign(img.style, {
                            position: 'absolute', inset: '0',
                            width: '100%', height: '100%',
                            objectFit: 'cover', borderRadius: 'inherit',
                            pointerEvents: 'none'
                        });
                        appIconEl.style.position = 'relative';
                        appIconEl.style.overflow = 'hidden';
                        appIconEl.appendChild(img);
                    }
                    img.src = dataURL;
                } else if (img) {
                    img.remove();
                }
            }
            /* dock 图标 */
            const dockIconEl = document.querySelector(`.dock-icon[data-app="${slot.key}"] .dock-icon-inner`);
            if (dockIconEl) {
                let img = dockIconEl.querySelector('img.it-custom-img');
                if (dataURL) {
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'it-custom-img';
                        Object.assign(img.style, {
                            position: 'absolute', inset: '0',
                            width: '100%', height: '100%',
                            objectFit: 'cover', borderRadius: 'inherit',
                            pointerEvents: 'none'
                        });
                        dockIconEl.style.position = 'relative';
                        dockIconEl.style.overflow = 'hidden';
                        dockIconEl.appendChild(img);
                    }
                    img.src = dataURL;
                } else if (img) {
                    img.remove();
                }
            }
        });
    }

    /* 重置单个图标 */
    function _resetSingleIcon(appKey) {
        delete _customImgs[appKey];
        Storage.set(KEY_CUSTOM_IMG, _customImgs);
        /* 更新槽 */
        const slotEl = document.getElementById(`itSlot_${appKey}`);
        const imgEl = document.getElementById(`itSlotImg_${appKey}`);
        if (slotEl) slotEl.classList.remove('it-slot-custom');
        if (imgEl) { imgEl.src = ''; imgEl.classList.remove('loaded'); }
        _applyCustomImagesToDOM();
        _toast('已重置该图标');
    }

    /* ================================================================
       重置全部
       ================================================================ */
    function resetAll() {
        if (!confirm('确定重置所有图标设置？')) return;
        _style = 'default';
        _labelColor = '#3a3a4a';
        _customImgs = {};
        Storage.set(KEY_STYLE, _style);
        Storage.set(KEY_LABEL_CLR, _labelColor);
        Storage.set(KEY_CUSTOM_IMG, _customImgs);
        _applyStyleToDOM('default');
        _applyLabelColorToDOM('#3a3a4a');
        _applyCustomImagesToDOM();
        _buildGrid();
        _syncUI();
        _toast('已重置所有图标设置');
    }

    /* ================================================================
       Toast 提示
       ================================================================ */
    function _toast(msg) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'absolute', bottom: '100px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(44,44,52,0.85)', color: '#fff',
            fontSize: '12px', fontWeight: '500', letterSpacing: '.03em',
            padding: '9px 18px', borderRadius: '20px',
            whiteSpace: 'nowrap', zIndex: '9999',
            pointerEvents: 'none', opacity: '0', transition: 'opacity .2s'
        });
        document.getElementById('phoneScreen').appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
    }

    /* DOMContentLoaded 初始化 */
    document.addEventListener('DOMContentLoaded', init);

    return { open, close, applyStyle, setLabelColor, resetAll };
})();
