/* ================================================
   settings-screen.js — 屏幕调整页控制器
   功能：
     ① 色调滤镜：10款预设 + brightness/contrast/saturate/hue/blur 微调
     ② 屏幕位置：D-Pad + 精细滑块偏移 + 缩放
     ③ 状态栏：显隐开关 + 文字颜色（dark/light）+ 系统 theme-color
   ================================================ */
const ScreenSettings = (() => {

    /* ---- 存储 Key ---- */
    const KEY = 'screen_settings';

    /* ---- 预设滤镜参数表 ---- */
    const PRESETS = {
        none: { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0 },
        vintage: { brightness: 90, contrast: 95, saturate: 70, hue: 15, blur: 0 },
        dopamine: { brightness: 105, contrast: 110, saturate: 200, hue: 0, blur: 0 },
        cream: { brightness: 105, contrast: 92, saturate: 60, hue: 8, blur: 0 },
        cyber: { brightness: 95, contrast: 130, saturate: 150, hue: -30, blur: 0 },
        film: { brightness: 88, contrast: 108, saturate: 65, hue: 12, blur: 0 },
        cool: { brightness: 102, contrast: 98, saturate: 90, hue: -20, blur: 0 },
        warm: { brightness: 105, contrast: 98, saturate: 110, hue: 18, blur: 0 },
        nature: { brightness: 100, contrast: 100, saturate: 140, hue: 60, blur: 0 },
        mono: { brightness: 100, contrast: 105, saturate: 0, hue: 0, blur: 0 }
    };

    /* ---- 默认状态 ---- */
    const DEFAULT_STATE = {
        preset: 'none',
        brightness: 100,
        contrast: 100,
        saturate: 100,
        hue: 0,
        blur: 0,
        offsetX: 0,
        offsetY: 0,
        scale: 100,
        hideStatus: false,
        statusColor: 'dark',
        themeColor: '#e8eaf0'
    };

    /* 工作状态（运行时） */
    let _state = { ...DEFAULT_STATE };

    /* ---- 打开页面 ---- */
    function open() {
        document.getElementById('pageScreen').classList.add('page-active');
        _syncFormFromState();
    }

    /* ---- 关闭页面 ---- */
    function close() {
        document.getElementById('pageScreen').classList.remove('page-active');
    }

    /* ---- 应用预设 ---- */
    function applyPreset(id) {
        const p = PRESETS[id];
        if (!p) return;
        Object.assign(_state, p, { preset: id });
        _syncFormFromState();
        _applyFilter();
        _saveState();
        // 更新选中卡片
        document.querySelectorAll('.sc-preset-card').forEach(el => {
            el.classList.toggle('sc-preset-active', el.dataset.preset === id);
        });
    }

    /* ---- 滑块变动 → 应用滤镜 ---- */
    function onSlider() {
        _state.brightness = parseInt(document.getElementById('scBrightness').value);
        _state.contrast = parseInt(document.getElementById('scContrast').value);
        _state.saturate = parseInt(document.getElementById('scSaturate').value);
        _state.hue = parseInt(document.getElementById('scHue').value);
        _state.blur = parseFloat(document.getElementById('scBlur').value);
        _state.scale = parseInt(document.getElementById('scScale').value);
        _state.preset = 'custom'; // 手动调整后脱离预设
        _updateSliderLabels();
        _applyFilter();
        _applyTransform();
        _saveState();
        // 取消预设选中
        document.querySelectorAll('.sc-preset-card').forEach(el => el.classList.remove('sc-preset-active'));
    }

    /* ---- D-Pad 微调 ---- */
    function nudge(dx, dy) {
        _state.offsetX = Math.max(-80, Math.min(80, _state.offsetX + dx));
        _state.offsetY = Math.max(-80, Math.min(80, _state.offsetY + dy));
        _syncOffsetDisplay();
        _applyTransform();
        _saveState();
    }

    /* ---- 偏移滑块 ---- */
    function onOffsetSlider() {
        _state.offsetX = parseInt(document.getElementById('scOffsetXSlider').value);
        _state.offsetY = parseInt(document.getElementById('scOffsetYSlider').value);
        _syncOffsetDisplay();
        _applyTransform();
        _saveState();
    }

    /* ---- 归零偏移 ---- */
    function resetOffset() {
        _state.offsetX = 0;
        _state.offsetY = 0;
        _syncFormFromState();
        _applyTransform();
        _saveState();
    }

    /* ---- 状态栏显隐 ---- */
    function toggleStatusBar() {
        _state.hideStatus = !_state.hideStatus;
        _applyStatusBar();
        _saveState();
        // 更新 toggle UI
        const tog = document.getElementById('scStatusBarToggle');
        tog && tog.classList.toggle('on', _state.hideStatus);
    }

    /* ---- 状态栏文字颜色 ---- */
    function setStatusColor(color) {
        _state.statusColor = color;
        _applyStatusColor();
        _saveState();
        // 更新选中态
        document.querySelectorAll('.sc-color-pill').forEach(el => {
            el.classList.toggle('sc-pill-active', el.dataset.color === color);
        });
    }

    /* ---- 系统 theme-color ---- */
    function setThemeColor(hex) {
        _state.themeColor = hex;
        _applyThemeColor(hex);
        _saveState();
        // 更新色块选中
        document.querySelectorAll('.sc-swatch').forEach(el => {
            el.classList.toggle('sc-swatch-active', el.dataset.color === hex);
        });
        // 同步拾色器
        const picker = document.getElementById('scThemeColorPicker');
        if (picker) picker.value = hex;
    }

    /* ---- 重置全部 ---- */
    function resetAll() {
        if (!confirm('重置所有屏幕调整设置？')) return;
        _state = { ...DEFAULT_STATE };
        _applyAll();
        _syncFormFromState();
        _saveState();
        // 清除预设选中，选回 none
        document.querySelectorAll('.sc-preset-card').forEach(el => {
            el.classList.toggle('sc-preset-active', el.dataset.preset === 'none');
        });
    }

    /* ================================================================
       内部应用函数
       ================================================================ */

    /* 应用 CSS filter 到 phone-screen */
    function _applyFilter() {
        const { brightness, contrast, saturate, hue, blur } = _state;
        const f = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg) blur(${blur}px)`;
        document.getElementById('phoneScreen').style.filter = f;
    }

    /* 应用位移 + 缩放到 phone-shell（桌面） / phone-screen（手机全屏） */
    function _applyTransform() {
        const { offsetX, offsetY, scale } = _state;
        const s = scale / 100;
        const shell = document.getElementById('phoneShell');
        const scrn = document.getElementById('phoneScreen');

        // 桌面端移动 shell；手机端 shell 已固定全屏，移动 screen
        const isMobile = window.innerWidth <= 480;
        const target = isMobile ? scrn : shell;

        // 桌面端 shell 本来有 translate(-50%,-50%) 居中，要叠加
        if (!isMobile) {
            target.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${s})`;
        } else {
            target.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${s})`;
            target.style.transformOrigin = 'center center';
        }
    }

    /* 应用状态栏显隐 */
    function _applyStatusBar() {
        const bar = document.getElementById('statusBar');
        if (!bar) return;
        bar.style.opacity = _state.hideStatus ? '0' : '';
        bar.style.height = _state.hideStatus ? '0' : '';
        bar.style.overflow = _state.hideStatus ? 'hidden' : '';
        bar.style.padding = _state.hideStatus ? '0' : '';
        bar.style.transition = 'opacity 0.3s, height 0.3s';
    }

    /* 应用状态栏文字颜色（通过 data 属性让 CSS 变量切换） */
    function _applyStatusColor() {
        const screen = document.getElementById('phoneScreen');
        if (!screen) return;
        if (_state.statusColor === 'light') {
            screen.dataset.statusLight = 'true';
            // 强制状态栏文字白色
            document.getElementById('statusBar').style.color = '#fff';
        } else {
            delete screen.dataset.statusLight;
            document.getElementById('statusBar').style.color = '';
        }
    }

    /* 更新 meta theme-color（影响浏览器/PWA 系统状态栏） */
    function _applyThemeColor(hex) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = hex;
        // 同时改变 body 背景（手机全屏时背景露出）
        document.body.style.background = hex;
    }

    /* 一次性应用所有设置 */
    function _applyAll() {
        _applyFilter();
        _applyTransform();
        _applyStatusBar();
        _applyStatusColor();
        _applyThemeColor(_state.themeColor);

        // 更新预设选中
        document.querySelectorAll('.sc-preset-card').forEach(el => {
            el.classList.toggle('sc-preset-active', el.dataset.preset === _state.preset);
        });
        // 更新 toggle
        const tog = document.getElementById('scStatusBarToggle');
        tog && tog.classList.toggle('on', _state.hideStatus);
        // 更新颜色胶囊
        document.querySelectorAll('.sc-color-pill').forEach(el => {
            el.classList.toggle('sc-pill-active', el.dataset.color === _state.statusColor);
        });
        // 更新色块
        document.querySelectorAll('.sc-swatch').forEach(el => {
            el.classList.toggle('sc-swatch-active', el.dataset.color === _state.themeColor);
        });
    }

    /* ================================================================
       表单同步
       ================================================================ */

    /* state → 表单控件（打开页面时调用） */
    function _syncFormFromState() {
        const { brightness, contrast, saturate, hue, blur,
            offsetX, offsetY, scale,
            hideStatus, statusColor, themeColor } = _state;

        _setSlider('scBrightness', brightness);
        _setSlider('scContrast', contrast);
        _setSlider('scSaturate', saturate);
        _setSlider('scHue', hue);
        _setSlider('scBlur', blur);
        _setSlider('scScale', scale);
        _setSlider('scOffsetXSlider', offsetX);
        _setSlider('scOffsetYSlider', offsetY);

        _updateSliderLabels();
        _syncOffsetDisplay();

        // 预设高亮
        document.querySelectorAll('.sc-preset-card').forEach(el => {
            el.classList.toggle('sc-preset-active', el.dataset.preset === _state.preset);
        });

        // toggle
        const tog = document.getElementById('scStatusBarToggle');
        tog && tog.classList.toggle('on', hideStatus);

        // 颜色胶囊
        document.querySelectorAll('.sc-color-pill').forEach(el => {
            el.classList.toggle('sc-pill-active', el.dataset.color === statusColor);
        });

        // 色块
        document.querySelectorAll('.sc-swatch').forEach(el => {
            el.classList.toggle('sc-swatch-active', el.dataset.color === themeColor);
        });

        // 拾色器
        const picker = document.getElementById('scThemeColorPicker');
        if (picker) picker.value = themeColor;
    }

    function _setSlider(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function _updateSliderLabels() {
        _setLabel('scBrightnessVal', _state.brightness);
        _setLabel('scContrastVal', _state.contrast);
        _setLabel('scSaturateVal', _state.saturate);
        _setLabel('scHueVal', _state.hue);
        _setLabel('scBlurVal', _state.blur);
        _setLabel('scScaleVal', _state.scale + '%');
    }

    function _setLabel(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function _syncOffsetDisplay() {
        const { offsetX, offsetY } = _state;
        _setLabel('scOffsetX', `X: ${offsetX > 0 ? '+' : ''}${offsetX}px`);
        _setLabel('scOffsetY', `Y: ${offsetY > 0 ? '+' : ''}${offsetY}px`);
        _setLabel('scOffsetXVal', offsetX);
        _setLabel('scOffsetYVal', offsetY);

        // 同步偏移滑块
        const xs = document.getElementById('scOffsetXSlider');
        const ys = document.getElementById('scOffsetYSlider');
        if (xs) xs.value = offsetX;
        if (ys) ys.value = offsetY;
    }

    /* ================================================================
       持久化
       ================================================================ */
    function _saveState() {
        Storage.set(KEY, JSON.stringify(_state));
    }

    function _loadState() {
        try {
            const raw = Storage.get(KEY);
            if (raw) _state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
        } catch { }
    }

    /* ---- 初始化 ---- */
    function init() {
        _loadState();
        // 等 DOM ready 后应用（DOMContentLoaded 内调用时已 ready）
        _applyAll();
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        open, close,
        applyPreset,
        onSlider, onOffsetSlider,
        nudge, resetOffset,
        toggleStatusBar,
        setStatusColor,
        setThemeColor,
        resetAll
    };
})();
