/* ================================================
   settings-api.js — API 设置页控制器
   功能：LLM 多模型配置 + MiniMax 语音配置 + 试听
   ================================================ */
const ApiSettings = (() => {

    /* ---- 存储 Key ---- */
    const KEY_MODELS = 'api_models';
    const KEY_ACTIVE = 'api_active_id';
    const KEY_MINIMAX = 'api_minimax';

    /* ---- 试听状态 ---- */
    let _audio = null;   // HTMLAudioElement
    let _playing = false;

    /* ---- 打开 / 关闭 ---- */
    function open() {
        document.getElementById('pageApiSettings').classList.add('page-active');
        _renderModelList();
        _loadMinimaxForm();
        _loadActiveModelForm();
    }

    function close() {
        // 离开页面时停止播放
        _stopPreview();
        document.getElementById('pageApiSettings').classList.remove('page-active');
    }

    /* ---- LLM Key 显隐 ---- */
    function toggleKey() {
        const inp = document.getElementById('apiKey');
        const svg = document.getElementById('apiEyeIcon');
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        svg.innerHTML = show
            ? `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`
            : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4" fill="none"/>`;
    }

    function toggleMmKey() {
        const inp = document.getElementById('mmApiKey');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    }

    /* ---- 拉取模型列表 ---- */
    async function fetchModels() {
        const url = (document.getElementById('apiUrl').value || '').trim();
        const key = (document.getElementById('apiKey').value || '').trim();
        if (!url || !key) {
            _showTestResult('请先填写 API URL 和 API Key', false); return;
        }
        const btn = document.querySelector('.api-fetch-btn');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const endpoint = url.replace(/\/$/, '') + '/models';
            const res = await fetch(endpoint, {
                headers: { 'Authorization': 'Bearer ' + key }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let models = [];
            if (Array.isArray(data.data)) models = data.data.map(m => m.id || m.name || m).filter(Boolean);
            else if (Array.isArray(data.models)) models = data.models.map(m => typeof m === 'string' ? m : (m.name || m.id));
            else if (Array.isArray(data)) models = data.map(m => typeof m === 'string' ? m : (m.name || m.id));

            if (!models.length) throw new Error('未获取到模型列表');

            const sel = document.getElementById('apiModelSelect');
            sel.innerHTML = models.map(m =>
                `<option value="${_esc(m)}">${_esc(m)}</option>`
            ).join('');
            _showTestResult(`已获取 ${models.length} 个模型`, true);
        } catch (e) {
            _showTestResult('拉取失败：' + e.message, false);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    /* ---- 测试 LLM 模型 ---- */
    async function testModel() {
        const url = (document.getElementById('apiUrl').value || '').trim();
        const key = (document.getElementById('apiKey').value || '').trim();
        const model = document.getElementById('apiModelSelect').value;
        if (!url || !key || !model) {
            _showTestResult('请填写完整信息并选择模型', false); return;
        }
        _showTestResult('测试中，请稍候...', null);

        try {
            const endpoint = url.replace(/\/$/, '') + '/chat/completions';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + key
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 8
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err.error?.message) || `HTTP ${res.status}`);
            }
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || '(无回复)';
            _showTestResult(`测试成功  回复：${reply}`, true);
        } catch (e) {
            _showTestResult('测试失败：' + e.message, false);
        }
    }

    /* ---- 保存模型配置 ---- */
    function saveModel() {
        const name = (document.getElementById('apiName').value || '').trim();
        const url = (document.getElementById('apiUrl').value || '').trim();
        const key = (document.getElementById('apiKey').value || '').trim();
        const model = document.getElementById('apiModelSelect').value;
        if (!name || !url || !key || !model) {
            _showTestResult('请填写名称、URL、Key 并选择模型', false); return;
        }

        const models = _getModels();
        const existing = models.find(m => m.name === name);
        if (existing) {
            Object.assign(existing, { url, key, model, updatedAt: Date.now() });
        } else {
            models.push({ id: 'mdl_' + Date.now(), name, url, key, model, createdAt: Date.now() });
        }
        _saveModels(models);
        if (!Storage.get(KEY_ACTIVE)) Storage.set(KEY_ACTIVE, models[models.length - 1].id);

        _renderModelList();
        _showTestResult(`已保存：${name}`, true);
    }

    /* ---- 切换激活模型 ---- */
    function activateModel(id) {
        Storage.set(KEY_ACTIVE, id);
        _renderModelList();
        const m = _getModels().find(x => x.id === id);
        if (m) _fillForm(m);
    }

    /* ---- 删除模型 ---- */
    function deleteModel(id, e) {
        e.stopPropagation();
        if (!confirm('确认删除该模型配置？')) return;
        let models = _getModels().filter(m => m.id !== id);
        _saveModels(models);
        if (Storage.get(KEY_ACTIVE) === id) Storage.set(KEY_ACTIVE, models[0]?.id || '');
        _renderModelList();
    }

    /* ---- 保存 MiniMax 配置 ---- */
    function saveMinimax() {
        const cfg = {
            groupId: (document.getElementById('mmGroupId').value || '').trim(),
            apiKey: (document.getElementById('mmApiKey').value || '').trim(),
            voiceId: (document.getElementById('mmVoiceId').value || '').trim() || 'female-tianmei',
            speed: parseFloat(document.getElementById('mmSpeed').value),
            vol: parseInt(document.getElementById('mmVol').value)
        };
        if (!cfg.groupId || !cfg.apiKey) {
            _showTestResult('请填写 GroupId 和 API Key', false); return;
        }
        Storage.set(KEY_MINIMAX, JSON.stringify(cfg));
        _showTestResult('MiniMax 语音配置已保存', true);
    }

    /* ---- 语音试听 ---- */
    async function previewVoice() {
        // 若正在播放 → 停止
        if (_playing) {
            _stopPreview();
            return;
        }

        const text = (document.getElementById('mmPreviewText').value || '').trim();
        if (!text) {
            _setPreviewResult('请先输入试听文字', 'err'); return;
        }

        // 读取配置
        let cfg = {};
        try { cfg = JSON.parse(Storage.get(KEY_MINIMAX) || '{}'); } catch { }

        if (!cfg.groupId || !cfg.apiKey) {
            _setPreviewResult('请先保存 MiniMax 配置', 'err'); return;
        }

        // 切换到「合成中」状态
        _setPlayState(true, true);
        _setPreviewResult('语音合成中，请稍候...', 'loading');

        try {
            /*
             * MiniMax T2A v2 接口
             * POST https://api.minimax.chat/v1/t2a_v2?GroupId={groupId}
             * Header: Authorization: Bearer {apiKey}
             */
            const endpoint = `https://api.minimax.chat/v1/t2a_v2?GroupId=${encodeURIComponent(cfg.groupId)}`;
            const body = {
                model: 'speech-01-turbo',
                text: text,
                stream: false,
                voice_setting: {
                    voice_id: cfg.voiceId || 'female-tianmei',
                    speed: cfg.speed || 1.0,
                    vol: cfg.vol || 5,
                    pitch: 0
                },
                audio_setting: {
                    sample_rate: 32000,
                    bitrate: 128000,
                    format: 'mp3',
                    channel: 1
                }
            };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.base_resp?.status_msg || `HTTP ${res.status}`);
            }

            const data = await res.json();

            // 取 audio hex 或 base64
            const audioHex = data?.data?.audio;
            const extraInfo = data?.extra_info;

            if (!audioHex) throw new Error('未返回音频数据');

            // hex → Uint8Array → Blob → ObjectURL
            const bytes = _hexToUint8(audioHex);
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);

            // 播放
            _audio = new Audio(audioUrl);
            _audio.play();
            _setPlayState(true, false);
            _setPreviewResult(
                `合成成功  时长约 ${(extraInfo?.audio_length / 1000 || 0).toFixed(1)}s · ${extraInfo?.word_count || text.length} 字`,
                'ok'
            );

            _audio.onended = () => {
                _stopPreview();
                URL.revokeObjectURL(audioUrl);
            };
            _audio.onerror = () => {
                _setPreviewResult('音频播放失败', 'err');
                _setPlayState(false, false);
                _playing = false;
            };

        } catch (e) {
            _setPreviewResult('试听失败：' + e.message, 'err');
            _setPlayState(false, false);
        }
    }

    /* ---- 滑块同步 ---- */
    function updateSlider(sliderId, valId) {
        document.getElementById(valId).textContent =
            parseFloat(document.getElementById(sliderId).value)
                .toFixed(sliderId === 'mmSpeed' ? 1 : 0);
    }

    /* ================================================================
       内部辅助
       ================================================================ */

    /* 停止试听 */
    function _stopPreview() {
        if (_audio) {
            _audio.pause();
            _audio.src = '';
            _audio = null;
        }
        _playing = false;
        _setPlayState(false, false);
    }

    /* 更新播放按钮 & 波形状态
     * playing  : 是否处于「播放」模式（决定按钮颜色/文字/图标）
     * loading  : 是否处于「合成中」加载态（按钮文字变为「合成中」）
     */
    function _setPlayState(playing, loading) {
        _playing = playing && !loading;
        const btn = document.getElementById('mmPlayBtn');
        const icon = document.getElementById('mmPlayIcon');
        const label = document.getElementById('mmPlayLabel');
        const wave = document.getElementById('mmWave');
        if (!btn) return;

        if (loading) {
            btn.classList.add('playing');
            icon.innerHTML = `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="56" stroke-dashoffset="14" style="animation:spin .8s linear infinite;transform-origin:center"/>`;
            label.textContent = '合成中...';
            wave && wave.classList.remove('active');
        } else if (playing) {
            btn.classList.add('playing');
            icon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>`;
            label.textContent = '停止播放';
            wave && wave.classList.add('active');
        } else {
            btn.classList.remove('playing');
            icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>`;
            label.textContent = '播放试听';
            wave && wave.classList.remove('active');
        }
    }

    /* 设置试听结果条 */
    function _setPreviewResult(msg, type) {
        const el = document.getElementById('mmPreviewResult');
        if (!el) return;
        el.textContent = msg;
        el.className = `mm-preview-result show ${type}`;
    }

    /* hex 字符串 → Uint8Array */
    function _hexToUint8(hex) {
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < arr.length; i++) {
            arr[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return arr;
    }

    function _getModels() {
        try { return JSON.parse(Storage.get(KEY_MODELS) || '[]'); }
        catch { return []; }
    }

    function _saveModels(arr) {
        Storage.set(KEY_MODELS, JSON.stringify(arr));
    }

    function _renderModelList() {
        const models = _getModels();
        const activeId = Storage.get(KEY_ACTIVE) || '';
        const list = document.getElementById('apiModelList');
        const count = document.getElementById('apiModelCount');
        if (!list) return;

        count.textContent = models.length;

        if (!models.length) {
            list.innerHTML = `<div class="api-model-empty">暂无已保存的模型配置</div>`;
            return;
        }

        list.innerHTML = models.map(m => `
            <div class="api-model-card ${m.id === activeId ? 'active' : ''}"
                 onclick="ApiSettings.activateModel('${m.id}')">
                <div class="api-model-card-info">
                    <div class="api-model-card-name">${_esc(m.name)}</div>
                    <div class="api-model-card-url">${_esc(m.url)}</div>
                    <span class="api-model-card-model">${_esc(m.model)}</span>
                </div>
                <div class="api-model-card-active-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <button class="api-model-card-del" onclick="ApiSettings.deleteModel('${m.id}', event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    function _loadActiveModelForm() {
        const activeId = Storage.get(KEY_ACTIVE) || '';
        const models = _getModels();
        const m = models.find(x => x.id === activeId) || models[0];
        if (m) _fillForm(m);
    }

    function _fillForm(m) {
        document.getElementById('apiName').value = m.name || '';
        document.getElementById('apiUrl').value = m.url || '';
        document.getElementById('apiKey').value = m.key || '';
        const sel = document.getElementById('apiModelSelect');
        if (m.model) {
            let found = false;
            for (let opt of sel.options) {
                if (opt.value === m.model) { opt.selected = true; found = true; break; }
            }
            if (!found) {
                const opt = new Option(m.model, m.model, true, true);
                sel.insertBefore(opt, sel.firstChild);
            }
        }
    }

    function _loadMinimaxForm() {
        try {
            const cfg = JSON.parse(Storage.get(KEY_MINIMAX) || '{}');
            if (cfg.groupId) document.getElementById('mmGroupId').value = cfg.groupId;
            if (cfg.apiKey) document.getElementById('mmApiKey').value = cfg.apiKey;
            if (cfg.voiceId) document.getElementById('mmVoiceId').value = cfg.voiceId;
            if (cfg.speed) {
                document.getElementById('mmSpeed').value = cfg.speed;
                document.getElementById('mmSpeedVal').textContent = parseFloat(cfg.speed).toFixed(1);
            }
            if (cfg.vol) {
                document.getElementById('mmVol').value = cfg.vol;
                document.getElementById('mmVolVal').textContent = cfg.vol;
            }
        } catch { }
    }

    function _showTestResult(msg, ok) {
        const el = document.getElementById('apiTestResult');
        if (!el) return;
        el.textContent = msg;
        el.className = 'api-test-result show ' + (ok === true ? 'ok' : ok === false ? 'err' : '');
    }

    function _esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    return {
        open, close,
        toggleKey, toggleMmKey,
        fetchModels, testModel, saveModel,
        activateModel, deleteModel,
        saveMinimax, updateSlider,
        previewVoice   // ← 新增暴露
    };
})();
