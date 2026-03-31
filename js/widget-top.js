/* ========================================
   widget-top.js — 顶部大组件逻辑
   ======================================== */
const WidgetTop = (() => {

    function init() {
        // 渲染保存的数据
        const avatar = Storage.get('wtAvatar');
        const motto = Storage.get('wtMotto');
        const baby = Storage.get('wtBaby');
        const contact = Storage.get('wtContact');

        if (avatar) {
            const img = document.getElementById('wtAvatarImg');
            img.src = avatar;
        }
        document.getElementById('wtMotto').textContent = motto;
        document.getElementById('wtBaby').textContent = baby;
        document.getElementById('wtContact').textContent = contact;
    }

    /* 编辑头像 */
    function editAvatar() {
        Storage.pickImage(b64 => {
            const img = document.getElementById('wtAvatarImg');
            img.src = b64;
            Storage.set('wtAvatar', b64);
        });
    }

    /* 编辑签名 */
    function editMotto() {
        Modal.open('编辑签名', 'text', Storage.get('wtMotto'), val => {
            document.getElementById('wtMotto').textContent = val;
            Storage.set('wtMotto', val);
        });
    }

    /* 编辑 Baby */
    function editBaby() {
        Modal.open('编辑 Baby', 'text', Storage.get('wtBaby'), val => {
            document.getElementById('wtBaby').textContent = val;
            Storage.set('wtBaby', val);
        });
    }

    /* 编辑 Contact */
    function editContact() {
        Modal.open('编辑 Contact', 'text', Storage.get('wtContact'), val => {
            document.getElementById('wtContact').textContent = val;
            Storage.set('wtContact', val);
        });
    }

    // 自动初始化
    document.addEventListener('DOMContentLoaded', init);

    return { editAvatar, editMotto, editBaby, editContact };
})();
