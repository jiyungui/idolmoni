/* ========================================
   widget-small.js — 小组件逻辑
   ======================================== */
const WidgetSmall = (() => {

    function init() {
        // Polaroid
        const polImg = Storage.get('polaroidImg');
        const polCaption = Storage.get('polaroidCaption');

        if (polImg) {
            const img = document.getElementById('polaroidImg');
            img.src = polImg;
            img.classList.add('loaded');
        }
        document.getElementById('polaroidCaption').textContent = polCaption;

        // 右侧图片框
        const wpImg = Storage.get('wpImg');
        if (wpImg) {
            const img = document.getElementById('wpImg');
            img.src = wpImg;
            img.classList.add('loaded');
            document.getElementById('wpPlaceholder').classList.add('hidden');
        }
    }

    /* 更换 Polaroid 图片 */
    function editPolaroid() {
        Storage.pickImage(b64 => {
            const img = document.getElementById('polaroidImg');
            img.src = b64;
            img.classList.add('loaded');
            Storage.set('polaroidImg', b64);
        });
    }

    /* 编辑 Polaroid 说明文字 */
    function editCaption() {
        Modal.open('编辑标题', 'text', Storage.get('polaroidCaption'), val => {
            document.getElementById('polaroidCaption').textContent = val;
            Storage.set('polaroidCaption', val);
        });
    }

    /* 更换右侧图片框图片 */
    function editPhotoWidget() {
        Storage.pickImage(b64 => {
            const img = document.getElementById('wpImg');
            img.src = b64;
            img.classList.add('loaded');
            document.getElementById('wpPlaceholder').classList.add('hidden');
            Storage.set('wpImg', b64);
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return { editPolaroid, editCaption, editPhotoWidget };
})();
