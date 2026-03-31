/* ================================================
   settings.js — 设置主页控制器
   ================================================ */
const SettingsPage = (() => {

    /* ---- 字体配置表 ---- */
    const FONTS = [
        {
            id: 'default',
            name: '系统默认',
            family: "'Apple SD Gothic Neo','PingFang SC','Helvetica Neue',sans-serif",
            preview: 'Aa'
        },
        {
            id: 'noto',
            name: 'Noto Sans',
            family: "'Noto Sans SC','Noto Sans KR',sans-serif",
            preview: 'Aa',
            url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap'
        },
        {
            id: 'lxgw',
            name: '霞鹜文楷',
            family: "'LXGW WenKai Screen','LXGW WenKai',serif",
            preview: '文',
            url: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css'
        },
        {
            id: 'courier',
            name: 'Courier',
            family: "'Courier New',Courier,monospace",
            preview: 'Aa'
        },
        {
            id: 'georgia',
            name: 'Georgia',
            family: "Georgia,'Times New Roman',serif",
            preview: 'Gg'
        },
        {
            id: 'zpix',
            name: 'Z像素',
            family: "'Zpix','Press Start 2P',monospace",
            preview: '字',
            url: 'https://cdn.jsdelivr.net/npm/zpix@3.1.1/zpix.css'
        }
    ];

    /* 打开设置主页 */
    function open() {
        document.getElementById('pageSettings').classList.add('page-active');
    }

    /* 关闭设置主页 */
    function close() {
        document.getElementById('pageSettings').classList.remove('page-active');
    }

    /* 进入 API 设置 */
    function openApi() {
        ApiSettings.open();
    }

    function openScreen() {
        ScreenSettings.open();
    }

    /* 壁纸更换 */
    function openWallpaper() {
        Storage.pickImage(b64 => {
            _applyWallpaper(b64);
            Storage.set('wallpaper', b64);
            _toast('壁纸已更换');
        });
    }

    /* 应用图标主题（占位） */
    function openIconTheme() {
        _toast('图标主题功能开发中~');
    }

    /* ---- 字体更换 ---- */
    function openFont() {
        const current = Storage.get('fontId') || 'default';

        // 构建选择器 HTML
        const gridHtml = FONTS.map(f => `
            <div class="font-picker-item ${f.id === current ? 'selected' : ''}"
                 onclick="SettingsPage._applyFont('${f.id}')"
                 style="font-family:${f.family}">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
                    <span class="font-picker-preview" style="font-family:${f.family}">${f.preview}</span>
                    <div class="font-picker-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                </div>
                <span class="font-picker-name">${f.name}</span>
            </div>
        `).join('');

        Modal.open('字体更换', 'custom',
            `<div class="font-picker-grid">${gridHtml}</div>
             <p style="font-size:11px;color:var(--text-muted);margin-top:12px;text-align:center;letter-spacing:.04em">
               点击即时预览，刷新后生效
             </p>`,
            null
        );
    }

    /* 应用字体（即时生效 + 持久化）*/
    function _applyFont(id) {
        const f = FONTS.find(x => x.id === id);
        if (!f) return;

        // 加载外部字体（如有）
        if (f.url && !document.querySelector(`link[data-font="${id}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = f.url;
            link.dataset.font = id;
            document.head.appendChild(link);
        }

        // 设置全局字体变量
        document.documentElement.style.setProperty('--font-main', f.family);
        document.body.style.fontFamily = f.family;

        // 持久化
        Storage.set('fontId', id);

        // 更新选中状态（不关弹窗，让用户看到效果）
        document.querySelectorAll('.font-picker-item').forEach(el => {
            el.classList.remove('selected');
        });
        const target = document.querySelector(`.font-picker-item[onclick*="${id}"]`);
        if (target) target.classList.add('selected');

        _toast(`字体已切换为 ${f.name}`);
    }

    /* 数据管理 */
    function openData() {
        _showDataManager();
    }

    function _showDataManager() {
        Modal.open('数据管理', 'custom',
            `<div style="display:flex;flex-direction:column;gap:12px">
                <button class="modal-btn"
                    style="background:var(--accent-light);color:var(--text-primary);height:44px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;letter-spacing:.03em"
                    onclick="SettingsPage._exportData()">
                    导出数据 (JSON)
                </button>
                <button class="modal-btn"
                    style="background:rgba(220,150,140,0.18);color:#8a3030;border:1px solid rgba(200,120,110,0.3);height:44px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;letter-spacing:.03em"
                    onclick="SettingsPage._clearData()">
                    清除所有数据
                </button>
            </div>`,
            null
        );
    }

    function _exportData() {
        try {
            const data = Storage.load();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'myphone_data.json';
            a.click();
            URL.revokeObjectURL(url);
            Modal.close();
        } catch (e) {
            _toast('导出失败：' + e.message);
        }
    }

    function _clearData() {
        if (confirm('确定要清除所有本地数据吗？此操作不可撤销。')) {
            localStorage.clear();
            location.reload();
        }
    }

    /* ---- 内部工具 ---- */

    function _applyWallpaper(b64) {
        const screen = document.getElementById('phoneScreen');
        screen.style.backgroundImage = `url(${b64})`;
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
    }

    function _toast(msg) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(44,44,52,0.85)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '.03em',
            padding: '9px 18px',
            borderRadius: '20px',
            whiteSpace: 'nowrap',
            zIndex: '9999',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity .2s'
        });
        document.getElementById('phoneScreen').appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 2200);
    }

    /* 初始化：恢复壁纸 + 字体 */
    function init() {
        // 恢复壁纸
        const wp = Storage.get('wallpaper');
        if (wp) _applyWallpaper(wp);

        // 恢复字体
        const fontId = Storage.get('fontId');
        if (fontId && fontId !== 'default') {
            _applyFont(fontId);
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        open, close,
        openApi, openScreen, openWallpaper, openIconTheme, openFont, openData,
        _applyFont, _exportData, _clearData
    };
})();
