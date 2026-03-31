/* ========================================
   modal.js — 全局弹窗控制器
   ======================================== */
const Modal = (() => {

    let _callback = null;
    let _type = 'text'; // 'text' | 'image' | 'toast'

    function open(title, type, currentValue, callback) {
        _callback = callback;
        _type = type;

        document.getElementById('modalTitle').textContent = title;
        const body = document.getElementById('modalBody');
        const footer = document.getElementById('modalConfirm').parentElement;
        body.innerHTML = '';

        const overlay = document.getElementById('modalOverlay');

        if (type === 'toast') {
            // 纯提示，无输入框
            body.innerHTML = `<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;letter-spacing:.03em;">${currentValue}</p>`;
            document.getElementById('modalConfirm').style.display = 'none';
            document.querySelector('.modal-cancel').textContent = '关闭';
        } else if (type === 'text') {
            body.innerHTML = `<input class="modal-input" id="modalTextInput" type="text" value="${escapeHtml(currentValue)}" maxlength="80" />`;
            document.getElementById('modalConfirm').style.display = '';
            document.querySelector('.modal-cancel').textContent = '取消';
            setTimeout(() => {
                const el = document.getElementById('modalTextInput');
                if (el) { el.focus(); el.select(); }
            }, 300);
        } else if (type === 'image') {
            body.innerHTML = `
        <div class="modal-upload" id="modalUploadArea" onclick="Modal._triggerUpload()">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="4" y="8" width="40" height="32" rx="4"/>
            <circle cx="17" cy="20" r="4"/>
            <path d="M4 36l12-10 8 8 6-5 14 11"/>
          </svg>
          <span>点击选择图片</span>
        </div>`;
            document.getElementById('modalConfirm').style.display = '';
            document.querySelector('.modal-cancel').textContent = '取消';
        }

        overlay.classList.add('active');
    }

    function close() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        _callback = null;
        document.getElementById('modalConfirm').style.display = '';
        document.querySelector('.modal-cancel').textContent = '取消';
    }

    function confirm() {
        if (_type === 'text') {
            const val = (document.getElementById('modalTextInput')?.value || '').trim();
            if (val && typeof _callback === 'function') _callback(val);
            close();
        } else if (_type === 'image') {
            close();
        } else {
            close();
        }
    }

    function closeOnOverlay(e) {
        if (e.target === document.getElementById('modalOverlay')) close();
    }

    function _triggerUpload() {
        // 图片上传类弹窗直接触发文件选择
        Storage.pickImage(b64 => {
            const area = document.getElementById('modalUploadArea');
            if (area) {
                area.innerHTML = `<img src="${b64}" style="border-radius:var(--radius-card)"/>`;
            }
            if (typeof _callback === 'function') {
                _callback(b64);
                _callback = null;
            }
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    return { open, close, confirm, closeOnOverlay, _triggerUpload };
})();
