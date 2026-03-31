/* ========================================
   apps.js — APP 图标逻辑
   ======================================== */
const Apps = (() => {

    const APP_NAMES = {
        contacts: '人脉',
        world: '大世界',
        weibo: '微博',
        bubble: 'bubble',
        douban: '豆瓣',
        music: '音乐',
        settings: '设置',
        profile: '个人主页',
        social: '社交'
    };

    /* 有内置页面的 APP 列表 */
    const APP_HANDLERS = {
        settings: () => SettingsPage.open()
        // 后续在此追加：
        // profile: () => ProfilePage.open(),
        // music:   () => MusicPage.open(),
    };

    function open(appId) {
        if (APP_HANDLERS[appId]) {
            APP_HANDLERS[appId]();
        } else {
            const name = APP_NAMES[appId] || appId;
            Modal.open(name, 'toast', `「${name}」正在建设中，敬请期待~`, null);
        }
    }

    return { open };
})();
