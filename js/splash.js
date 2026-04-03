/* ================================================
   splash.js — 开屏入场动画 + HMAC 自验证激活码 + 内置生成器
   ================================================ */

const SECRET_KEY = 'idol-ji-2025-your-secret-key-here';
const KEY_UNLOCKED = 'idolji_unlocked';
const ANIM_DURATION = 2200;
const FADE_DURATION = 600;

const ADMIN_USER = 'Yoshi0515';
const ADMIN_PASS = 'Yukimura0305';

const TYPE_CONFIG = {
    standard: { segments: [8, 8, 8, 8], label: 'STD' },
    premium: { segments: [8, 8, 8, 8, 8, 8], label: 'PRE' },
    enterprise: { segments: [8, 8, 8, 8, 8, 8, 8, 8], label: 'ENT' },
    ultra: { segments: [12, 12, 12, 12, 12, 12, 12], label: 'ULT' },
};
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const _lastCodes = [];

/* ================================================================
   HMAC 工具
   ================================================================ */
async function _hmacChecksum(segments) {
    const data = segments.join('-');
    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(SECRET_KEY),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig).slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function isValidCode(raw) {
    const code = raw.trim().toUpperCase();
    if (!code.startsWith('IDOL-')) return false;
    const parts = code.split('-');
    if (parts.length < 6) return false;
    const label = parts[1];
    const segCounts = { STD: 4, PRE: 6, ENT: 8, ULT: 7 };
    if (!(label in segCounts)) return false;
    const n = segCounts[label];
    if (parts.length !== 4 + n + 1) return false;
    const segments = parts.slice(4, 4 + n);
    const providedChecksum = parts[parts.length - 1];
    const expectedChecksum = await _hmacChecksum(segments);
    return providedChecksum === expectedChecksum;
}

/* ================================================================
   生成器工具
   ================================================================ */
