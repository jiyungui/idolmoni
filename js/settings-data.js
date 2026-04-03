/* ================================================
   settings-data.js — 数据管理控制器
   导出全量数据 / 导入恢复 / 导出记录（最近5次）
   ================================================ */
const DataManager = (() => {

    const KEY_RECORDS = 'export_records'; // 导出记录数组
    const MAX_RECORDS = 5;

    /* ================================================================
       页面开关
       ================================================================ */
    function open() {
        document.getElementById('pageDataManager').classList.add('page-active');
        _renderRecords();
    }

    function close() {
        document.getElementById('pageDataManager').classList.remove('page-active');
    }

    /* ================================================================
       导出数据
       ================================================================ */
    function exportData() {
        try {
            /* 收集 localStorage 全量数据 */
            const snapshot = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                snapshot[k] = localStorage.getItem(k);
            }

            /* 加入元信息 */
            const payload = {
                _meta: {
                    app: 'idol机',
                    version: '1.0.0',
                    exportAt: new Date().toISOString(),
                    keys: Object.keys(snapshot).length
                },
                data: snapshot
            };

            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });

            /* 计算大小 */
            const sizeStr = _formatSize(blob.size);

            /* 触发下载 */
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = _formatDateForFilename(new Date());
            a.href = url;
            a.download = `idolji_backup_${ts}.json`;
            a.click();
            URL.revokeObjectURL(url);

            /* 记录本次导出 */
            _addRecord(sizeStr);
            _renderRecords();

            _toast('数据导出成功 · ' + sizeStr);

        } catch (e) {
            _toast('导出失败：' + e.message);
        }
    }

    /* ================================================================
       导入数据
       ================================================================ */
    function importData(input) {
        const file = input.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            _toast('请选择 .json 格式文件');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const payload = JSON.parse(e.target.result);

                /* 校验是否为本应用导出文件 */
                if (!payload._meta || !['MyPhone', '社畜机', 'idol机'].includes(payload._meta.app) || !payload.data) {
                    _toast('文件格式不正确，请使用本模拟器导出的文件');
                    return;
                }

                if (!confirm(
                    `确认导入？\n导出时间：${_formatDateDisplay(payload._meta.exportAt)}\n数据条目：${payload._meta.keys} 条\n\n⚠️ 导入将覆盖当前所有数据并刷新页面`
                )) {
                    input.value = '';
                    return;
                }

                /* 写入 localStorage */
                localStorage.clear();
                const data = payload.data;
                Object.keys(data).forEach(k => {
                    localStorage.setItem(k, data[k]);
                });

                _toast('导入成功，即将刷新…');
                setTimeout(() => location.reload(), 1200);

            } catch (err) {
                _toast('解析失败：文件内容无效');
                console.warn('[DataManager] import error:', err);
            }
        };
        reader.onerror = () => _toast('文件读取失败');
        reader.readAsText(file, 'utf-8');
        input.value = '';
    }

    /* ================================================================
       清除所有数据
       ================================================================ */
    function clearData() {
        if (!confirm('确定要清除所有本地数据吗？\n此操作不可撤销，建议先导出备份。')) return;
        localStorage.clear();
        location.reload();
    }

    /* ================================================================
       导出记录管理
       ================================================================ */
    function _addRecord(sizeStr) {
        let records = _getRecords();
        records.unshift({
            date: new Date().toISOString(),
            size: sizeStr
        });
        /* 只保留最近5次 */
        if (records.length > MAX_RECORDS) records = records.slice(0, MAX_RECORDS);
        localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
    }

    function _getRecords() {
        try {
            return JSON.parse(localStorage.getItem(KEY_RECORDS) || '[]');
        } catch (_) {
            return [];
        }
    }

    function _renderRecords() {
        const list = document.getElementById('dmRecordsList');
        const empty = document.getElementById('dmRecordsEmpty');
        if (!list || !empty) return;

        const records = _getRecords();
        list.innerHTML = '';

        if (records.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        records.forEach((rec, idx) => {
            const item = document.createElement('div');
            item.className = 'dm-record-item';
            item.innerHTML = `
                <div class="dm-record-num">${idx + 1}</div>
                <div class="dm-record-info">
                    <span class="dm-record-date">${_formatDateDisplay(rec.date)}</span>
                    <span class="dm-record-size">文件大小：${rec.size}</span>
                </div>
                <button class="dm-record-re" title="再次导出" onclick="DataManager.exportData()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15" />
                    </svg>
                </button>
            `;
            list.appendChild(item);
        });
    }

    /* ================================================================
       工具函数
       ================================================================ */
    function _formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    function _formatDateForFilename(d) {
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function _formatDateDisplay(iso) {
        try {
            const d = new Date(iso);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (_) { return iso; }
    }

    function _toast(msg) {
        const screen = document.getElementById('phoneScreen');
        if (!screen) return;
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position: 'absolute', bottom: '100px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(44,44,52,0.85)', color: '#fff',
            fontSize: '12px', fontWeight: '500', letterSpacing: '.03em',
            padding: '9px 18px', borderRadius: '20px',
            whiteSpace: 'nowrap', zIndex: '9999',
            pointerEvents: 'none', opacity: '0', transition: 'opacity .2s'
        });
        screen.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
    }

    return { open, close, exportData, importData, clearData };
})();
