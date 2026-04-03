/* ================================================
   settings.js — 设置主页控制器
   ================================================ */
const SettingsPage = (() => {


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

    /* 壁纸更换 —— 改为打开内置页面 */
    function openWallpaper() {
        WallpaperSettings.open();
    }

    /* 应用图标主题 */
    function openIconTheme() {
        IconTheme.open();
    }

    /* ---- 字体更换 → 进入内置页面 ---- */
    function openFont() {
        FontSettings.open();
    }

    /* 数据管理 → 进入内置页面 */
    function openData() {
        DataManager.open();
    }

    /* ---- 内部工具 ---- */

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

    document.addEventListener('DOMContentLoaded', () => {
        /* 壁纸恢复由 settings-wallpaper.js 处理 */
        /* 字体恢复由 settings-font.js 处理 */
    });

    return {
        open, close,
        openApi, openScreen, openWallpaper, openIconTheme, openFont, openData
    };
})();
