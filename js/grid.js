/* ========================================
   grid.js — 网格计算 & 运行时尺寸适配
   参考 GIGI 思路：存语义坐标，渲染时换算像素
   ======================================== */
const Grid = (() => {

    /* 读取手机屏幕实际可用宽度 */
    function getScreenWidth() {
        const screen = document.getElementById('phoneScreen');
        return screen ? screen.clientWidth : window.innerWidth;
    }

    /* 核心：动态计算图标尺寸并写入 CSS 变量
     * 规则（与 GIGI 思路一致）：
     *   - 3列布局，列间均分
     *   - 最大不超过 60px，最小不低于 40px
     *   - Dock 图标与 APP 图标共用同一变量
     */
    function calcAndApplyIconSize() {
        const screenW = getScreenWidth();
        const COLS = 3;
        const H_PAD = 28;          // 左右各14px
        const COL_GAP = 16;          // 列间距
        const MAX_SIZE = 60;
        const MIN_SIZE = 40;

        // 每列可用宽度
        const contentW = screenW - H_PAD;
        const cellW = (contentW - COL_GAP * (COLS - 1)) / COLS;
        // 图标占格子宽的 75%，留出左右余量
        const iconSize = Math.round(
            Math.min(MAX_SIZE, Math.max(MIN_SIZE, cellW * 0.75))
        );

        // 写入 CSS 变量，覆盖 reset.css 里的默认值
        document.documentElement.style.setProperty('--icon-size', iconSize + 'px');
    }

    /* 初始化 + 监听尺寸变化（横竖屏切换等） */
    function init() {
        calcAndApplyIconSize();
        window.addEventListener('resize', calcAndApplyIconSize);
    }

    document.addEventListener('DOMContentLoaded', init);

    return { calcAndApplyIconSize };
})();
