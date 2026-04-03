/* ================================================
   settings-font.js
   全局字体更换控制器
   支持：预设字体 / URL 加载 / 本地 TTF 上传
   刷新持久化：预设用 localStorage，自定义字体二进制
   用 IndexedDB 存储（避开 2MB 限制）
   ================================================ */
const FontSettings = (() => {

    /* ── Storage Keys ── */
    const KEY_TYPE = 'font_type';      // 'preset' | 'url' | 'file'
    const KEY_PRESET = 'font_preset_id'; // 预设 id
    const KEY_URL = 'font_url_data';  // { url, name, family }
    const KEY_FILE = 'font_file_meta'; // { name, family }  (二进制存 IDB)
    const IDB_NAME = 'MyPhoneFonts';
    const IDB_STORE = 'fontFiles';
    const IDB_KEY = 'customFont';

    /* ── 预设字体列表 ── */
    const PRESETS = [
        {
            id: 'default',
            name: '系统默认',
            family: "'PingFang SC','Apple SD Gothic Neo','Helvetica Neue',sans-serif",
            preview: 'Aa'
        },
        {
            id: 'noto',
            name: 'Noto Sans',
            family: "'Noto Sans SC',sans-serif",
            preview: 'Aa',
            cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap'
        },
        {
            id: 'lxgw',
            name: '霞鹜文楷',
            family: "'LXGW WenKai Screen',serif",
            preview: '文楷',
            cssUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css'
        },
        {
            id: 'courier',
            name: 'Courier',
            family: "'Courier New',monospace",
            preview: 'Aa'
        },
        {
            id: 'georgia',
            name: 'Georgia',
            family: "Georgia,serif",
            preview: 'Gg'
        },
        {
            id: 'zpix',
            name: 'Z 像素',
            family: "'Zpix',monospace",
            preview: '字体',
            cssUrl: 'https://cdn.jsdelivr.net/npm/zpix@3.1.1/zpix.css'
        }
    ];

    /* ── 运行时状态 ── */
    let _currentName = '系统默认';
    let _currentFamily = PRESETS[0].family;

    /* ================================================================
       IndexedDB 工具
       ================================================================ */
    function _idbOpen() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(IDB_STORE);
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function _idbSave(buffer) {
        const db = await _idbOpen();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(buffer, IDB_KEY);
        return new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = rej;
        });
    }

    async function _idbLoad() {
        const db = await _idbOpen();
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        return new Promise((res, rej) => {
            const req = store.get(IDB_KEY);
            req.onsuccess = () => res(req.result || null);
            req.onerror = () => rej(req.error);
        });
    }

    async function _idbClear() {
        const db = await _idbOpen();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
    }

    /* ================================================================
       页面开关
       ================================================================ */
    function open() {
        document.getElementById('pageFont').classList.add('page-active');
        _buildPresetGrid();
        _syncCurrentCard();
    }

    function close() {
        document.getElementById('pageFont').classList.remove('page-active');
    }

    /* ================================================================
       构建预设网格
       ================================================================ */
    function _buildPresetGrid() {
        const grid = document.getElementById('fsPresetGrid');
        if (!grid) return;
        const typeNow = Storage.get(KEY_TYPE) || 'preset';
        const idNow = Storage.get(KEY_PRESET) || 'default';
        grid.innerHTML = '';

        PRESETS.forEach(f => {
            const active = (typeNow === 'preset' && idNow === f.id);
            const div = document.createElement('div');
            div.className = `fs-preset-item${active ? ' fs-active' : ''}`;
            div.innerHTML = `
                <div class="fs-preset-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"
                        stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="fs-preset-preview" style="font-family:${f.family}">${f.preview}</div>
                <div class="fs-preset-name">${f.name}</div>
            `;
            div.addEventListener('click', () => _applyPreset(f.id));
            grid.appendChild(div);
        });
    }

    /* ================================================================
       同步顶部「当前字体」卡片
       ================================================================ */
    function _syncCurrentCard() {
        const nameEl = document.getElementById('fsCurrentName');
        const prevEl = document.getElementById('fsCurrentPreview');
        if (nameEl) nameEl.textContent = _currentName;
        if (prevEl) {
            prevEl.style.fontFamily = _currentFamily;
        }
    }

    /* ================================================================
       ① 应用预设字体
       ================================================================ */
    function _applyPreset(id) {
        const f = PRESETS.find(x => x.id === id);
        if (!f) return;

        /* 加载外部 CSS（Google Fonts / CDN 样式表） */
        if (f.cssUrl && !document.querySelector(`link[data-font-id="${id}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = f.cssUrl;
            link.dataset.fontId = id;
            document.head.appendChild(link);
        }

        _applyFontFamily(f.family, f.name);

        /* 持久化 */
        Storage.set(KEY_TYPE, 'preset');
        Storage.set(KEY_PRESET, id);

        /* 更新 UI */
        document.querySelectorAll('.fs-preset-item').forEach(el => {
            el.classList.remove('fs-active');
        });
        const target = document.querySelectorAll('.fs-preset-item');
        const idx = PRESETS.findIndex(x => x.id === id);
        if (target[idx]) target[idx].classList.add('fs-active');

        _toast(`字体已切换为 ${f.name}`);
    }

    /* ================================================================
       ② 从 URL 加载字体
       ================================================================ */
    async function loadFromURL() {
        const urlInput = document.getElementById('fsUrlInput');
        const nameInput = document.getElementById('fsUrlName');
        const loadingEl = document.getElementById('fsUrlLoading');
        const btnEl = document.querySelector('.fs-url-btn');

        const url = urlInput.value.trim();
        if (!url) { _toast('请输入字体链接'); return; }

        const isCSSLink = url.endsWith('.css') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic');
        const isDirectFont = /\.(ttf|otf|woff2?)(\?.*)?$/i.test(url);

        const fontName = (nameInput && nameInput.value.trim()) || _guessFontName(url);

        loadingEl.classList.add('fs-loading-show');
        if (btnEl) btnEl.disabled = true;

        try {
            if (isCSSLink) {
                /* CSS 样式表：直接 <link> 注入 */
                await _loadCSSFont(url, fontName);

            } else if (isDirectFont) {
                /* 字体文件直链：fetch → ArrayBuffer → FontFace + IDB */
                await _fetchAndApplyFont(url, fontName);

            } else {
                /* 尝试当作字体文件直链处理 */
                await _fetchAndApplyFont(url, fontName);
            }

            Storage.set(KEY_TYPE, 'url');
            Storage.set(KEY_URL, { url, name: fontName, family: `"CustomURL_${fontName}"` });

            if (urlInput) urlInput.value = '';
            if (nameInput) nameInput.value = '';
            _buildPresetGrid(); /* 取消预设选中 */
            _toast(`字体「${fontName}」加载成功`);

        } catch (err) {
            _toast(`加载失败：${err.message || '网络错误'}`);
            console.warn('[FontSettings] URL load error:', err);
        } finally {
            loadingEl.classList.remove('fs-loading-show');
            if (btnEl) btnEl.disabled = false;
        }
    }

    /* 注入 CSS 样式表字体（Google Fonts 等） */
    function _loadCSSFont(cssUrl, name) {
        return new Promise((resolve, reject) => {
            const id = 'custom-css-font';
            const old = document.getElementById(id);
            if (old) old.remove();
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = cssUrl;
            link.onload = () => {
                /* 从 @font-face 解析 family name，简单回退用 name */
                const family = `"${name}"`;
                _applyFontFamily(family, name);
                resolve();
            };
            link.onerror = () => reject(new Error('CSS 样式表加载失败'));
            document.head.appendChild(link);
        });
    }

    /* fetch 字体文件 → FontFace + IDB 持久化 */
    async function _fetchAndApplyFont(url, name) {
        const familyName = `CustomFont_${Date.now()}`;

        /* 尝试 fetch（CORS 字体文件一般允许跨域） */
        let buffer;
        try {
            const resp = await fetch(url, { mode: 'cors' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            buffer = await resp.arrayBuffer();
        } catch (e) {
            throw new Error('无法获取字体文件，请确认链接有效且支持跨域访问');
        }

        /* 注册 FontFace */
        await _registerFontFace(familyName, buffer);

        /* 保存到 IDB */
        await _idbSave(buffer);
        Storage.set(KEY_FILE, { name, family: familyName });

        _applyFontFamily(`"${familyName}"`, name);
    }

    /* ================================================================
       ③ 从本地文件加载
       ================================================================ */
    async function loadFromFile(input) {
        const file = input.files[0];
        const loadingEl = document.getElementById('fsFileLoading');
        const uploadEl = document.getElementById('fsUploadZone');

        if (!file) return;

        /* 校验格式 */
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
            _toast('不支持的字体格式，请使用 TTF / OTF / WOFF');
            return;
        }

        const fontName = file.name.replace(/\.[^.]+$/, ''); /* 去掉扩展名 */
        const familyName = `LocalFont_${Date.now()}`;

        loadingEl.classList.add('fs-loading-show');
        uploadEl && uploadEl.classList.add('fs-upload-active');

        try {
            const buffer = await file.arrayBuffer();

            /* 注册 FontFace */
            await _registerFontFace(familyName, buffer);

            /* 持久化到 IDB */
            await _idbSave(buffer);
            Storage.set(KEY_TYPE, 'file');
            Storage.set(KEY_FILE, { name: fontName, family: familyName });

            _applyFontFamily(`"${familyName}"`, fontName);
            _buildPresetGrid();

            /* 更新上传区文字 */
            const textEl = document.getElementById('fsUploadText');
            if (textEl) textEl.textContent = `✓ 已加载：${fontName}`;

            _toast(`字体「${fontName}」加载成功`);

        } catch (err) {
            _toast(`字体解析失败：${err.message}`);
            console.warn('[FontSettings] File load error:', err);
        } finally {
            loadingEl.classList.remove('fs-loading-show');
            uploadEl && uploadEl.classList.remove('fs-upload-active');
            /* 清空 input 以便重复选同一文件 */
            input.value = '';
        }
    }

    /* ================================================================
       FontFace API 注册
       ================================================================ */
    async function _registerFontFace(familyName, buffer) {
        /* 清理同名旧字体 */
        for (const ff of document.fonts) {
            if (ff.family === `"${familyName}"` || ff.family === familyName) {
                try { document.fonts.delete(ff); } catch (_) { }
            }
        }
        const fontFace = new FontFace(familyName, buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
    }

    /* ================================================================
       应用字体到全局
       ================================================================ */
    function _applyFontFamily(family, name) {
        _currentFamily = family;
        _currentName = name;

        /* 写入 CSS 变量（全局生效）*/
        document.documentElement.style.setProperty('--font-main', family);
        /* 同时直接写 body，确保无变量引用的样式也生效 */
        document.body.style.fontFamily = family;
        /* 强制应用到 phone-screen 内所有元素 */
        const style = document.getElementById('__font_override__') || (() => {
            const s = document.createElement('style');
            s.id = '__font_override__';
            document.head.appendChild(s);
            return s;
        })();
        style.textContent = `* { font-family: ${family} !important; }
        .status-signal svg, .status-wifi svg, .status-battery svg,
        [class*="icon"] svg { font-family: initial !important; }`;

        _syncCurrentCard();
    }

    /* ================================================================
       重置字体
       ================================================================ */
    async function resetFont() {
        Storage.set(KEY_TYPE, 'preset');
        Storage.set(KEY_PRESET, 'default');
        Storage.set(KEY_URL, null);
        Storage.set(KEY_FILE, null);

        /* 清理 IDB */
        try { await _idbClear(); } catch (_) { }

        /* 移除覆盖样式 */
        const override = document.getElementById('__font_override__');
        if (override) override.textContent = '';

        const def = PRESETS[0];
        document.documentElement.style.setProperty('--font-main', def.family);
        document.body.style.fontFamily = def.family;

        _currentFamily = def.family;
        _currentName = def.name;

        _buildPresetGrid();
        _syncCurrentCard();

        const textEl = document.getElementById('fsUploadText');
        if (textEl) textEl.textContent = '点击选择字体文件';

        _toast('字体已重置为系统默认');
    }

    /* ================================================================
       初始化：DOMContentLoaded 时恢复字体
       ================================================================ */
    async function init() {
        const type = Storage.get(KEY_TYPE) || 'preset';

        if (type === 'preset') {
            const id = Storage.get(KEY_PRESET) || 'default';
            const f = PRESETS.find(x => x.id === id) || PRESETS[0];
            if (f.cssUrl && !document.querySelector(`link[data-font-id="${id}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = f.cssUrl;
                link.dataset.fontId = id;
                document.head.appendChild(link);
            }
            _applyFontFamily(f.family, f.name);

        } else if (type === 'url') {
            const data = Storage.get(KEY_URL);
            if (data) {
                const isCSSLink = data.url && (data.url.endsWith('.css') ||
                    data.url.includes('fonts.googleapis'));
                if (isCSSLink) {
                    try { await _loadCSSFont(data.url, data.name); } catch (_) { }
                } else {
                    /* URL 字体：从 IDB 恢复（已缓存） */
                    await _restoreFromIDB(data.name);
                }
            }

        } else if (type === 'file') {
            const meta = Storage.get(KEY_FILE);
            if (meta) {
                await _restoreFromIDB(meta.name);
            }
        }
    }

    /* 从 IDB 恢复字体二进制 */
    async function _restoreFromIDB(name) {
        try {
            const buffer = await _idbLoad();
            if (!buffer) return;
            const familyName = `RestoredFont_${Date.now()}`;
            await _registerFontFace(familyName, buffer);
            _applyFontFamily(`"${familyName}"`, name || '自定义字体');
        } catch (e) {
            console.warn('[FontSettings] IDB restore failed:', e);
        }
    }

    /* ================================================================
       工具函数
       ================================================================ */
    function _guessFontName(url) {
        try {
            const parts = new URL(url).pathname.split('/');
            const last = parts[parts.length - 1];
            return last.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || '自定义字体';
        } catch (_) {
            return '自定义字体';
        }
    }

    function _toast(msg) {
        const screen = document.getElementById('phoneScreen');
        if (!screen) return;
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
        screen.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2200);
    }

    document.addEventListener('DOMContentLoaded', init);

    return { open, close, loadFromURL, loadFromFile, resetFont };
})();