function _randBytes(n) {
    const a = new Uint8Array(n); crypto.getRandomValues(a); return a;
}
function _genSegment(len) {
    return Array.from(_randBytes(len)).map(b => CHARSET[b % CHARSET.length]).join('');
}
function _genDeviceToken() {
    return Array.from(_randBytes(4)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* ================================================================
   SplashUnlock
   ================================================================ */
window.SplashUnlock = (() => {

    /* ---------- 视图切换 ---------- */
    function _showView(id) {
        ['suViewActivate', 'suViewAdmin', 'suViewGenerator', 'suViewSaved'].forEach(v => {
            const el = document.getElementById(v);
            if (el) el.style.display = (v === id) ? 'flex' : 'none';
        });
    }
    function showActivate() { _showView('suViewActivate'); }
    function showAdmin() {
        _showView('suViewAdmin');
        setTimeout(() => document.getElementById('suAdminUser')?.focus(), 100);
    }

    /* ---------- 已激活识别视图 ---------- */
    function showSaved() {
        _showView('suViewSaved');
    }

    /* ---------- 已激活 → 点击识别后进入 ---------- */
    function recognize() {
        const btn = document.getElementById('suRecognizeBtn');
        const result = document.getElementById('suRecognizeResult');
        if (btn) { btn.disabled = true; btn.textContent = '识别中…'; }
        setTimeout(() => {
            if (checkSaved()) {
                if (result) { result.style.color = '#56ab2f'; result.textContent = '✓ 激活记录有效，正在进入…'; }
                setTimeout(() => _onUnlocked(true), 800);
            } else {
                if (btn) { btn.disabled = false; btn.textContent = '🔍 识别激活记录并进入'; }
                if (result) { result.style.color = '#e07a7a'; result.textContent = '未找到有效记录，请重新激活'; }
            }
        }, 600);
    }

    /* ---------- 已激活 → 重新验证 ---------- */
    function reVerify() {
        // 清除本地记录，切到输入框让用户重新输入
        localStorage.removeItem(KEY_UNLOCKED);
        _showView('suViewActivate');
        setTimeout(() => document.getElementById('suInput')?.focus(), 100);
    }

    /* ---------- 激活码验证 ---------- */
    async function verify() {
        const input = document.getElementById('suInput');
        const errEl = document.getElementById('suError');
        const wrap = document.getElementById('suInputWrap');
        const btn = document.getElementById('suBtn');
        const code = input.value.trim();
        if (!code) { _shake(wrap); return; }
        btn.disabled = true; btn.textContent = '验证中…';
        errEl.classList.remove('su-error-show');
        await new Promise(r => setTimeout(r, 480));
        const valid = await isValidCode(code);
        if (valid) {
            localStorage.setItem(KEY_UNLOCKED, _fingerprint(code.toUpperCase()));
            _onUnlocked(false);
        } else {
            _shake(wrap);
            errEl.textContent = '激活码无效，请检查后重试';
            errEl.classList.add('su-error-show');
            btn.disabled = false; btn.textContent = '确认激活';
        }
    }

    /* ---------- 管理员登录 ---------- */
    async function adminLogin() {
        const user = document.getElementById('suAdminUser').value.trim();
        const pass = document.getElementById('suAdminPass').value;
        const errEl = document.getElementById('suAdminError');
        const btn = document.getElementById('suAdminBtn');
        const uWrap = document.getElementById('suAdminUserWrap');
        const pWrap = document.getElementById('suAdminPassWrap');
        errEl.classList.remove('su-error-show');
        if (!user || !pass) { _shake(user ? pWrap : uWrap); return; }
        btn.disabled = true; btn.textContent = '验证中…';
        await new Promise(r => setTimeout(r, 400));
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            _showView('suViewGenerator');
            document.getElementById('genResult').innerHTML =
                '<div style="text-align:center;font-size:11px;color:rgba(107,117,160,0.35);padding:20px 0;">点击「生成」创建激活码</div>';
        } else {
            _shake(pWrap);
            errEl.textContent = '账号或密码错误';
            errEl.classList.add('su-error-show');
            btn.disabled = false; btn.textContent = '登录';
        }
    }

    function adminLogout() {
        document.getElementById('suAdminUser').value = '';
        document.getElementById('suAdminPass').value = '';
        _showView('suViewActivate');
    }

    /* ---------- 生成激活码 ---------- */
    async function generateCodes() {
        const type = document.getElementById('genType').value;
        const count = Math.min(Math.max(parseInt(document.getElementById('genCount').value) || 1, 1), 20);
        const cfg = TYPE_CONFIG[type];
        const container = document.getElementById('genResult');
        container.innerHTML = ''; _lastCodes.length = 0;
        for (let i = 0; i < count; i++) {
            const segments = cfg.segments.map(len => _genSegment(len));
            const deviceToken = _genDeviceToken();
            const checksum = await _hmacChecksum(segments);
            const tsHex = Date.now().toString(16).toUpperCase();
            const code = `IDOL-${cfg.label}-${tsHex}-${deviceToken}-${segments.join('-')}-${checksum}`;
            _lastCodes.push(code);
            const div = document.createElement('div');
            div.style.cssText = 'background:rgba(107,117,160,0.08);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;';
            div.innerHTML = `
                <div style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#5a6190;word-break:break-all;letter-spacing:0.05em;">${code}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:rgba(107,117,160,0.5);">${cfg.label} · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
                    <button onclick="SplashUnlock._copySingle('${code}')"
                        style="height:24px;padding:0 10px;border:1px solid rgba(107,117,160,0.3);border-radius:6px;background:transparent;color:#7b87c0;font-size:11px;cursor:pointer;">复制</button>
                </div>`;
            container.appendChild(div);
        }
    }

    function _copySingle(code) {
        navigator.clipboard.writeText(code).then(() => _toast('📋 已复制')).catch(() => {
            const el = document.createElement('textarea');
            el.value = code; document.body.appendChild(el); el.select();
            document.execCommand('copy'); document.body.removeChild(el); _toast('📋 已复制');
        });
    }

    function copyAllCodes() {
        if (!_lastCodes.length) { _toast('⚠️ 请先生成激活码'); return; }
        const text = _lastCodes.join('\n');
        navigator.clipboard.writeText(text).then(() => _toast(`📋 已复制 ${_lastCodes.length} 个`)).catch(() => {
            const el = document.createElement('textarea');
            el.value = text; document.body.appendChild(el); el.select();
            document.execCommand('copy'); document.body.removeChild(el); _toast(`📋 已复制 ${_lastCodes.length} 个`);
        });
    }

    function _toast(msg) {
        let t = document.getElementById('suToast');
        if (!t) {
            t = document.createElement('div'); t.id = 'suToast';
            t.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(90,97,144,0.9);color:#fff;font-size:12px;padding:7px 16px;border-radius:20px;white-space:nowrap;z-index:99999;pointer-events:none;transition:opacity 0.3s;';
            document.getElementById('splashScreen')?.appendChild(t);
        }
        t.textContent = msg; t.style.opacity = '1';
        clearTimeout(t._tid); t._tid = setTimeout(() => { t.style.opacity = '0'; }, 2000);
    }

    /* ---------- 公共工具 ---------- */
    function _fingerprint(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) ^ str.charCodeAt(i); h = h >>> 0; }
        return 'idolji_' + h.toString(36);
    }
    function _shake(el) { el.classList.remove('su-shake'); void el.offsetWidth; el.classList.add('su-shake'); }

    // skipAnim=true 时不等动画，直接退场
    function _onUnlocked(skipAnim) {
        const el = document.getElementById('splashScreen');
        const btn = document.getElementById('suBtn');
        if (!el) return;
        if (!skipAnim && btn) {
            btn.textContent = '✓ 激活成功';
            btn.style.background = 'linear-gradient(135deg,#56ab2f,#a8e063)';
        }
        const delay = skipAnim ? 0 : 700;
        setTimeout(() => { el.classList.add('splash-hide'); setTimeout(() => el.remove(), FADE_DURATION); }, delay);
    }

    function _bindEnter() {
        document.getElementById('suInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
        document.getElementById('suAdminUser')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('suAdminPass')?.focus(); });
        document.getElementById('suAdminPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
    }

    function checkSaved() {
        const saved = localStorage.getItem(KEY_UNLOCKED);
        return saved && saved.startsWith('idolji_');
    }

    return {
        verify, adminLogin, adminLogout,
        showActivate, showAdmin, showSaved,
        recognize, reVerify,          // ← enterDirect 改成 recognize
        generateCodes, copyAllCodes, _copySingle,
        _bindEnter, checkSaved
    };
})();

