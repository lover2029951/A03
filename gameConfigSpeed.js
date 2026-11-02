// js/gameConfigSpeed.js  (v3.3 · 2/5)
// ═══════════════════════════════════════════════════════════════════════
//  速度引擎：攔截全域 setInterval / setTimeout
//
//  ⚠️ 本檔必須接在 gameConfig.js 之後、其他遊戲檔案之前載入。
//     它會在載入時抓住原生計時器，然後覆寫。
//  ⚠️ 本檔只做「計時器接管」與「速度 API」，不含其他套用器。
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var CFG = window.HY && window.HY.GameConfig;
    if (!CFG) {
        console.error('[GameConfig 2/5] ✗ 找不到 HY.GameConfig（請確認 gameConfig.js 先載入）');
        return;
    }
    if (CFG.__speedLoaded) return;   // 防重入
    CFG.__speedLoaded = true;

    // ── 抓住原生計時器（必須在任何覆寫前）──
    var N = {
        setInterval:  window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        setTimeout:   window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window)
    };
    CFG.__native = N;

    // ── 排程器狀態 ──
    var S = {
        seq: 0,
        tasks: {},           // id -> { cb, args, baseMs, acc }
        timer: null,         // 原生計時器（排程器本身）
        BASE_MS: 20,         // 排程器醒來間隔
        LAST: 0,
        BOOT_TS: Date.now()
    };
    CFG.__sched = S;

    function now() {
        return (window.performance && window.performance.now)
            ? window.performance.now()
            : Date.now();
    }

    function intervalMult() {
        var s = CFG.speed;
        if (!s || s.enabled === false) return 1;
        var g = (typeof s.global === 'number' && s.global > 0) ? s.global : 1;
        var i = (typeof s.intervalScale === 'number' && s.intervalScale > 0) ? s.intervalScale : 1;
        return Math.max(0.01, Math.min(1000, g * i));
    }

    function timeoutMult() {
        var s = CFG.speed;
        if (!s || s.enabled === false) return 1;
        var g = (typeof s.global === 'number' && s.global > 0) ? s.global : 1;
        var t = (typeof s.timeoutScale === 'number' && s.timeoutScale > 0) ? s.timeoutScale : 1;
        return Math.max(0.01, Math.min(1000, g * t));
    }

    // ── 排程器心跳 ──
    function tick() {
        var t = now();
        var dt = t - S.LAST;
        S.LAST = t;
        if (dt <= 0) return;
        if (dt > 2000) dt = 2000;   // 背景分頁回來時不暴衝

        var mul = intervalMult();
        var ids = Object.keys(S.tasks);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var task = S.tasks[id];
            if (!task) continue;
            task.acc += dt * mul;

            var guard = 0;
            while (task.acc >= task.baseMs && guard < 30) {
                task.acc -= task.baseMs;
                guard++;
                try {
                    task.cb.apply(null, task.args);
                } catch (e) {
                    console.error('[GameConfig interval error]', e);
                }
                if (!S.tasks[id]) break;
            }
        }
    }

    S.LAST = now();
    S.timer = N.setInterval(tick, S.BASE_MS);

    // ── 覆寫 setInterval / clearInterval ──
    window.setInterval = function (cb, ms) {
        if (typeof cb !== 'function') return N.setInterval.apply(null, arguments);
        var args = Array.prototype.slice.call(arguments, 2);
        var baseMs = Math.max(1, parseInt(ms, 10) || 1);
        var id = ++S.seq;
        S.tasks[id] = { cb: cb, args: args, baseMs: baseMs, acc: 0 };
        return id;
    };

    window.clearInterval = function (id) {
        if (S.tasks[id]) { delete S.tasks[id]; return; }
        return N.clearInterval(id);
    };

    // ── 覆寫 setTimeout / clearTimeout（開機保護期內不縮放）──
    window.setTimeout = function (cb, ms) {
        if (typeof cb !== 'function') return N.setTimeout.apply(null, arguments);
        var args = Array.prototype.slice.call(arguments, 2);
        var delay = Math.max(1, parseInt(ms, 10) || 1);
        if (Date.now() - S.BOOT_TS > (CFG.speed.bootGuardMs || 800)) {
            delay = Math.max(1, Math.round(delay / timeoutMult()));
        }
        return N.setTimeout(function () { cb.apply(null, args); }, delay);
    };

    window.clearTimeout = function (id) {
        return N.clearTimeout(id);
    };

    // ── 速度控制 API ──
    CFG.speed.get = function () { return CFG.speed.global; };

    CFG.speed.set = function (mult) {
        var s = CFG.speed;
        var v = parseFloat(mult);
        if (isNaN(v) || v <= 0) return s.global;
        v = Math.max(s.minMult || 0.1, Math.min(s.maxMult || 20, v));
        s.global = Math.round(v * 100) / 100;
        console.log('[GameConfig] ⚡ 遊戲速度 → ' + s.global + ' 倍');
        return s.global;
    };

    CFG.speed.preset = function (mult) { return CFG.speed.set(mult); };
    CFG.speed.reset = function () { return CFG.speed.set(1); };

    // ── 鍵盤快捷鍵 ──
    if (CFG.speed.enableHotkeys) {
        window.addEventListener('keydown', function (e) {
            var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

            var step = CFG.speed.hotkeyStep || 0.5;
            if (e.key === '[') { CFG.speed.set(CFG.speed.global - step); }
            else if (e.key === ']') { CFG.speed.set(CFG.speed.global + step); }
            else if (e.key === '\\') { CFG.speed.reset(); }
        });
    }

    console.log('[GameConfig 2/5] ✓ 速度引擎已啟動');
})();