// js/responsiveLayoutSystem.js  (v29)
// 使遊戲畫面隨視窗大小自動相容（4K/2K、筆電、分割視窗、平板、手機）
//
// v29 修正：
//   ⭐ #game-container 由 max-width:100vw 改為 1800px 並置中：
//      4K 下中間欄原本會被撐到 ~3160px，卡片變得細長難以閱讀
//   ⭐ 窄視窗的 #log-panel 改為 flex-direction: row !important
//      以覆蓋 uiLogPanels 注入的 `flex-direction: column !important`
window.HY = window.HY || {};

(function () {
    class ResponsiveLayoutSystem {
        constructor() {
            this.scaleMode = 'fluid';
            this.injectResponsiveStyles();
            this.injectTopBarControl();
            this.bindResizeListener();
            this.applyViewportAdaptation();
        }

        injectResponsiveStyles() {
            var style = document.createElement('style');
            style.id = 'hy-responsive-style';
            style.innerHTML =
                ':root {' +
                    '--hy-left-w: 300px;' +
                    '--hy-right-w: 330px;' +
                    '--hy-base-font: 14px;' +
                '}' +
                'html { font-size: var(--hy-base-font); }' +
                'body { width: 100vw; height: 100vh; height: 100dvh; overflow: hidden; margin: 0; }' +

                /* 主容器隨視窗滿版（4K 下封頂並置中，避免中間欄過寬） */
                '#game-container {' +
                    'width: 100%;' +
                    'max-width: 1800px;' +
                    'margin: 0 auto;' +
                    'height: 100vh;' +
                    'height: 100dvh;' +
                    'padding: clamp(4px, 0.7vw, 12px);' +
                    'gap: clamp(4px, 0.7vh, 10px);' +
                    'transform-origin: top left;' +
                '}' +

                '#top-bar {' +
                    'padding: clamp(6px, 1vh, 12px) clamp(10px, 1.5vw, 20px);' +
                    'flex-wrap: wrap;' +
                    'gap: 8px;' +
                '}' +

                /* 三欄主體 */
                '#main-content {' +
                    'display: grid;' +
                    'grid-template-columns: var(--hy-left-w) minmax(0, 1fr) var(--hy-right-w);' +
                    'gap: clamp(6px, 0.8vw, 12px);' +
                    'flex: 1 1 auto;' +
                    'min-height: 0;' +
                '}' +

                '#character-panel, #center-stage, #log-panel {' +
                    'width: 100%;' +
                    'min-width: 0;' +
                    'min-height: 0;' +
                    'padding: clamp(8px, 1vw, 14px);' +
                '}' +

                /* 使用 :where() 降低優先度，讓 UIDexAtb 的固定版面能覆蓋 */
                ':where(.fixed-unit-slot) {' +
                    'padding: clamp(3px, 0.5vh, 6px) 8px;' +
                '}' +
                ':where(.fixed-affix-line) {' +
                    'line-height: 1.35;' +
                '}' +

                /* 中小型視窗：雙欄 + 底部日誌列 */
                '@media (max-width: 1150px) {' +
                    'body, #game-container { height: auto; min-height: 100vh; overflow-y: auto; }' +
                    '#main-content {' +
                        'grid-template-columns: 280px minmax(0, 1fr);' +
                        'grid-template-rows: auto auto;' +
                        'overflow: visible;' +
                    '}' +
                    '#log-panel {' +
                        'grid-column: 1 / -1;' +
                        'height: 420px;' +
                        'flex-direction: row !important;' +   /* ⭐ 覆蓋 uiLogPanels 的 !important */
                    '}' +
                '}' +

                /* 平板與手機窄視窗：單欄垂直佈局 */
                '@media (max-width: 820px) {' +
                    '#main-content {' +
                        'grid-template-columns: 1fr;' +
                    '}' +
                    '#log-panel {' +
                        'flex-direction: column !important;' +
                        'height: 560px;' +
                    '}' +
                '}';

            document.head.appendChild(style);
        }

        injectTopBarControl() {
            var sysCtrl = document.querySelector('.system-controls');
            if (!sysCtrl || document.getElementById('btn-toggle-responsive')) return;

            var btn = document.createElement('button');
            btn.id = 'btn-toggle-responsive';
            btn.className = 'sys-btn';
            btn.style.borderColor = '#00e5ff';
            btn.style.color = '#00e5ff';
            btn.style.marginRight = '6px';
            btn.textContent = '📐 畫面：智慧自適應';

            var self = this;
            btn.addEventListener('click', function () {
                self.scaleMode = (self.scaleMode === 'fluid') ? 'zoom' : 'fluid';
                btn.textContent = self.scaleMode === 'fluid'
                    ? '📐 畫面：智慧自適應'
                    : '📐 畫面：等比縮放';
                self.applyViewportAdaptation();
            });

            sysCtrl.prepend(btn);
        }

        bindResizeListener() {
            var self = this;
            var resizeTimer = null;
            window.addEventListener('resize', function () {
                if (resizeTimer) cancelAnimationFrame(resizeTimer);
                resizeTimer = requestAnimationFrame(function () {
                    self.applyViewportAdaptation();
                });
            });
        }

        applyViewportAdaptation() {
            var vw = window.innerWidth || 1440;
            var vh = window.innerHeight || 900;
            var root = document.documentElement;
            var container = document.getElementById('game-container');

            // 模式 A：等比縮放
            if (this.scaleMode === 'zoom' && vw > 820) {
                var baseW = 1520;
                var baseH = 900;
                var scale = Math.min(vw / baseW, vh / baseH);
                if (container) {
                    container.style.width = baseW + 'px';
                    container.style.height = baseH + 'px';
                    container.style.transform = 'scale(' + scale.toFixed(4) + ')';
                }
                root.style.setProperty('--hy-left-w', '300px');
                root.style.setProperty('--hy-right-w', '330px');
                root.style.setProperty('--hy-base-font', '14px');
                return;
            }

            // 模式 B：智慧流式
            if (container) {
                container.style.width = '100%';
                container.style.height = '100dvh';
                container.style.transform = 'none';
            }

            var leftW = Math.max(245, Math.min(330, Math.floor(vw * 0.195)));
            var rightW = Math.max(255, Math.min(350, Math.floor(vw * 0.21)));
            var baseFont = vw >= 1800 ? 15 : (vw <= 1280 ? 13 : 14);

            root.style.setProperty('--hy-left-w', leftW + 'px');
            root.style.setProperty('--hy-right-w', rightW + 'px');
            root.style.setProperty('--hy-base-font', baseFont + 'px');
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        window.HY.responsiveSys = new ResponsiveLayoutSystem();
    });

    window.HY.ResponsiveLayoutSystem = ResponsiveLayoutSystem;
})();