/* ============================================
   settings.js — 设置系统完整逻辑 v4
   · 设置主页 · API · 模型 · MiniMax语音
   · 屏幕调整 · 壁纸+天气 · 字体更换
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    const $ = id => document.getElementById(id);

    function toast(msg, type = 'info') {
        let el = $('_st_toast');
        if (!el) {
            el = document.createElement('div');
            el.id = '_st_toast';
            Object.assign(el.style, {
                position: 'absolute', bottom: '112px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(40,38,35,0.82)', color: '#fff',
                fontSize: '11.5px', padding: '6px 16px', borderRadius: '20px',
                whiteSpace: 'nowrap', zIndex: '9999', pointerEvents: 'none',
                backdropFilter: 'blur(10px)', transition: 'opacity 0.28s', letterSpacing: '0.2px',
            });
            document.querySelector('.phone-screen')?.appendChild(el);
        }
        el.style.color = type === 'ok' ? '#7aad88' : type === 'err' ? '#c07a80' : '#fff';
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.style.opacity = '0'; }, 2400);
    }

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ════════════════════════════════════════
       1. 设置主页导航
       ════════════════════════════════════════ */
    $('st-goto-api')?.addEventListener('click', () => { $('api-settings-page')?.classList.add('open'); });
    $('st-goto-screen')?.addEventListener('click', () => { $('screen-settings-page')?.classList.add('open'); });
    $('st-goto-wallpaper')?.addEventListener('click', () => { $('wallpaper-settings-page')?.classList.add('open'); });
    $('st-goto-font')?.addEventListener('click', () => { $('font-settings-page')?.classList.add('open'); });
    ['st-goto-appicon', 'st-goto-data'].forEach(id => {
        $(id)?.addEventListener('click', () => toast('该模块开发中 ·˖✧'));
    });

    /* ════════════════════════════════════════
       2. 子页返回
       ════════════════════════════════════════ */
    $('api-back')?.addEventListener('click', () => { $('api-settings-page')?.classList.remove('open'); });
    $('screen-back')?.addEventListener('click', () => { $('screen-settings-page')?.classList.remove('open'); });
    $('wallpaper-back')?.addEventListener('click', () => { $('wallpaper-settings-page')?.classList.remove('open'); });
    $('font-back')?.addEventListener('click', () => { $('font-settings-page')?.classList.remove('open'); });

    /* ════════════════════════════════════════
       3. API 配置
       ════════════════════════════════════════ */
    const inpName = $('api-name'), inpUrl = $('api-url'), inpKey = $('api-key');
    const selModel = $('api-model-select'), statusEl = $('api-status');

    (() => {
        const d = JSON.parse(localStorage.getItem('sim_api_draft') || '{}');
        if (inpName) inpName.value = d.name || '';
        if (inpUrl) inpUrl.value = d.url || '';
        if (inpKey) inpKey.value = d.key || '';
    })();

    [inpName, inpUrl, inpKey].forEach(el => el?.addEventListener('input', () => {
        localStorage.setItem('sim_api_draft', JSON.stringify({
            name: inpName?.value || '', url: inpUrl?.value || '', key: inpKey?.value || '',
        }));
    }));

    function setStatus(msg, type = 'info') {
        if (!statusEl) return;
        statusEl.textContent = msg; statusEl.className = `api-status ${type}`;
    }

    $('api-fetch-btn')?.addEventListener('click', async () => {
        const url = inpUrl?.value.trim(), key = inpKey?.value.trim();
        if (!url) { setStatus('请先填写 API URL', 'err'); return; }
        setStatus('拉取中…', 'info');
        try {
            const base = url.replace(/\/$/, '').replace(/\/chat\/completions$/, '');
            const res = await fetch(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
            if (!list.length) { setStatus('未获取到模型列表', 'err'); return; }
            selModel.innerHTML = '';
            list.forEach(m => {
                const id = typeof m === 'string' ? m : (m.id || m.name || m);
                const opt = document.createElement('option');
                opt.value = opt.textContent = id;
                selModel.appendChild(opt);
            });
            setStatus(`已拉取 ${list.length} 个模型 ✓`, 'ok');
        } catch (e) { setStatus(`拉取失败：${e.message}`, 'err'); }
    });

    $('api-test-btn')?.addEventListener('click', async () => {
        const url = inpUrl?.value.trim(), key = inpKey?.value.trim(), model = selModel?.value;
        if (!url || !model) { setStatus('请填写 URL 并选择模型', 'err'); return; }
        setStatus('测试中…', 'info');
        try {
            const base = url.replace(/\/$/, '');
            const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setStatus('测试成功，模型响应正常 ✓', 'ok');
        } catch (e) { setStatus(`测试失败：${e.message}`, 'err'); }
    });

    $('api-save-btn')?.addEventListener('click', () => {
        const name = inpName?.value.trim(), url = inpUrl?.value.trim(), key = inpKey?.value.trim(), model = selModel?.value;
        if (!name) { setStatus('请填写 API 名称', 'err'); return; }
        if (!url) { setStatus('请填写 API URL', 'err'); return; }
        if (!model) { setStatus('请先拉取并选择模型', 'err'); return; }
        const list = getModelList();
        if (list.find(m => m.name === name && m.model === model)) { setStatus('该配置已存在', 'err'); return; }
        list.push({ id: Date.now(), name, url, key, model });
        saveModelList(list); renderModelList();
        setStatus(`已保存：${name} / ${model} ✓`, 'ok'); toast(`模型「${model}」已保存`, 'ok');
    });

    /* ════════════════════════════════════════
       4. 模型列表
       ════════════════════════════════════════ */
    function getModelList() { return JSON.parse(localStorage.getItem('sim_model_list') || '[]'); }
    function saveModelList(list) { localStorage.setItem('sim_model_list', JSON.stringify(list)); }
    function getActiveId() { return Number(localStorage.getItem('sim_active_model')) || 0; }
    function setActiveId(id) { localStorage.setItem('sim_active_model', String(id)); }

    function renderModelList() {
        const container = $('model-list-container');
        if (!container) return;
        const list = getModelList(), activeId = getActiveId();
        if (!list.length) {
            container.innerHTML = `<div style="text-align:center;padding:20px 0;font-size:11.5px;color:var(--text-muted);letter-spacing:0.3px;">暂无已保存模型</div>`;
            return;
        }
        container.innerHTML = '';
        list.forEach(m => {
            const item = document.createElement('div');
            item.className = `model-item${m.id === activeId ? ' active' : ''}`;
            item.innerHTML = `
                <div class="model-dot"></div>
                <div class="model-info">
                    <span class="model-name">${escHtml(m.model)}</span>
                    <span class="model-provider">${escHtml(m.name)}</span>
                </div>
                <div class="model-del" data-del="${m.id}">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>`;
            item.addEventListener('click', e => {
                if (e.target.closest('[data-del]')) return;
                setActiveId(m.id); renderModelList(); toast(`已切换到 ${m.model}`, 'ok');
            });
            item.querySelector('[data-del]').addEventListener('click', e => {
                e.stopPropagation();
                const updated = getModelList().filter(x => x.id !== m.id);
                saveModelList(updated);
                if (m.id === getActiveId() && updated.length) setActiveId(updated[0].id);
                renderModelList(); toast('已删除');
            });
            container.appendChild(item);
        });
    }
    renderModelList();

    /* ════════════════════════════════════════
       5. MiniMax 语音配置
       ════════════════════════════════════════ */
    const LANGUAGES = [
        { code: 'zh', label: '普通话' },
        { code: 'zh-dialect', label: '方言' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' },
        { code: 'ko', label: '한국어' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
        { code: 'es', label: 'Español' },
        { code: 'ar', label: 'عربي' },
    ];

    function renderLangGrid(activeLang) {
        const grid = $('mm-lang-grid');
        if (!grid) return;
        grid.innerHTML = '';
        LANGUAGES.forEach(({ code, label }) => {
            const tag = document.createElement('div');
            tag.className = `lang-tag${code === activeLang ? ' active' : ''}`;
            tag.dataset.code = code;
            tag.innerHTML = `<span class="lang-name">${label}</span>`;
            tag.addEventListener('click', () => {
                document.querySelectorAll('#mm-lang-grid .lang-tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
            });
            grid.appendChild(tag);
        });
    }

    function getActiveLang() {
        const active = document.querySelector('#mm-lang-grid .lang-tag.active');
        return active?.dataset.code || 'zh';
    }

    function getMiniMaxCfg() { return JSON.parse(localStorage.getItem('sim_minimax_cfg') || '{}'); }

    function restoreMiniMax() {
        const cfg = getMiniMaxCfg();
        if ($('mm-group-id')) $('mm-group-id').value = cfg.groupId || '';
        if ($('mm-api-key')) $('mm-api-key').value = cfg.apiKey || '';
        if ($('mm-voice-id')) $('mm-voice-id').value = cfg.voiceId || '';
        [
            { id: 'mm-speed', def: 1.0 },
            { id: 'mm-vol', def: 1.0 },
            { id: 'mm-pitch', def: 0 },
        ].forEach(({ id, def }) => {
            const inp = $(id); if (!inp) return;
            inp.value = cfg[id.replace('mm-', '')] ?? def;
            updateSlider(inp);
        });
        updateSliderLabels();
        renderLangGrid(cfg.lang || 'zh');
    }

    function updateSlider(input) {
        const min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
        input.style.setProperty('--pct', `${((val - min) / (max - min) * 100).toFixed(1)}%`);
    }

    function updateSliderLabels() {
        ['mm-speed', 'mm-vol', 'mm-pitch'].forEach(id => {
            const inp = $(id), disp = $(`${id}-val`);
            if (inp && disp) disp.textContent = parseFloat(inp.value).toFixed(1);
        });
    }

    ['mm-speed', 'mm-vol', 'mm-pitch'].forEach(id => {
        $(id)?.addEventListener('input', () => { updateSlider($(id)); updateSliderLabels(); });
    });

    restoreMiniMax();

    $('mm-save-btn')?.addEventListener('click', () => {
        const cfg = {
            groupId: $('mm-group-id')?.value.trim() || '',
            apiKey: $('mm-api-key')?.value.trim() || '',
            voiceId: $('mm-voice-id')?.value.trim() || '',
            lang: getActiveLang(),
            speed: parseFloat($('mm-speed')?.value || 1.0),
            vol: parseFloat($('mm-vol')?.value || 1.0),
            pitch: parseFloat($('mm-pitch')?.value || 0),
        };
        localStorage.setItem('sim_minimax_cfg', JSON.stringify(cfg));
        toast('语音配置已保存 ✓', 'ok');
    });

    /* ── 试听 ── */
    let currentAudio = null;
    const playBtn = $('mm-preview-btn'), previewStat = $('mm-preview-status');

    function setPreviewStatus(msg, type = '') {
        if (!previewStat) return;
        previewStat.textContent = msg; previewStat.className = `preview-status ${type}`;
    }

    playBtn?.addEventListener('click', async () => {
        if (currentAudio) {
            currentAudio.pause(); currentAudio = null;
            playBtn.classList.remove('playing'); playBtn.innerHTML = playIcon();
            setPreviewStatus(''); return;
        }
        const cfg = getMiniMaxCfg();
        const groupId = $('mm-group-id')?.value.trim() || cfg.groupId || '';
        const apiKey = $('mm-api-key')?.value.trim() || cfg.apiKey || '';
        const voiceId = $('mm-voice-id')?.value.trim() || cfg.voiceId || 'female-tianmei';
        const text = $('mm-preview-text')?.value.trim();
        const lang = getActiveLang();
        const speed = parseFloat($('mm-speed')?.value || 1.0);
        const vol = parseFloat($('mm-vol')?.value || 1.0);
        const pitch = parseFloat($('mm-pitch')?.value || 0);
        if (!groupId || !apiKey) { setPreviewStatus('请先填写 Group ID 和 API Key', 'err'); return; }
        if (!text) { setPreviewStatus('请先输入试听文字', 'err'); return; }
        setPreviewStatus('合成中…', 'loading');
        playBtn.classList.add('playing'); playBtn.innerHTML = stopIcon();
        try {
            const res = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'speech-01-turbo', text, stream: false,
                    voice_setting: { voice_id: voiceId, speed, vol, pitch: Math.round(pitch) },
                    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
                    language_boost: lang === 'zh' ? 'zh' : lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' :
                        lang === 'en' ? 'en' : lang === 'fr' ? 'fr' : lang === 'de' ? 'de' :
                            lang === 'es' ? 'es' : lang === 'ar' ? 'ar' : 'zh',
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const audioHex = data?.data?.audio;
            if (!audioHex) throw new Error('未获取到音频数据');
            const bytes = new Uint8Array(audioHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            currentAudio = new Audio(url); currentAudio.play();
            setPreviewStatus('播放中 ♪', 'ok');
            currentAudio.addEventListener('ended', () => {
                currentAudio = null; playBtn.classList.remove('playing'); playBtn.innerHTML = playIcon();
                setPreviewStatus('播放完毕', 'ok'); URL.revokeObjectURL(url);
            });
        } catch (e) {
            currentAudio = null; playBtn.classList.remove('playing'); playBtn.innerHTML = playIcon();
            setPreviewStatus(`合成失败：${e.message}`, 'err');
        }
    });

    function playIcon() { return `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`; }
    function stopIcon() {
        return `<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
    }

    /* ════════════════════════════════════════
       6. 屏幕调整
       ════════════════════════════════════════ */
    const FILTERS = {
        none: '', vintage: 'sepia(0.45) saturate(0.8) brightness(0.95) hue-rotate(-8deg)',
        dopamine: 'saturate(1.6) brightness(1.05) hue-rotate(10deg) contrast(1.05)',
        cream: 'sepia(0.18) saturate(0.85) brightness(1.06)',
        cool: 'hue-rotate(15deg) saturate(0.85) brightness(1.02)',
        mono: 'grayscale(1) contrast(1.05) brightness(0.98)',
        rosy: 'hue-rotate(-15deg) saturate(1.1) brightness(1.03)',
        forest: 'hue-rotate(30deg) saturate(0.9) brightness(0.97)',
        sunset: 'hue-rotate(-25deg) saturate(1.2) brightness(1.0)',
    };

    const phoneScreen = document.querySelector('.phone-screen');

    function applyFilter(name) {
        if (phoneScreen) phoneScreen.style.filter = FILTERS[name] || '';
    }

    function getScreenCfg() { return JSON.parse(localStorage.getItem('sim_screen_cfg') || '{}'); }

    function initFilterChips() {
        const chips = document.querySelectorAll('.filter-chip');
        const saved = getScreenCfg().filter || 'none';
        applyFilter(saved);
        chips.forEach(chip => {
            if (chip.dataset.filter === saved) chip.classList.add('active');
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                applyFilter(chip.dataset.filter);
            });
        });
    }
    initFilterChips();

    const phoneShell = document.querySelector('.phone-shell');
    let offsetX = 0, offsetY = 0;

    function applyOffset(x, y) {
        offsetX = x; offsetY = y;
        if (phoneShell) phoneShell.style.transform = `translate(${x}px,${y}px)`;
        const disp = $('pos-offset-display');
        if (disp) disp.textContent = `X: ${x}px  Y: ${y}px`;
    }

    function initPositionPad() {
        const cfg = getScreenCfg();
        applyOffset(cfg.offsetX || 0, cfg.offsetY || 0);
        const STEP = 4;
        ({
            'pos-up': () => applyOffset(offsetX, offsetY - STEP),
            'pos-down': () => applyOffset(offsetX, offsetY + STEP),
            'pos-left': () => applyOffset(offsetX - STEP, offsetY),
            'pos-right': () => applyOffset(offsetX + STEP, offsetY),
        });
        ['pos-up', 'pos-down', 'pos-left', 'pos-right'].forEach(id => {
            const dir = {
                'pos-up': [0, -STEP], 'pos-down': [0, STEP],
                'pos-left': [-STEP, 0], 'pos-right': [STEP, 0],
            }[id];
            $(id)?.addEventListener('click', () => applyOffset(offsetX + dir[0], offsetY + dir[1]));
        });
        $('pos-reset')?.addEventListener('click', () => applyOffset(0, 0));
    }
    initPositionPad();

    const statusBar = document.querySelector('.status-bar');

    function applyStatusBarHide(hidden) {
        if (!statusBar) return;
        statusBar.style.opacity = hidden ? '0' : '';
        statusBar.style.pointerEvents = hidden ? 'none' : '';
        statusBar.style.height = hidden ? '0' : '';
        statusBar.style.overflow = hidden ? 'hidden' : '';
    }

    function initStatusBarToggle() {
        const toggle = $('toggle-statusbar'); if (!toggle) return;
        const hidden = !!getScreenCfg().hideStatusBar;
        if (hidden) toggle.classList.add('on');
        applyStatusBarHide(hidden);
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('on');
            applyStatusBarHide(toggle.classList.contains('on'));
        });
    }
    initStatusBarToggle();

    $('screen-save-btn')?.addEventListener('click', () => {
        const activeChip = document.querySelector('.filter-chip.active');
        const cfg = {
            filter: activeChip?.dataset.filter || 'none',
            offsetX, offsetY,
            hideStatusBar: !!$('toggle-statusbar')?.classList.contains('on'),
        };
        localStorage.setItem('sim_screen_cfg', JSON.stringify(cfg));
        toast('屏幕设置已保存 ✓', 'ok');
    });

    (() => {
        const cfg = getScreenCfg();
        applyFilter(cfg.filter || 'none');
        applyOffset(cfg.offsetX || 0, cfg.offsetY || 0);
        applyStatusBarHide(!!cfg.hideStatusBar);
    })();

    /* ════════════════════════════════════════
       7. 壁纸更换
       ════════════════════════════════════════ */
    const wpLayer = $('wpLayer');
    const wpOverlay = $('wpOverlay');

    /* 壁纸存储：用 IndexedDB 存原图 Blob，不走 localStorage */
    const WP_DB_NAME = 'sim_wp_db';
    let wpDB = null;

    function openWpDB() {
        return new Promise((resolve, reject) => {
            if (wpDB) { resolve(wpDB); return; }
            const req = indexedDB.open(WP_DB_NAME, 1);
            req.onupgradeneeded = e => {
                e.target.result.createObjectStore('wp', { keyPath: 'key' });
            };
            req.onsuccess = e => { wpDB = e.target.result; resolve(wpDB); };
            req.onerror = e => reject(e);
        });
    }

    async function saveWpBlob(blob) {
        const db = await openWpDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wp', 'readwrite');
            const store = tx.objectStore('wp');
            store.put({ key: 'wallpaper', blob });
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    }

    async function loadWpBlob() {
        const db = await openWpDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wp', 'readonly');
            const store = tx.objectStore('wp');
            const req = store.get('wallpaper');
            req.onsuccess = e => resolve(e.target.result?.blob || null);
            req.onerror = reject;
        });
    }

    async function clearWpBlob() {
        const db = await openWpDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wp', 'readwrite');
            const store = tx.objectStore('wp');
            store.delete('wallpaper');
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    }

    /* 当前壁纸 ObjectURL（避免内存泄漏） */
    let currentWpUrl = null;

    function applyWpStyle(cfg) {
        if (!wpLayer || !wpOverlay) return;
        const opacity = (cfg.opacity ?? 100) / 100;
        const blur = cfg.blur ?? 0;
        const frost = (cfg.frost ?? 0) / 100;
        const bright = (cfg.bright ?? 100) / 100;
        const sat = (cfg.sat ?? 100) / 100;

        /* 主图层：filter 控制模糊/亮度/饱和，opacity 控制不透明度 */
        wpLayer.style.opacity = String(opacity);
        wpLayer.style.filter = `blur(${blur}px) brightness(${bright}) saturate(${sat})`;

        /* 毛玻璃叠层：白色遮罩 + backdrop-filter */
        if (frost > 0) {
            wpOverlay.style.background = `rgba(255,255,255,${frost * 0.6})`;
            wpOverlay.style.backdropFilter = `blur(${Math.round(frost * 12)}px)`;
            wpOverlay.style.webkitBackdropFilter = `blur(${Math.round(frost * 12)}px)`;
        } else {
            wpOverlay.style.background = 'transparent';
            wpOverlay.style.backdropFilter = 'none';
            wpOverlay.style.webkitBackdropFilter = 'none';
        }
    }

    function applyWpImage(url) {
        if (!wpLayer) return;
        if (url) {
            wpLayer.style.backgroundImage = `url(${url})`;
        } else {
            wpLayer.style.backgroundImage = 'none';
        }
    }

    function getWpCfg() { return JSON.parse(localStorage.getItem('sim_wp_cfg') || '{}'); }

    /* 滑块联动：壁纸页 */
    const WP_SLIDERS = [
        { id: 'wp-opacity', valId: 'wp-opacity-val', unit: '%', def: 100 },
        { id: 'wp-blur', valId: 'wp-blur-val', unit: 'px', def: 0 },
        { id: 'wp-frost', valId: 'wp-frost-val', unit: '%', def: 0 },
        { id: 'wp-bright', valId: 'wp-bright-val', unit: '%', def: 100 },
        { id: 'wp-sat', valId: 'wp-sat-val', unit: '%', def: 100 },
    ];

    function updateWpSlider(inp) {
        const min = parseFloat(inp.min), max = parseFloat(inp.max), val = parseFloat(inp.value);
        inp.style.setProperty('--pct', `${((val - min) / (max - min) * 100).toFixed(1)}%`);
    }

    function restoreWpSliders() {
        const cfg = getWpCfg();
        WP_SLIDERS.forEach(({ id, valId, unit, def }) => {
            const inp = $(id), disp = $(valId);
            if (!inp) return;
            inp.value = cfg[id.replace('wp-', '')] ?? def;
            updateWpSlider(inp);
            if (disp) disp.textContent = inp.value + unit;
        });
        applyWpStyle({
            opacity: parseFloat($('wp-opacity')?.value || 100),
            blur: parseFloat($('wp-blur')?.value || 0),
            frost: parseFloat($('wp-frost')?.value || 0),
            bright: parseFloat($('wp-bright')?.value || 100),
            sat: parseFloat($('wp-sat')?.value || 100),
        });
    }

    WP_SLIDERS.forEach(({ id, valId, unit }) => {
        const inp = $(id); if (!inp) return;
        inp.addEventListener('input', () => {
            updateWpSlider(inp);
            const disp = $(valId);
            if (disp) disp.textContent = inp.value + unit;
            applyWpStyle({
                opacity: parseFloat($('wp-opacity')?.value || 100),
                blur: parseFloat($('wp-blur')?.value || 0),
                frost: parseFloat($('wp-frost')?.value || 0),
                bright: parseFloat($('wp-bright')?.value || 100),
                sat: parseFloat($('wp-sat')?.value || 100),
            });
        });
    });

    /* 选图 */
    $('wp-file-input')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        /* 释放旧 URL */
        if (currentWpUrl) { URL.revokeObjectURL(currentWpUrl); currentWpUrl = null; }
        /* 存 IndexedDB */
        await saveWpBlob(file);
        currentWpUrl = URL.createObjectURL(file);
        applyWpImage(currentWpUrl);
        /* 更新缩略图 */
        const thumb = $('wpThumb');
        if (thumb) {
            thumb.style.backgroundImage = `url(${currentWpUrl})`;
            thumb.innerHTML = '';
        }
        toast('壁纸已设置', 'ok');
        /* 清空 input，防止相同文件无法再选 */
        e.target.value = '';
    });

    /* 清除壁纸 */
    $('wp-clear-btn')?.addEventListener('click', async () => {
        await clearWpBlob();
        if (currentWpUrl) { URL.revokeObjectURL(currentWpUrl); currentWpUrl = null; }
        applyWpImage(null);
        const thumb = $('wpThumb');
        if (thumb) {
            thumb.style.backgroundImage = '';
            thumb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>未设置</span>`;
        }
        toast('壁纸已清除');
    });

    /* 保存壁纸配置 */
    $('wp-save-btn')?.addEventListener('click', () => {
        const cfg = {
            opacity: parseFloat($('wp-opacity')?.value || 100),
            blur: parseFloat($('wp-blur')?.value || 0),
            frost: parseFloat($('wp-frost')?.value || 0),
            bright: parseFloat($('wp-bright')?.value || 100),
            sat: parseFloat($('wp-sat')?.value || 100),
            weather: document.querySelector('.weather-chip.active')?.dataset.weather || 'none',
            wDensity: parseInt($('weather-density')?.value || 2),
        };
        localStorage.setItem('sim_wp_cfg', JSON.stringify(cfg));
        initWeather(cfg.weather, cfg.wDensity);
        toast('壁纸设置已保存 ✓', 'ok');
    });

    /* 页面加载恢复壁纸 */
    (async () => {
        const cfg = getWpCfg();
        restoreWpSliders();
        try {
            const blob = await loadWpBlob();
            if (blob) {
                currentWpUrl = URL.createObjectURL(blob);
                applyWpImage(currentWpUrl);
                const thumb = $('wpThumb');
                if (thumb) { thumb.style.backgroundImage = `url(${currentWpUrl})`; thumb.innerHTML = ''; }
            }
        } catch (e) { /* IndexedDB 不可用则跳过 */ }
        applyWpStyle(cfg);
        initWeather(cfg.weather || 'none', cfg.wDensity || 2);
    })();

    /* ════════════════════════════════════════
       8. 天气动效（Canvas 粒子）
       ════════════════════════════════════════ */
    const weatherCanvas = $('weatherCanvas');
    let weatherCtx = null;
    let weatherRAF = null;
    let weatherType = 'none';

    if (weatherCanvas) {
        weatherCtx = weatherCanvas.getContext('2d');
        /* canvas 尺寸跟随容器 */
        function resizeCanvas() {
            const parent = weatherCanvas.parentElement;
            weatherCanvas.width = parent.clientWidth || 390;
            weatherCanvas.height = parent.clientHeight || 844;
        }
        resizeCanvas();
        new ResizeObserver(resizeCanvas).observe(weatherCanvas.parentElement);
    }

    /* 天气芯片选择 */
    document.querySelectorAll('.weather-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const density = parseInt($('weather-density')?.value || 2);
            initWeather(chip.dataset.weather, density);
        });
    });

    /* 密度滑块 */
    $('weather-density')?.addEventListener('input', e => {
        const map = { 1: '少', 2: '中', 3: '多' };
        const v = $('weather-density-val');
        if (v) v.textContent = map[e.target.value] || '中';
        updateWpSlider(e.target);
        const active = document.querySelector('.weather-chip.active');
        if (active) initWeather(active.dataset.weather, parseInt(e.target.value));
    });

    /* 粒子池 */
    function initWeather(type, density = 2) {
        weatherType = type;
        if (weatherRAF) { cancelAnimationFrame(weatherRAF); weatherRAF = null; }
        if (!weatherCtx) return;
        weatherCtx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
        if (type === 'none') return;

        const W = weatherCanvas.width, H = weatherCanvas.height;
        const COUNT = { rain: 120, heavyrain: 220, snow: 80, fog: 5, thunder: 0, wind: 60, sakura: 50, stars: 100 }[type] || 80;
        const n = Math.round(COUNT * (density / 2));
        const particles = [];

        function mkParticle() {
            const p = { x: Math.random() * W, y: Math.random() * H, life: 1 };
            switch (type) {
                case 'rain':
                case 'heavyrain':
                    p.x = Math.random() * W; p.y = -20;
                    p.len = type === 'heavyrain' ? 18 + Math.random() * 10 : 10 + Math.random() * 8;
                    p.speed = type === 'heavyrain' ? 14 + Math.random() * 6 : 8 + Math.random() * 5;
                    p.alpha = 0.3 + Math.random() * 0.4;
                    break;
                case 'snow':
                    p.x = Math.random() * W; p.y = -10;
                    p.r = 2 + Math.random() * 3;
                    p.speed = 1 + Math.random() * 1.5;
                    p.drift = (Math.random() - 0.5) * 0.6;
                    p.alpha = 0.5 + Math.random() * 0.5;
                    break;
                case 'fog':
                    p.x = Math.random() * W; p.y = Math.random() * H;
                    p.r = 60 + Math.random() * 120;
                    p.speed = 0.15 + Math.random() * 0.15;
                    p.alpha = 0.04 + Math.random() * 0.06;
                    break;
                case 'wind':
                    p.x = -30; p.y = Math.random() * H;
                    p.len = 20 + Math.random() * 30;
                    p.speed = 6 + Math.random() * 6;
                    p.alpha = 0.15 + Math.random() * 0.2;
                    break;
                case 'sakura':
                    p.x = Math.random() * W; p.y = -20;
                    p.r = 3 + Math.random() * 4;
                    p.speed = 1 + Math.random() * 1.5;
                    p.drift = (Math.random() - 0.5) * 1.2;
                    p.rot = Math.random() * Math.PI * 2;
                    p.rotS = (Math.random() - 0.5) * 0.05;
                    p.alpha = 0.5 + Math.random() * 0.5;
                    p.hue = 340 + Math.random() * 20;
                    break;
                case 'stars':
                    p.x = Math.random() * W; p.y = Math.random() * H;
                    p.r = 0.5 + Math.random() * 1.5;
                    p.alpha = Math.random();
                    p.dir = Math.random() < 0.5 ? 1 : -1;
                    p.speed = 0.005 + Math.random() * 0.008;
                    break;
                case 'thunder':
                    p.active = false; p.timer = Math.random() * 80;
                    p.x1 = Math.random() * W; p.y1 = 0;
                    p.x2 = p.x1 + (Math.random() - 0.5) * 80; p.y2 = H * 0.6 + Math.random() * H * 0.3;
                    p.alpha = 0;
                    break;
            }
            return p;
        }

        for (let i = 0; i < n; i++) {
            const p = mkParticle();
            /* 雨雪让初始 y 随机分布在屏幕内 */
            if (['rain', 'heavyrain', 'snow', 'sakura'].includes(type)) p.y = Math.random() * H;
            particles.push(p);
        }

        /* 雷暴额外加背景闪光 */
        let flashAlpha = 0;

        function draw() {
            weatherCtx.clearRect(0, 0, W, H);

            if (type === 'thunder' && flashAlpha > 0) {
                weatherCtx.fillStyle = `rgba(255,255,230,${flashAlpha})`;
                weatherCtx.fillRect(0, 0, W, H);
                flashAlpha = Math.max(0, flashAlpha - 0.05);
            }

            particles.forEach(p => {
                switch (type) {
                    case 'rain': case 'heavyrain':
                        weatherCtx.save();
                        weatherCtx.strokeStyle = `rgba(180,210,240,${p.alpha})`;
                        weatherCtx.lineWidth = type === 'heavyrain' ? 1.5 : 1;
                        weatherCtx.beginPath();
                        weatherCtx.moveTo(p.x, p.y);
                        weatherCtx.lineTo(p.x - 2, p.y + p.len);
                        weatherCtx.stroke();
                        weatherCtx.restore();
                        p.y += p.speed;
                        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
                        break;

                    case 'snow':
                        weatherCtx.save();
                        weatherCtx.globalAlpha = p.alpha;
                        weatherCtx.fillStyle = '#fff';
                        weatherCtx.beginPath();
                        weatherCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        weatherCtx.fill();
                        weatherCtx.restore();
                        p.y += p.speed; p.x += p.drift;
                        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
                        break;

                    case 'fog':
                        weatherCtx.save();
                        const grad = weatherCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                        grad.addColorStop(0, `rgba(220,220,220,${p.alpha})`);
                        grad.addColorStop(1, 'rgba(220,220,220,0)');
                        weatherCtx.fillStyle = grad;
                        weatherCtx.beginPath();
                        weatherCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        weatherCtx.fill();
                        weatherCtx.restore();
                        p.x += p.speed;
                        if (p.x > W + p.r) { p.x = -p.r; p.y = Math.random() * H; }
                        break;

                    case 'wind':
                        weatherCtx.save();
                        weatherCtx.strokeStyle = `rgba(200,200,200,${p.alpha})`;
                        weatherCtx.lineWidth = 0.8;
                        weatherCtx.beginPath();
                        weatherCtx.moveTo(p.x, p.y);
                        weatherCtx.lineTo(p.x + p.len, p.y + 2 * (Math.random() - 0.5));
                        weatherCtx.stroke();
                        weatherCtx.restore();
                        p.x += p.speed;
                        if (p.x > W + 40) { p.x = -30; p.y = Math.random() * H; }
                        break;

                    case 'sakura':
                        weatherCtx.save();
                        weatherCtx.globalAlpha = p.alpha;
                        weatherCtx.translate(p.x, p.y);
                        weatherCtx.rotate(p.rot);
                        /* 简单五瓣花 */
                        for (let i = 0; i < 5; i++) {
                            weatherCtx.save();
                            weatherCtx.rotate(i * Math.PI * 2 / 5);
                            weatherCtx.fillStyle = `hsl(${p.hue},60%,80%)`;
                            weatherCtx.beginPath();
                            weatherCtx.ellipse(0, -p.r, p.r * 0.6, p.r, 0, 0, Math.PI * 2);
                            weatherCtx.fill();
                            weatherCtx.restore();
                        }
                        weatherCtx.restore();
                        p.y += p.speed; p.x += p.drift; p.rot += p.rotS;
                        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
                        break;

                    case 'stars':
                        weatherCtx.save();
                        weatherCtx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
                        weatherCtx.fillStyle = '#fff';
                        weatherCtx.beginPath();
                        weatherCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        weatherCtx.fill();
                        weatherCtx.restore();
                        p.alpha += p.speed * p.dir;
                        if (p.alpha > 1 || p.alpha < 0) p.dir *= -1;
                        break;

                    case 'thunder':
                        p.timer--;
                        if (p.timer <= 0) {
                            p.active = true; p.alpha = 0.9;
                            p.timer = 60 + Math.random() * 120;
                            p.x1 = Math.random() * W; p.y1 = 0;
                            p.x2 = p.x1 + (Math.random() - 0.5) * 80;
                            p.y2 = H * 0.4 + Math.random() * H * 0.4;
                            flashAlpha = 0.25;
                        }
                        if (p.active && p.alpha > 0) {
                            weatherCtx.save();
                            weatherCtx.strokeStyle = `rgba(255,255,180,${p.alpha})`;
                            weatherCtx.lineWidth = 2;
                            weatherCtx.shadowColor = 'rgba(255,255,100,0.8)';
                            weatherCtx.shadowBlur = 10;
                            weatherCtx.beginPath();
                            const mx = (p.x1 + p.x2) / 2 + (Math.random() - 0.5) * 20;
                            const my = (p.y1 + p.y2) / 2;
                            weatherCtx.moveTo(p.x1, p.y1);
                            weatherCtx.lineTo(mx, my);
                            weatherCtx.lineTo(p.x2, p.y2);
                            weatherCtx.stroke();
                            weatherCtx.restore();
                            p.alpha -= 0.06;
                            if (p.alpha <= 0) p.active = false;
                        }
                        break;
                }
            });

            weatherRAF = requestAnimationFrame(draw);
        }
        draw();
    }

    /* 恢复天气芯片选中状态 */
    function restoreWeatherChip(type) {
        document.querySelectorAll('.weather-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.weather === type);
        });
        const d = getWpCfg().wDensity || 2;
        const dinp = $('weather-density');
        if (dinp) { dinp.value = d; updateWpSlider(dinp); }
        const dv = $('weather-density-val');
        if (dv) dv.textContent = { 1: '少', 2: '中', 3: '多' }[d] || '中';
    }

    /* ════════════════════════════════════════
       9. 字体更换
       ════════════════════════════════════════ */
    const FONTS = [
        { id: 'system', name: '系统默认', css: '', sample: '幸好爱是奇迹' },
        { id: 'serif', name: '衬线宋体', css: "'Noto Serif SC',serif", sample: '文字之美' },
        { id: 'mono', name: '等宽代码体', css: "'JetBrains Mono','Courier New',monospace", sample: 'code & love' },
        { id: 'rounded', name: '圆润可爱体', css: "'Varela Round','Arial Rounded MT Bold',sans-serif", sample: '软糯圆润' },
        { id: 'elegant', name: '优雅细体', css: "'Raleway','Helvetica Neue',sans-serif", sample: 'elegant · 轻盈' },
        { id: 'hand', name: '手写涂鸦体', css: "'Caveat','Dancing Script',cursive", sample: '手写风格 ♡' },
        { id: 'display', name: '大标题展示体', css: "'Playfair Display','Georgia',serif", sample: 'Display Style' },
    ];

    const FONT_CSS_URLS = {
        'serif': 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC&display=swap',
        'rounded': 'https://fonts.googleapis.com/css2?family=Varela+Round&display=swap',
        'elegant': 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400&display=swap',
        'hand': 'https://fonts.googleapis.com/css2?family=Caveat&display=swap',
        'display': 'https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap',
        'mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap',
    };

    function loadGoogleFont(id) {
        if (!FONT_CSS_URLS[id]) return;
        if (document.querySelector(`link[data-font="${id}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = FONT_CSS_URLS[id];
        link.dataset.font = id;
        document.head.appendChild(link);
    }

    function applyFont(css) {
        document.documentElement.style.setProperty('--font-main', css || '');
        const ps = document.querySelector('.phone-screen');
        if (ps) ps.style.fontFamily = css || '';
    }

    function getFontCfg() { return localStorage.getItem('sim_font_id') || 'system'; }

    function renderFontList() {
        const container = $('font-list'); if (!container) return;
        const active = getFontCfg();
        container.innerHTML = '';
        FONTS.forEach(f => {
            const item = document.createElement('div');
            item.className = `font-item${f.id === active ? ' active' : ''}`;
            item.innerHTML = `
                <div class="font-item-dot"></div>
                <div class="font-item-info">
                    <div class="font-item-name" style="font-family:${f.css || 'inherit'}">${f.name}</div>
                    <div class="font-item-sample" style="font-family:${f.css || 'inherit'}">${f.sample}</div>
                </div>`;
            item.addEventListener('click', () => {
                container.querySelectorAll('.font-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadGoogleFont(f.id);
                const preview = $('font-preview-text');
                if (preview) preview.style.fontFamily = f.css || '';
            });
            container.appendChild(item);
        });
    }
    renderFontList();

    /* 恢复字体 */
    (() => {
        const savedId = getFontCfg();
        const f = FONTS.find(x => x.id === savedId) || FONTS[0];
        loadGoogleFont(f.id);
        applyFont(f.css);
        const preview = $('font-preview-text');
        if (preview) preview.style.fontFamily = f.css || '';
    })();

    $('font-save-btn')?.addEventListener('click', () => {
        const activeItem = document.querySelector('#font-list .font-item.active');
        if (!activeItem) return;
        const idx = [...document.querySelectorAll('#font-list .font-item')].indexOf(activeItem);
        const f = FONTS[idx];
        localStorage.setItem('sim_font_id', f.id);
        loadGoogleFont(f.id);
        applyFont(f.css);
        toast(`字体已切换：${f.name}`, 'ok');
    });

    /* 壁纸页打开时恢复芯片 */
    $('st-goto-wallpaper')?.addEventListener('click', () => {
        const cfg = getWpCfg();
        restoreWeatherChip(cfg.weather || 'none');
    });

});
