/* ============================================
   settings.js — 设置系统完整逻辑 v3
   · 设置主页 · API配置 · 模型列表
   · MiniMax 语音（语音ID / 语言 / 滑块 / 试听）
   · 屏幕调整（色调滤镜 / 位置偏移 / 状态栏开关 / 系统栏颜色）
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ── 工具 ── */
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
    ['st-goto-wallpaper', 'st-goto-appicon', 'st-goto-data'].forEach(id => {
        $(id)?.addEventListener('click', () => toast('该模块开发中 ·˖✧'));
    });

    /* ════════════════════════════════════════
       2. 子页返回
       ════════════════════════════════════════ */
    $('api-back')?.addEventListener('click', () => { $('api-settings-page')?.classList.remove('open'); });
    $('screen-back')?.addEventListener('click', () => { $('screen-settings-page')?.classList.remove('open'); });

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

    /* 语言列表（无emoji） */
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
        const sliders = [
            { id: 'mm-speed', def: 1.0 },
            { id: 'mm-vol', def: 1.0 },
            { id: 'mm-pitch', def: 0 },
        ];
        sliders.forEach(({ id, def }) => {
            const inp = $(id);
            if (!inp) return;
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
        previewStat.textContent = msg;
        previewStat.className = `preview-status ${type}`;
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
            currentAudio = new Audio(url);
            currentAudio.play();
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

    /* ── 6a. 色调滤镜 ── */
    const FILTERS = {
        none: '',
        vintage: 'sepia(0.45) saturate(0.8) brightness(0.95) hue-rotate(-8deg)',
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
        const f = FILTERS[name] || '';
        if (phoneScreen) phoneScreen.style.filter = f;
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

    /* ── 6b. 屏幕位置偏移 ── */
    const phoneShell = document.querySelector('.phone-shell');
    let offsetX = 0, offsetY = 0;

    function applyOffset(x, y) {
        offsetX = x; offsetY = y;
        if (phoneShell) phoneShell.style.transform = `translate(${x}px, ${y}px)`;
        const disp = $('pos-offset-display');
        if (disp) disp.textContent = `X: ${x}px  Y: ${y}px`;
    }

    function initPositionPad() {
        const cfg = getScreenCfg();
        applyOffset(cfg.offsetX || 0, cfg.offsetY || 0);

        const STEP = 4;
        const btnMap = {
            'pos-up': () => applyOffset(offsetX, offsetY - STEP),
            'pos-down': () => applyOffset(offsetX, offsetY + STEP),
            'pos-left': () => applyOffset(offsetX - STEP, offsetY),
            'pos-right': () => applyOffset(offsetX + STEP, offsetY),
        };
        Object.entries(btnMap).forEach(([id, fn]) => {
            $(id)?.addEventListener('click', fn);
        });
        $('pos-reset')?.addEventListener('click', () => applyOffset(0, 0));
    }
    initPositionPad();

    /* ── 6c. 状态栏隐藏开关 ── */
    const statusBar = document.querySelector('.status-bar');

    function applyStatusBarHide(hidden) {
        if (!statusBar) return;
        statusBar.style.opacity = hidden ? '0' : '';
        statusBar.style.pointerEvents = hidden ? 'none' : '';
        statusBar.style.height = hidden ? '0' : '';
        statusBar.style.overflow = hidden ? 'hidden' : '';
    }

    function initStatusBarToggle() {
        const toggle = $('toggle-statusbar');
        if (!toggle) return;
        const cfg = getScreenCfg();
        const hidden = !!cfg.hideStatusBar;
        if (hidden) toggle.classList.add('on');
        applyStatusBarHide(hidden);
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('on');
            applyStatusBarHide(toggle.classList.contains('on'));
        });
    }
    initStatusBarToggle();

    /* ── 6e. 屏幕调整保存 ── */
    $('screen-save-btn')?.addEventListener('click', () => {
        const activeChip = document.querySelector('.filter-chip.active');
        const cfg = {
            filter: activeChip?.dataset.filter || 'none',
            offsetX,
            offsetY,
            hideStatusBar: !!$('toggle-statusbar')?.classList.contains('on'),
        };
        localStorage.setItem('sim_screen_cfg', JSON.stringify(cfg));
        toast('屏幕设置已保存 ✓', 'ok');
    });

    /* ── 页面加载时也恢复屏幕设置 ── */
    (() => {
        const cfg = getScreenCfg();
        applyFilter(cfg.filter || 'none');
        applyOffset(cfg.offsetX || 0, cfg.offsetY || 0);
        applyStatusBarHide(!!cfg.hideStatusBar);
    })();

});
