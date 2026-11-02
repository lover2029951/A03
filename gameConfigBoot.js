// js/gameConfigBoot.js  (v3.3 · 5/5)
// ═══════════════════════════════════════════════════════════════════════
//  啟動編排：統一執行所有套用器
//
//  ⚠️ 本檔必須最後載入（在 Apply / Apply2 之後）。
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var CFG = window.HY && window.HY.GameConfig;
    if (!CFG) {
        console.error('[GameConfig 5/5] ✗ 找不到 HY.GameConfig');
        return;
    }
    if (CFG.__bootLoaded) return;
    CFG.__bootLoaded = true;

    var N = CFG.__native;
    if (!N) {
        console.error('[GameConfig 5/5] ✗ 找不到原生計時器（gameConfigSpeed.js 未載入？）');
        return;
    }

    CFG.__appliedOnce = false;
    CFG.__applying = false;

    // ═══════════════════════════════════════════════════════════════
    //  統一執行：捕捉原值 → 依序跑所有套用器 → 通知 hook → 重繪
    // ═══════════════════════════════════════════════════════════════
    function applyAll(force) {
        if (CFG.__applying) return;
        if (CFG.__appliedOnce && !force) return;

        var game = window.HY.game;
        if (!game) {
            N.setTimeout(function () { applyAll(force); }, 200);
            return;
        }

        CFG.__applying = true;
        CFG.__appliedOnce = true;

        // 1. 先捕捉原值（乘法型套用器需要）
        try {
            if (typeof CFG.__captureOrigRefs === 'function') CFG.__captureOrigRefs();
        } catch (e) { console.error('[CFG] capture refs', e); }

        // 2. 依序執行所有套用器
        var appliers = CFG.__appliers || [];
        appliers.forEach(function (fn, idx) {
            try {
                fn();
            } catch (e) {
                console.error('[CFG] applier #' + (idx + 1) + ' failed:', e);
            }
        });

        // 3. 通知其他模組（計時器重建、ATB 參數重讀）
        try {
            if (typeof game.onConfigReapplied === 'function') game.onConfigReapplied();
        } catch (e) { console.error('[CFG] hook', e); }

        // 4. 重繪
        try {
            if (typeof game.renderAll === 'function') game.renderAll();
        } catch (e) { console.error('[CFG] renderAll', e); }

        CFG.__applying = false;
    }

    CFG.__applyAll = applyAll;

    // ═══════════════════════════════════════════════════════════════
    //  啟動
    // ═══════════════════════════════════════════════════════════════
    function bootApply() {
        N.setTimeout(function () {
            applyAll(false);
            console.log('%c[GameConfig] ✓ 已套用自訂設定 ' + CFG.version + '（5 支子檔）',
                'color:#4ade80; font-weight:bold;');
            console.log('%c提示：頂部「🛠️ 作弊面板」可即時調整；Console 執行 HY.GameConfig.report()',
                'color:#94a3b8;');
        }, 400);
    }

    window.addEventListener('DOMContentLoaded', bootApply);

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        bootApply();
    }

    console.log('[GameConfig 5/5] ✓ 啟動編排已就緒');
})();