/* ================================================================
   主流程
   ================================================================ */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById('splashScreen');
        const animEl = document.getElementById('splashAnim');
        const unlockEl = document.getElementById('splashUnlock');
        if (!el) return;
        SplashUnlock._bindEnter();

        /* ① 已激活 → 播动画，动画结束后显示"已识别"确认页 */
        if (SplashUnlock.checkSaved()) {
            unlockEl.style.display = 'none';
            setTimeout(() => {
                animEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                animEl.style.opacity = '0';
                animEl.style.transform = 'translateY(-10px) scale(0.97)';
                setTimeout(() => {
                    animEl.style.display = 'none';
                    // 切到已激活确认视图
                    unlockEl.style.display = 'flex';
                    unlockEl.style.opacity = '0';
                    unlockEl.style.transform = 'translateY(16px)';
                    unlockEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    SplashUnlock.showSaved(); // 先切好视图再显示
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        unlockEl.style.opacity = '1';
                        unlockEl.style.transform = 'translateY(0)';
                    }));
                }, 400);
            }, ANIM_DURATION);
            return;
        }

        /* ② 未激活 → 动画结束后切换到激活码输入页 */
        unlockEl.style.display = 'none';
        setTimeout(() => {
            animEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            animEl.style.opacity = '0';
            animEl.style.transform = 'translateY(-10px) scale(0.97)';
            setTimeout(() => {
                animEl.style.display = 'none';
                unlockEl.style.display = 'flex';
                unlockEl.style.opacity = '0';
                unlockEl.style.transform = 'translateY(16px)';
                unlockEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    unlockEl.style.opacity = '1';
                    unlockEl.style.transform = 'translateY(0)';
                    setTimeout(() => document.getElementById('suInput')?.focus(), 300);
                }));
            }, 400);
        }, ANIM_DURATION);
    });
})();
