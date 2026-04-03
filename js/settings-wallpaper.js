/* ================================================
   settings-wallpaper.js
   壁纸设置页 + Canvas 天气粒子动画
   ================================================ */
const WallpaperSettings = (() => {

    /* ---- 存储 Key ---- */
    const KEY_WP = 'wallpaper_data';   // { dataURL, opacity, blur, frost, dim, fit }
    const KEY_WEATHER = 'weather_settings'; // { type, density, speed }

    /* ---- 默认状态 ---- */
    const DEFAULT_WP = {
        dataURL: '',
        opacity: 100,
        blur: 0,
        frost: 0,
        dim: 0,
        fit: 'cover'
    };
    const DEFAULT_WX = { type: 'none', density: 50, speed: 1.0 };

    let _wp = { ...DEFAULT_WP };
    let _wx = { ...DEFAULT_WX };

    /* 临时预览（未 apply 前存的是临时值）*/
    let _pendingDataURL = '';

    /* ---- 天气动画 ---- */
    let _raf = null;
    let _particles = [];
    let _canvas = null;
    let _ctx = null;

    /* ================================================================
       页面打开 / 关闭
       ================================================================ */
    function open() {
        document.getElementById('pageWallpaper').classList.add('page-active');
        _syncForm();
        _updatePreview(false); // 不重置，恢复当前状态
    }

    function close() {
        document.getElementById('pageWallpaper').classList.remove('page-active');
    }

    /* ================================================================
       图片选择（不压缩，原始 dataURL 存储）
       ================================================================ */
    function pickImage() {
        const input = document.createElement('input');
        input.type = 'accept' in input ? 'file' : 'text'; // fallback
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) { input.remove(); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                _pendingDataURL = ev.target.result;
                // 显示在预览框
                const img = document.getElementById('wpPreviewImg');
                const ph = document.getElementById('wpPreviewPlaceholder');
                img.src = _pendingDataURL;
                img.classList.add('loaded');
                ph && ph.classList.add('hidden');
                input.remove();
            };
            reader.readAsDataURL(file); // 原始读取，不压缩
        };
        input.click();
    }

    /* ================================================================
       样式滑块同步
       ================================================================ */
    function onStyleSlider() {
        _wp.opacity = parseInt(document.getElementById('wpOpacity').value);
        _wp.blur = parseFloat(document.getElementById('wpBlur').value);
        _wp.frost = parseInt(document.getElementById('wpFrost').value);
        _wp.dim = parseInt(document.getElementById('wpDim').value);
        _updateSliderLabels();
        _updatePreview(true); // 即时更新预览
    }

    function setFit(fit) {
        _wp.fit = fit;
        document.querySelectorAll('.wp-chip').forEach(el => {
            el.classList.toggle('wp-chip-active', el.dataset.fit === fit);
        });
        _updatePreview(true);
    }

    /* ================================================================
       应用壁纸（写入 phone-screen）
       ================================================================ */
    function applyWallpaper() {
        // 若选了新图则更新 dataURL
        if (_pendingDataURL) _wp.dataURL = _pendingDataURL;

        if (!_wp.dataURL) {
            _showToast('请先选择壁纸图片'); return;
        }

        _saveWP();
        _applyToScreen();
        _showToast('壁纸已应用');
    }

    /* ================================================================
       清除壁纸
       ================================================================ */
    function resetWallpaper() {
        if (!confirm('清除当前壁纸？')) return;
        _wp = { ...DEFAULT_WP };
        _pendingDataURL = '';
        _saveWP();
        _clearScreen();

        // 重置预览
        const img = document.getElementById('wpPreviewImg');
        const ph = document.getElementById('wpPreviewPlaceholder');
        img.src = '';
        img.classList.remove('loaded');
        ph && ph.classList.remove('hidden');
        _updatePreview(false);
        _syncForm();
        _showToast('壁纸已清除');
    }

    /* ================================================================
       天气效果
       ================================================================ */
    function setWeather(type) {
        _wx.type = type;
        document.querySelectorAll('.wp-weather-card').forEach(el => {
            el.classList.toggle('wp-weather-active', el.dataset.weather === type);
        });
        _saveWX();
        _restartWeather();
    }

    function onWeatherDensity() {
        _wx.density = parseInt(document.getElementById('wpWeatherDensity').value);
        document.getElementById('wpWeatherDensityVal').textContent = _wx.density;
        _saveWX();
        _restartWeather();
    }

    function onWeatherSpeed() {
        _wx.speed = parseFloat(document.getElementById('wpWeatherSpeed').value);
        document.getElementById('wpWeatherSpeedVal').textContent = _wx.speed.toFixed(1);
        _saveWX();
        _particles.forEach(p => p.speedMult = _wx.speed);
    }

    /* ================================================================
       内部：预览更新
       ================================================================ */
    function _updatePreview(fromSlider) {
        const url = fromSlider ? (_pendingDataURL || _wp.dataURL) : _wp.dataURL;
        if (!url) return;

        const img = document.getElementById('wpPreviewImg');
        if (!img.classList.contains('loaded') && url) {
            img.src = url;
            img.classList.add('loaded');
            const ph = document.getElementById('wpPreviewPlaceholder');
            ph && ph.classList.add('hidden');
        }

        const opacity = _wp.opacity / 100;
        const blur = _wp.blur;
        const frost = _wp.frost;
        const dim = _wp.dim;
        const fit = _wp.fit;

        img.style.opacity = opacity;
        img.style.objectFit = fit === 'center' ? 'none' : fit;

        // 模糊
        img.style.filter = blur > 0 ? `blur(${blur}px)` : '';

        // 毛玻璃遮罩
        const frostLayer = document.getElementById('wpPreviewBlurLayer');
        if (frost > 0) {
            frostLayer.style.backdropFilter = `blur(${frost * 0.3}px)`;
            frostLayer.style.webkitBackdropFilter = `blur(${frost * 0.3}px)`;
            frostLayer.style.background = `rgba(255,255,255,${frost * 0.004})`;
        } else {
            frostLayer.style.backdropFilter = '';
            frostLayer.style.background = '';
        }

        // 暗化遮罩
        const overlay = document.getElementById('wpPreviewOverlay');
        overlay.style.background = dim > 0 ? `rgba(0,0,0,${dim / 100})` : '';
    }

    /* 应用壁纸到主屏 */
    function _applyToScreen() {
        const screen = document.getElementById('phoneScreen');
        if (!screen || !_wp.dataURL) return;

        // 用一个独立的壁纸层，不影响 filter（filter 应用在 screen 上会影响子元素图片）
        let layer = document.getElementById('wpLayer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'wpLayer';
            layer.style.cssText = `
                position:absolute; inset:0; z-index:0;
                pointer-events:none; overflow:hidden;
                border-radius: inherit;
            `;
            screen.insertBefore(layer, screen.firstChild);
        }

        const fit = _wp.fit;
        const blur = _wp.blur;
        const frost = _wp.frost;
        const dim = _wp.dim;
        const opacity = _wp.opacity / 100;

        layer.innerHTML = '';

        // 壁纸 img（不用 background-image 避免画质问题）
        const img = document.createElement('img');
        img.src = _wp.dataURL;
        img.style.cssText = `
            position:absolute; inset:0; width:100%; height:100%;
            object-fit:${fit === 'center' ? 'none' : fit};
            opacity:${opacity};
            filter:${blur > 0 ? `blur(${blur}px)` : 'none'};
            display:block;
        `;
        layer.appendChild(img);

        // 毛玻璃层
        if (frost > 0) {
            const fl = document.createElement('div');
            fl.style.cssText = `
                position:absolute; inset:0;
                backdrop-filter:blur(${frost * 0.3}px);
                -webkit-backdrop-filter:blur(${frost * 0.3}px);
                background:rgba(255,255,255,${frost * 0.004});
            `;
            layer.appendChild(fl);
        }

        // 暗化
        if (dim > 0) {
            const dl = document.createElement('div');
            dl.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,${dim / 100});`;
            layer.appendChild(dl);
        }
    }

    function _clearScreen() {
        const layer = document.getElementById('wpLayer');
        if (layer) layer.remove();
        // 同时清掉旧的 backgroundImage（兼容旧逻辑）
        const screen = document.getElementById('phoneScreen');
        screen.style.backgroundImage = '';
    }

    /* ================================================================
       表单同步
       ================================================================ */
    function _syncForm() {
        document.getElementById('wpOpacity').value = _wp.opacity;
        document.getElementById('wpBlur').value = _wp.blur;
        document.getElementById('wpFrost').value = _wp.frost;
        document.getElementById('wpDim').value = _wp.dim;
        _updateSliderLabels();

        // fit chips
        document.querySelectorAll('.wp-chip').forEach(el => {
            el.classList.toggle('wp-chip-active', el.dataset.fit === _wp.fit);
        });

        // 天气
        document.getElementById('wpWeatherDensity').value = _wx.density;
        document.getElementById('wpWeatherDensityVal').textContent = _wx.density;
        document.getElementById('wpWeatherSpeed').value = _wx.speed;
        document.getElementById('wpWeatherSpeedVal').textContent = _wx.speed.toFixed(1);
        document.querySelectorAll('.wp-weather-card').forEach(el => {
            el.classList.toggle('wp-weather-active', el.dataset.weather === _wx.type);
        });

        // 预览图
        if (_wp.dataURL) {
            const img = document.getElementById('wpPreviewImg');
            const ph = document.getElementById('wpPreviewPlaceholder');
            img.src = _wp.dataURL;
            img.classList.add('loaded');
            ph && ph.classList.add('hidden');
        }
    }

    function _updateSliderLabels() {
        document.getElementById('wpOpacityVal').textContent = _wp.opacity + '%';
        document.getElementById('wpBlurVal').textContent = _wp.blur;
        document.getElementById('wpFrostVal').textContent = _wp.frost + '%';
        document.getElementById('wpDimVal').textContent = _wp.dim + '%';
    }

    /* ================================================================
       持久化（壁纸 dataURL 单独存，样式参数单独存，避免合并超配额）
       ================================================================ */
    function _saveWP() {
        // 样式参数（不含 dataURL，小体积）
        const meta = { opacity: _wp.opacity, blur: _wp.blur, frost: _wp.frost, dim: _wp.dim, fit: _wp.fit };
        try { localStorage.setItem('wallpaper_meta', JSON.stringify(meta)); } catch (e) { }
        // 原图 dataURL（可能几MB，单独key）
        if (_wp.dataURL) {
            try { localStorage.setItem('wallpaper_img', _wp.dataURL); } catch (e) {
                console.warn('壁纸存储失败（容量不足）', e.message);
            }
        } else {
            localStorage.removeItem('wallpaper_img');
        }
    }

    function _loadWP() {
        try {
            const meta = JSON.parse(localStorage.getItem('wallpaper_meta') || '{}');
            Object.assign(_wp, meta);
            const img = localStorage.getItem('wallpaper_img') || '';
            if (img) _wp.dataURL = img;
        } catch { }
    }

    function _saveWX() {
        try { localStorage.setItem(KEY_WEATHER, JSON.stringify(_wx)); } catch { }
    }

    function _loadWX() {
        try {
            const raw = localStorage.getItem(KEY_WEATHER);
            if (raw) _wx = { ...DEFAULT_WX, ...JSON.parse(raw) };
        } catch { }
    }

    /* ================================================================
       Canvas 天气粒子引擎
       ================================================================ */
    function _initCanvas() {
        _canvas = document.getElementById('weatherCanvas');
        if (!_canvas) return;
        _ctx = _canvas.getContext('2d');
        _resizeCanvas();
        window.addEventListener('resize', _resizeCanvas);
    }

    function _resizeCanvas() {
        if (!_canvas) return;
        const screen = document.getElementById('phoneScreen');
        const r = screen.getBoundingClientRect();
        _canvas.width = r.width || window.innerWidth;
        _canvas.height = r.height || window.innerHeight;
    }

    function _restartWeather() {
        if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
        if (!_canvas || !_ctx) return;
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        _particles = [];
        if (_wx.type === 'none') return;
        _spawnParticles();
        _animateWeather();
    }

    function _spawnParticles() {
        const n = _wx.density;
        const W = _canvas.width;
        const H = _canvas.height;
        const sp = _wx.speed;

        for (let i = 0; i < n; i++) {
            _particles.push(_makeParticle(W, H, sp, true));
        }
    }

    function _makeParticle(W, H, sp, randomY) {
        const type = _wx.type;
        const p = { x: Math.random() * W, y: randomY ? Math.random() * H : -40 };

        if (type === 'rain') {
            /* ── 小雨：细长透明水丝，三层景深 ── */
            p.layer = Math.random() < 0.22 ? 0 : Math.random() < 0.52 ? 1 : 2;
            const lf = [1.0, 0.60, 0.30][p.layer];
            const sf = [1.0, 0.68, 0.40][p.layer];
            const af = [1.0, 0.58, 0.28][p.layer];
            p.len = (12 + Math.random() * 16) * lf;
            p.speed = (6 + Math.random() * 5) * sp * sf;
            p.alpha = (0.18 + Math.random() * 0.30) * af;   // 整体偏透明
            p.width = (0.6 + Math.random() * 0.6) * [1.0, 0.65, 0.35][p.layer];
            p.angle = (90 + 5 + Math.random() * 12) * (Math.PI / 180);
            p.windT = Math.random() * Math.PI * 2;
            p.windA = (Math.random() - 0.5) * 0.005;
            p.splash = false; p.splashTime = 0;

        } else if (type === 'heavyrain') {
            /* ── 大雨：椭圆透明水滴，有折射高光 ── */
            p.layer = Math.random() < 0.28 ? 0 : Math.random() < 0.55 ? 1 : 2;
            const lf = [1.0, 0.62, 0.30][p.layer];
            const sf = [1.0, 0.70, 0.40][p.layer];
            /* 水滴尺寸：宽/高（椭圆，高是宽2.2~3倍） */
            p.rw = (2.2 + Math.random() * 2.0) * lf;    // 椭圆半宽
            p.rh = p.rw * (2.2 + Math.random() * 0.8);  // 椭圆半高（拉伸）
            p.speed = (14 + Math.random() * 10) * sp * sf;
            p.alpha = (0.10 + Math.random() * 0.18) * [1.0, 0.65, 0.32][p.layer]; // 极透明
            p.angle = (90 + 10 + Math.random() * 18) * (Math.PI / 180);
            p.windT = Math.random() * Math.PI * 2;
            p.windFreq = 0.007 + Math.random() * 0.010;
            p.windAmp = 0.004 + Math.random() * 0.010;
            p.splash = false; p.splashTime = 0;

        } else if (type === 'snow') {
            /* ── 雪花：纯白柔光圆点，三层景深 ── */
            p.layer = Math.random() < 0.18 ? 0 : Math.random() < 0.52 ? 1 : 2;
            const rs = [3.5 + Math.random() * 3.0,   // 近：大片雪花
            1.5 + Math.random() * 1.8,   // 中
            0.4 + Math.random() * 0.9][p.layer]; // 远：细点
            p.r = rs;
            p.vy = (0.35 + Math.random() * 0.50) * sp * [1.0, 0.70, 0.38][p.layer];
            /* 透明度：近层高、远层低，整体偏柔 */
            p.alpha = [0.72 + Math.random() * 0.28,
            0.40 + Math.random() * 0.30,
            0.18 + Math.random() * 0.20][p.layer];
            /* 独立钟摆相位 */
            p.swingT = Math.random() * Math.PI * 2;
            p.swingF = 0.005 + Math.random() * 0.010;
            p.swingA = (2.0 + Math.random() * 4.0) * [1.4, 1.0, 0.45][p.layer];
            p.rot = Math.random() * Math.PI * 2;
            p.rotV = (Math.random() - 0.5) * 0.006 * [1.6, 0.8, 0.3][p.layer];
            p.meltY = H * (0.84 + Math.random() * 0.16);

        } else if (type === 'fog') {
            p.w = 100 + Math.random() * 180;
            p.h = 24 + Math.random() * 48;
            p.vx = (0.12 + Math.random() * 0.28) * sp * (Math.random() > 0.5 ? 1 : -1);
            p.vy = (Math.random() - 0.5) * 0.04;
            p.alpha = 0.04 + Math.random() * 0.10;
            p.y = Math.random() * H;

        } else if (type === 'sakura') {
            p.r = 2.8 + Math.random() * 3.2;
            p.vx = (Math.random() - 0.5) * 1.0;
            p.vy = (0.45 + Math.random() * 0.80) * sp;
            p.alpha = 0.55 + Math.random() * 0.45;
            p.rot = Math.random() * Math.PI * 2;
            p.rotV = (Math.random() - 0.5) * 0.055;
            p.swingT = Math.random() * Math.PI * 2;
            p.swingA = 7 + Math.random() * 11;
            p.hue = Math.random() * 24 - 12;

        } else if (type === 'stars') {
            p.r = 0.7 + Math.random() * 2.0;
            p.alpha = 0.28 + Math.random() * 0.72;
            p.blink = Math.random() * Math.PI * 2;
            p.blinkR = 0.006 + Math.random() * 0.018;
            p.y = Math.random() * H;
            p.static = true;

        } else if (type === 'leaves') {
            p.r = 3.5 + Math.random() * 4.0;
            p.vx = (Math.random() - 0.5) * 1.6;
            p.vy = (0.5 + Math.random() * 1.3) * sp;
            p.alpha = 0.60 + Math.random() * 0.40;
            p.rot = Math.random() * Math.PI * 2;
            p.rotV = (Math.random() - 0.5) * 0.08;
            p.swingT = Math.random() * Math.PI * 2;
            p.swingA = 0.5 + Math.random() * 0.8;
            p.colorIdx = Math.floor(Math.random() * 4);
        }
        return p;
    }

    /* ================================================================
       小雨：细线段渐变（透明水丝）
       ================================================================ */
    function _drawRainStroke(ctx, p) {
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        const ex = p.x + cosA * p.len;
        const ey = p.y + sinA * p.len;

        /* 主体：头端透明 → 尾端有色 */
        const g = ctx.createLinearGradient(p.x, p.y, ex, ey);
        g.addColorStop(0, `rgba(200,225,245,0)`);
        g.addColorStop(0.40, `rgba(210,232,250,${(p.alpha * 0.50).toFixed(3)})`);
        g.addColorStop(1, `rgba(220,240,255,${p.alpha.toFixed(3)})`);

        ctx.save();
        ctx.strokeStyle = g;
        ctx.lineWidth = p.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        /* 尾端高光：极细白亮线，模拟水膜反光 */
        const hx = p.x + cosA * p.len * 0.68;
        const hy = p.y + sinA * p.len * 0.68;
        const g2 = ctx.createLinearGradient(hx, hy, ex, ey);
        g2.addColorStop(0, `rgba(255,255,255,0)`);
        g2.addColorStop(1, `rgba(255,255,255,${(p.alpha * 0.55).toFixed(3)})`);
        ctx.strokeStyle = g2;
        ctx.lineWidth = p.width * 0.40;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
    }

    /* ================================================================
       大雨：真实透明椭圆水滴
       物理原型：雨滴下落时受空气阻力呈扁球 / 拉长椭圆；
       玻璃感 = 极低填充透明 + 内部径向高光 + 边缘描边
       ================================================================ */
    function _drawRaindrop(ctx, p) {
        const cosA = Math.cos(p.angle - Math.PI / 2); // 沿运动方向
        const sinA = Math.sin(p.angle - Math.PI / 2);
        const tilt = p.angle - Math.PI / 2;           // 椭圆倾角跟随运动方向

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(tilt);

        const rw = p.rw;
        const rh = p.rh;

        /* ① 水滴主体：极透明蓝灰填充，模拟折射 */
        const bodyGrad = ctx.createRadialGradient(
            rw * 0.15, -rh * 0.20, 0,          // 高光中心（偏左上）
            0, 0, rh           // 整体扩散
        );
        bodyGrad.addColorStop(0, `rgba(240,248,255,${(p.alpha * 0.45).toFixed(3)})`); // 内部略亮
        bodyGrad.addColorStop(0.5, `rgba(200,225,245,${(p.alpha * 0.25).toFixed(3)})`);
        bodyGrad.addColorStop(1, `rgba(180,210,238,${(p.alpha * 0.12).toFixed(3)})`); // 边缘最透
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();

        /* ② 边缘描边：极细，模拟水滴表面张力光线 */
        ctx.strokeStyle = `rgba(210,235,255,${(p.alpha * 1.8).toFixed(3)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        /* ③ 内部高光弧：左上角一道白亮弧，模拟玻璃反光 */
        const hlGrad = ctx.createLinearGradient(-rw * 0.6, -rh * 0.7, rw * 0.1, -rh * 0.1);
        hlGrad.addColorStop(0, `rgba(255,255,255,${(p.alpha * 2.5).toFixed(3)})`);
        hlGrad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = hlGrad;
        ctx.lineWidth = rw * 0.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        /* 弧从左上到中间 */
        ctx.arc(0, 0, rh * 0.55, -Math.PI * 0.90, -Math.PI * 0.40, false);
        ctx.stroke();

        /* ④ 底部折射暗带：让水滴有立体感 */
        const darkGrad = ctx.createLinearGradient(0, rh * 0.4, 0, rh);
        darkGrad.addColorStop(0, `rgba(160,195,225,0)`);
        darkGrad.addColorStop(1, `rgba(140,180,215,${(p.alpha * 0.55).toFixed(3)})`);
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.ellipse(0, rh * 0.62, rw * 0.75, rh * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /* ================================================================
       溅击：椭圆涟漪 + 细小飞溅水珠
       ================================================================ */
    function _drawSplash(ctx, p) {
        const t = p.splashTime;
        const cx = p.splashX;
        const cy = p.splashY;
        const a = p.alpha;

        /* 涟漪圆环 */
        const rr = t * 7;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.50 * Math.min(a * 2.5, 1);
        ctx.strokeStyle = 'rgba(200,230,255,1)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr * 2.4, rr * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        /* 飞溅水珠（3~4粒，抛物线弧） */
        const drops = p.splashDrops || [];
        drops.forEach(d => {
            const dx = cx + d.vx * t * 22;
            const dy = cy + d.vy * t * 22 - 6 * t * (1 - t) * 14; // 抛物线
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.60 * a * 3;
            ctx.fillStyle = 'rgba(220,240,255,1)';
            ctx.beginPath();
            ctx.arc(dx, dy, d.r * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    /* ================================================================
       雪花：纯白柔光圆点 + 发光光晕
       设计参考：真实降雪拍摄照片 —— 远处雪花是白色虚化光斑，
       近处较大雪花是有层次的柔白圆，而非线条结晶（摄影景深效果）
       ================================================================ */
    function _drawSnowDot(ctx, x, y, r, alpha, layer) {
        ctx.save();
        ctx.translate(x, y);

        if (layer === 2) {
            /* 远景：单纯白点，微微发光 */
            ctx.globalAlpha = alpha;
            ctx.shadowColor = 'rgba(255,255,255,0.6)';
            ctx.shadowBlur = r * 2.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

        } else if (layer === 1) {
            /* 中景：柔边白圆 + 外晕 */
            /* 外层晕：大而模糊 */
            ctx.globalAlpha = alpha * 0.35;
            ctx.shadowColor = 'rgba(255,255,255,0.9)';
            ctx.shadowBlur = r * 5;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            /* 内核：亮白实心 */
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = r * 2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

        } else {
            /* 近景：大片雪花，三层叠加光晕，模拟镜头虚化白圆 */
            /* 最外层：大光晕，极透 */
            ctx.globalAlpha = alpha * 0.15;
            ctx.shadowColor = 'rgba(255,255,255,1)';
            ctx.shadowBlur = r * 8;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
            ctx.fill();
            /* 中层晕 */
            ctx.globalAlpha = alpha * 0.40;
            ctx.shadowBlur = r * 4;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
            ctx.fill();
            /* 内核：最亮，径向渐变（边缘略透，中心纯白） */
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = r * 1.5;
            const sg = ctx.createRadialGradient(
                -r * 0.25, -r * 0.25, 0,
                0, 0, r
            );
            sg.addColorStop(0, 'rgba(255,255,255,1)');
            sg.addColorStop(0.65, 'rgba(245,250,255,0.9)');
            sg.addColorStop(1, 'rgba(230,245,255,0.55)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            /* 顶部高光：小白点，让雪花有立体感 */
            ctx.globalAlpha = alpha * 0.80;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(-r * 0.22, -r * 0.28, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /* ================================================================
       主动画循环
       ================================================================ */
    function _animateWeather() {
        if (!_ctx || !_canvas) return;
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        const W = _canvas.width;
        const H = _canvas.height;
        const type = _wx.type;

        /* 景深排序：远层(layer大)先画，近层后画压在上面 */
        if (type === 'rain' || type === 'heavyrain' || type === 'snow') {
            _particles.sort((a, b) => (b.layer ?? 2) - (a.layer ?? 2));
        }

        for (let i = _particles.length - 1; i >= 0; i--) {
            const p = _particles[i];
            let dead = false;

            /* ========== 小雨 ========== */
            if (type === 'rain') {
                if (p.splash) {
                    p.splashTime += 0.055;
                    _drawSplash(_ctx, p);
                    if (p.splashTime >= 1) dead = true;
                } else {
                    p.windT += 0.010;
                    p.angle += Math.sin(p.windT) * p.windA;
                    _drawRainStroke(_ctx, p);
                    p.x += Math.cos(p.angle) * p.speed;
                    p.y += Math.sin(p.angle) * p.speed;
                    if (p.y >= H - 2) {
                        p.splash = true;
                        p.splashX = p.x;
                        p.splashY = H - 1;
                        p.splashTime = 0;
                        /* 溅射水珠 */
                        p.splashDrops = Array.from({ length: 3 }, () => ({
                            vx: (Math.random() - 0.5) * 1.4,
                            vy: -(0.3 + Math.random() * 0.6),
                            r: 0.8 + Math.random() * 0.8
                        }));
                    } else if (p.x < -60 || p.x > W + 60) { dead = true; }
                }

                /* ========== 大雨 ========== */
            } else if (type === 'heavyrain') {
                if (p.splash) {
                    p.splashTime += 0.065;
                    _drawSplash(_ctx, p);
                    if (p.splashTime >= 1) dead = true;
                } else {
                    p.windT += p.windFreq;
                    p.angle += Math.sin(p.windT) * p.windAmp;
                    _drawRaindrop(_ctx, p);
                    p.x += Math.cos(p.angle) * p.speed;
                    p.y += Math.sin(p.angle) * p.speed;
                    if (p.y >= H - p.rh) {
                        p.splash = true;
                        p.splashX = p.x;
                        p.splashY = H - 1;
                        p.splashTime = 0;
                        /* 较大溅射 */
                        p.splashDrops = Array.from({ length: 4 }, () => ({
                            vx: (Math.random() - 0.5) * 1.8,
                            vy: -(0.4 + Math.random() * 0.8),
                            r: 1.0 + Math.random() * 1.2
                        }));
                    } else if (p.x < -60 || p.x > W + 60) { dead = true; }
                }

                /* ========== 雪 ========== */
            } else if (type === 'snow') {
                p.swingT += p.swingF;
                p.rot += p.rotV;
                const swingX = Math.sin(p.swingT) * p.swingA;

                /* 接近地面减速消融 */
                const dg = p.meltY - p.y;
                let vyMult = 1;
                if (dg < 55) {
                    vyMult = Math.max(0.03, dg / 55);
                    p.alpha = Math.max(0, p.alpha - 0.0025);
                }

                _drawSnowDot(_ctx, p.x + swingX, p.y, p.r, p.alpha, p.layer);
                p.y += p.vy * vyMult;
                p.x += Math.cos(p.swingT * 0.22) * 0.12; /* 微弱风力漂移 */

                if (p.alpha <= 0.012 || p.y > H + p.r * 5) dead = true;
                if (p.x < -p.r * 5) p.x = W + p.r * 2;
                if (p.x > W + p.r * 5) p.x = -p.r * 2;

                /* ========== 雾 ========== */
            } else if (type === 'fog') {
                _ctx.save();
                _ctx.globalAlpha = p.alpha;
                const gf = _ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w / 2);
                gf.addColorStop(0, 'rgba(215,220,232,1)');
                gf.addColorStop(0.5, 'rgba(215,220,232,0.45)');
                gf.addColorStop(1, 'rgba(215,220,232,0)');
                _ctx.fillStyle = gf;
                _ctx.beginPath();
                _ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
                _ctx.fill();
                _ctx.restore();
                p.x += p.vx; p.y += p.vy;
                if (p.x > W + p.w / 2) p.x = -p.w / 2;
                if (p.x < -p.w / 2) p.x = W + p.w / 2;

                /* ========== 樱花 ========== */
            } else if (type === 'sakura') {
                p.swingT += 0.026;
                p.rot += p.rotV;
                _ctx.save();
                _ctx.globalAlpha = p.alpha;
                _ctx.translate(p.x + Math.sin(p.swingT) * p.swingA, p.y);
                _ctx.rotate(p.rot);
                _drawPetal(_ctx, p.r, p.hue);
                _ctx.restore();
                p.y += p.vy; p.x += p.vx * 0.4;
                if (p.y > H + p.r * 4) dead = true;

                /* ========== 星空 ========== */
            } else if (type === 'stars') {
                p.blink += p.blinkR;
                const sa = p.alpha * (0.50 + 0.50 * Math.sin(p.blink));
                _ctx.save();
                _ctx.globalAlpha = sa;
                _ctx.fillStyle = '#dde8ff';
                _ctx.shadowColor = '#8898ee';
                _ctx.shadowBlur = 8;
                _ctx.beginPath();
                _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                _ctx.fill();
                _ctx.restore();

                /* ========== 落叶 ========== */
            } else if (type === 'leaves') {
                p.swingT += 0.020;
                p.rot += p.rotV;
                _ctx.save();
                _ctx.globalAlpha = p.alpha;
                _ctx.translate(p.x + Math.sin(p.swingT) * p.swingA * 14, p.y);
                _ctx.rotate(p.rot);
                _ctx.fillStyle = ['#c8903a', '#d4623a', '#8ab040', '#b84828'][p.colorIdx];
                _drawLeaf(_ctx, p.r);
                _ctx.restore();
                p.y += p.vy; p.x += p.vx * 0.5;
                if (p.y > H + p.r * 4) dead = true;
                if (p.x < -p.r * 4) p.x = W + p.r * 2;
                if (p.x > W + p.r * 4) p.x = -p.r * 2;
            }

            if (dead) {
                _particles.splice(i, 1);
                _particles.push(_makeParticle(W, H, _wx.speed, false));
            }
        }

        _raf = requestAnimationFrame(_animateWeather);
    }

    /* ---- 樱花花瓣 ---- */
    function _drawPetal(ctx, r, hue) {
        const c0 = `hsl(${345 + (hue || 0)},80%,78%)`;
        const c1 = `hsl(${350 + (hue || 0)},72%,87%)`;
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i / 5) * Math.PI * 2);
            const g = ctx.createRadialGradient(0, -r * 1.1, 0, 0, -r * 1.1, r * 1.7);
            g.addColorStop(0, c0);
            g.addColorStop(1, c1 + '80');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, -r * 1.4, r * 0.62, r * 1.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = 'rgba(255,228,228,0.75)';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
    }

    /* ---- 落叶（贝塞尔 + 叶脉） ---- */
    function _drawLeaf(ctx, r) {
        ctx.beginPath();
        ctx.moveTo(0, -r * 2);
        ctx.bezierCurveTo(r * 1.3, -r * 1.1, r * 1.3, r * 0.9, 0, r * 2);
        ctx.bezierCurveTo(-r * 1.3, r * 0.9, -r * 1.3, -r * 1.1, 0, -r * 2);
        ctx.fill();
        ctx.save();
        ctx.globalAlpha *= 0.30;
        ctx.strokeStyle = 'rgba(255,255,200,0.85)';
        ctx.lineWidth = r * 0.11;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -r * 1.8); ctx.lineTo(0, r * 1.8); ctx.stroke();
        ctx.restore();
    }

    /* ================================================================
       Toast 提示
       ================================================================ */
    function _showToast(msg) {
        const screen = document.getElementById('phoneScreen');
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
        requestAnimationFrame(() => el.style.opacity = '1');
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 2200);
    }

    /* ================================================================
       初始化
       ================================================================ */
    function init() {
        _loadWP();
        _loadWX();
        _initCanvas();
        // 恢复壁纸（不影响小组件图片——壁纸用独立层，不污染 screen filter/background）
        if (_wp.dataURL) _applyToScreen();
        // 恢复天气
        if (_wx.type !== 'none') {
            _spawnParticles();
            _animateWeather();
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        open, close,
        pickImage,
        onStyleSlider, setFit,
        applyWallpaper, resetWallpaper,
        setWeather, onWeatherDensity, onWeatherSpeed
    };
})();
