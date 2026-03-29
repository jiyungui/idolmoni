/* ============================================
   grid.js — 网格计算引擎
   参考 GIGI HomeScreen 架构
   ============================================ */

const Grid = (() => {

    const CONFIG = {
        COLUMNS: 3,
        ICON_SIZE: 56,
        GAP: 12,
        PADDING: 18,
        STATUS_H: 44,
        DOCK_H: 90,
    };

    /**
     * 根据容器实际宽度计算网格参数
     * @param {number} containerW - 手机内容区实际宽度
     * @param {number} containerH - 手机内容区实际高度
     */
    function calcParams(containerW, containerH) {
        const contentW = containerW - CONFIG.PADDING * 2;
        const maxCellW = (contentW - (CONFIG.COLUMNS - 1) * CONFIG.GAP) / CONFIG.COLUMNS;
        const cellSize = Math.min(CONFIG.ICON_SIZE, maxCellW);

        const availableH = containerH - CONFIG.DOCK_H - CONFIG.STATUS_H - CONFIG.GAP * 2;
        const rows = Math.max(1, Math.floor(availableH / (cellSize + CONFIG.GAP)));

        const gridContentW = cellSize * CONFIG.COLUMNS + CONFIG.GAP * (CONFIG.COLUMNS - 1);
        const gridLeftOffset = (contentW - gridContentW) / 2;

        return {
            COLUMNS: CONFIG.COLUMNS,
            ROWS: rows,
            CELL_SIZE: cellSize,
            GAP: CONFIG.GAP,
            PADDING: CONFIG.PADDING,
            LEFT_OFFSET: gridLeftOffset,
            CONTENT_W: contentW,
            APPS_PER_PAGE: CONFIG.COLUMNS * rows,
        };
    }

    /**
     * 将网格坐标转换为像素位置
     */
    function gridToPixel(gridX, gridY, params) {
        return {
            left: params.PADDING + params.LEFT_OFFSET + gridX * (params.CELL_SIZE + params.GAP),
            top: gridY * (params.CELL_SIZE + params.GAP),
        };
    }

    /**
     * 顺序排列图标到网格（排开小组件占用的位置）
     * @param {Array} apps - app列表
     * @param {Array} occupied - 已占用格子列表 [{gridX, gridY, gridW, gridH}]
     * @param {Object} params - 网格参数
     */
    function layoutApps(apps, occupied, params) {
        const result = [];
        let idx = 0;

        for (const app of apps) {
            const pos = findEmptyCell(idx, occupied, params);
            result.push({ ...app, ...pos });
            occupied.push({ gridX: pos.gridX, gridY: pos.gridY, gridW: 1, gridH: 1 });
            idx++;
        }
        return result;
    }

    function findEmptyCell(startIdx, occupied, params) {
        let col = startIdx % params.COLUMNS;
        let row = Math.floor(startIdx / params.COLUMNS);

        while (isOccupied(col, row, occupied)) {
            col++;
            if (col >= params.COLUMNS) { col = 0; row++; }
        }
        return { gridX: col, gridY: row };
    }

    function isOccupied(col, row, occupied) {
        return occupied.some(o =>
            col >= o.gridX && col < o.gridX + (o.gridW || 1) &&
            row >= o.gridY && row < o.gridY + (o.gridH || 1)
        );
    }

    return { calcParams, gridToPixel, layoutApps };
})();
