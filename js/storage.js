/* ========================================
   storage.js — 本地持久化（localStorage）
   ======================================== */
const Storage = (() => {

    const KEY = 'myphone_data';

    // 默认数据结构
    const defaults = {
        wtAvatar: '',      // 头像 base64
        wtMotto: '幸好爱是小小的奇迹',
        wtBaby: 'call someone',
        wtContact: 'http://>your.link',
        polaroidImg: '',      // Polaroid 图片
        polaroidCaption: 'First Choice',
        wpImg: ''       // 右侧图片框
    };

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? Object.assign({}, defaults, JSON.parse(raw)) : Object.assign({}, defaults);
        } catch (e) {
            return Object.assign({}, defaults);
        }
    }

    function save(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) { }
    }

    function get(key) {
        return load()[key];
    }

    function set(key, value) {
        const data = load();
        data[key] = value;
        save(data);
    }

    /* 文件选择处理 — 外部回调通过 _pendingCallback 注入 */
    let _pendingCallback = null;
    let _pendingPreview = null; // 可选：选中后立刻预览的 img 元素

    function pickImage(callback, previewEl) {
        _pendingCallback = callback;
        _pendingPreview = previewEl || null;
        document.getElementById('fileInput').click();
    }

    function handleFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const b64 = e.target.result;
            if (_pendingPreview) {
                _pendingPreview.src = b64;
                _pendingPreview.classList.add('loaded');
            }
            if (typeof _pendingCallback === 'function') {
                _pendingCallback(b64);
            }
            _pendingCallback = null;
            _pendingPreview = null;
        };
        reader.readAsDataURL(file);
        // 重置 input，允许重复选同一文件
        event.target.value = '';
    }

    return { load, save, get, set, pickImage, handleFileInput };
})();
