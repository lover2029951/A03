// js/bootLoader.js  (v34)
// 依 js/loadOrder.js 清單循序載入，並驗證每支檔案是否真的定義了預期全域。
//
// v34 修正（收尾整理）：
//   ⭐ main.js 納入 globals 驗證（原本無預期值 → 語法錯誤不會被攔截）
//   ⭐ loadOrder 內部版本號統一使用 cfg.version（已是 56）
window.HY = window.HY || {};

(function () {
    var cfg = window.HY_LOAD_CONFIG;
    var overlay = document.getElementById('hy-boot-overlay');
    var bar     = document.getElementById('hy-boot-bar');
    var txt     = document.getElementById('hy-boot-text');

    window.HY_BOOT = { loaded: [], failed: [], missing: [], done: false };

    function setProgress(done, total, label) {
        if (bar) bar.style.width = (total > 0 ? Math.floor((done / total) * 100) : 0) + '%';
        if (txt) txt.textContent = label;
    }

    function fatal(msg) {
        if (txt) { txt.innerHTML = msg; txt.style.color = '#fca5a5'; }
        if (bar) bar.style.background = 'linear-gradient(90deg,#b91c1c,#ef4444)';
        console.error('[HY BootLoader] ' + msg);
    }

    if (!cfg || !Array.isArray(cfg.files) || cfg.files.length === 0) {
        fatal('❌ 找不到載入清單：請確認 <b>js/loadOrder.js</b> 已載入並定義 <code>window.HY_LOAD_CONFIG</code>。');
        return;
    }

    var VERSION  = cfg.version || '1';
    var BASE     = cfg.basePath || './js/';
    var GLOBALS  = cfg.globals || {};
    var ABORT_ON_MISSING = (cfg.abortOnMissing !== false);

    var seen = {};
    var FILES = [];
    cfg.files.forEach(function (n) {
        if (!n || seen[n]) return;
        seen[n] = true;
        FILES.push(n);
    });
    var TOTAL = FILES.length;

    var nativeAdd = window.addEventListener;
    var pendingReady = [];
    var capturing = true;

    window.addEventListener = function (type, fn, opts) {
        if (capturing && type === 'DOMContentLoaded') {
            pendingReady.push(fn);
            return;
        }
        return nativeAdd.call(window, type, fn, opts);
    };

    function toUrl(name) {
        if (!name) return '';
        if (/^(https?:)?\/\//.test(name) || name.charAt(0) === '/' ||
            name.indexOf('./') === 0 || name.indexOf('../') === 0) {
            return name;
        }
        return BASE + name + '?v=' + VERSION;
    }

    function resolvePath(path) {
        if (!path) return undefined;
        var parts = String(path).split('.');
        var cur = window;
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function checkGlobal(name) {
        var expect = GLOBALS[name];
        if (!expect) return true;
        var val = resolvePath(expect);
        if (val === undefined || val === null) {
            window.HY_BOOT.missing.push({ file: name, global: expect, reason: '已載入但未定義' });
            console.error(
                '[HY BootLoader] ❌ ' + name + ' 已載入，但未定義 window.' + expect +
                '\n   → 該檔案可能有語法錯誤，或檔名／匯出物件不符。請在 Sources 面板開啟該檔檢查。'
            );
            return false;
        }
        return true;
    }

    var idx = 0;
    var retried = {};

    function next() {
        if (idx >= TOTAL) return finish();

        var name = FILES[idx];
        var src  = toUrl(name);

        setProgress(idx, TOTAL, '載入中 (' + (idx + 1) + '/' + TOTAL + ')：' + name);

        var s = document.createElement('script');
        s.src = src;
        s.async = false;

        s.onload = function () {
            window.HY_BOOT.loaded.push(name);
            checkGlobal(name);
            idx += 1;
            next();
        };

        s.onerror = function () {
            if (!retried[name]) {
                retried[name] = true;
                console.warn('[HY BootLoader] ⚠️ 首次載入失敗，重試中：' + src);
                setTimeout(next, 250);
                return;
            }

            window.HY_BOOT.failed.push(name);
            window.HY_BOOT.missing.push({
                file: name,
                global: GLOBALS[name] || '(未設定)',
                reason: '檔案載入失敗（404 或無法存取）'
            });
            console.error('[HY BootLoader] ❌ 載入失敗（已跳過）：' + src);
            idx += 1;
            next();
        };

        document.head.appendChild(s);
    }

    function showMissingReport() {
        if (!overlay) return;

        var rows = window.HY_BOOT.missing.map(function (m) {
            return '<li style="margin:5px 0; line-height:1.5;">' +
                '<code style="color:#fbbf24; font-weight:bold;">' + m.file + '</code>' +
                '<br><span style="color:#94a3b8; font-size:0.78rem;">' +
                    m.reason + ' → 預期 <code style="color:#38bdf8;">window.' + m.global + '</code>' +
                '</span>' +
            '</li>';
        }).join('');

        overlay.innerHTML =
            '<div style="max-width:720px; width:92%; background:#18202c; border:2px solid #ef4444; border-radius:8px; padding:20px; color:#e2e8f0; font-family:\'Microsoft JhengHei\',\'PingFang TC\',sans-serif;">' +
                '<h2 style="margin:0 0 10px; color:#f87171; font-size:1.15rem;">❌ 遊戲啟動失敗：' +
                    window.HY_BOOT.missing.length + ' 支檔案未正確載入</h2>' +
                '<p style="font-size:0.85rem; color:#94a3b8; margin:0 0 12px;">' +
                    '以下檔案的預期全域不存在，請確認檔案是否存在、檔名是否正確、以及是否有語法錯誤。' +
                '</p>' +
                '<ul style="font-size:0.85rem; padding-left:20px; margin:0 0 14px; max-height:46vh; overflow-y:auto;">' +
                    rows +
                '</ul>' +
                '<div style="background:#121822; border-left:3px solid #38bdf8; padding:10px 12px; border-radius:4px; font-size:0.8rem; color:#cbd5e1; line-height:1.7;">' +
                    '<b>排查步驟</b><br>' +
                    '1. 開啟瀏覽器 <b>DevTools → Console</b>，確認是否有紅色的 <code>SyntaxError</code> 指向某一支檔案。<br>' +
                    '2. 切到 <b>Network</b> 面板重新整理，檢查上述檔案是否回傳 <b>404</b>。<br>' +
                    '3. 確認檔案實際放在 <code>js/</code> 資料夾，且檔名大小寫完全一致。<br>' +
                    '4. 修正後按 <b>Ctrl + F5</b> 強制重新載入。' +
                '</div>' +
            '</div>';

        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    }

    function finish() {
        window.HY_BOOT.done = true;

        var missing = window.HY_BOOT.missing;

        if (missing.length > 0 && ABORT_ON_MISSING) {
            capturing = false;
            window.addEventListener = nativeAdd;
            pendingReady.length = 0;

            showMissingReport();

            console.group('[HY BootLoader] 載入結果');
            console.log('✅ 成功：' + window.HY_BOOT.loaded.length + ' / ' + TOTAL);
            console.table(missing.map(function (m) {
                return { 檔案: m.file, 原因: m.reason, 預期全域: 'window.' + m.global };
            }));
            console.groupEnd();
            return;
        }

        setProgress(TOTAL, TOTAL,
            missing.length > 0
                ? '⚠️ 完成（' + missing.length + ' 支檔案有問題，詳見 Console）'
                : '✅ 載入完成，啟動時空引擎…');

        capturing = false;
        window.addEventListener = nativeAdd;

        var queue = pendingReady.slice();
        pendingReady.length = 0;

        queue.forEach(function (fn, i) {
            try {
                fn(new Event('DOMContentLoaded'));
            } catch (e) {
                console.error('[HY BootLoader] 第 ' + (i + 1) + ' 個 DOMContentLoaded 回呼發生錯誤：', e);
            }
        });

        try {
            if (window.HY.game && typeof window.HY.game.renderAll === 'function') {
                window.HY.game.renderAll();
            }
        } catch (e) {
            console.error('[HY BootLoader] renderAll 發生錯誤：', e);
        }

        if (missing.length > 0) {
            console.warn('[HY BootLoader] 部分檔案有問題（遊戲仍嘗試啟動）：', missing);
        }

        if (overlay) {
            setTimeout(function () {
                overlay.style.transition = 'opacity 0.35s ease';
                overlay.style.opacity = '0';
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 380);
            }, 180);
        }

        console.log('[HY BootLoader] 載入完成：' + window.HY_BOOT.loaded.length + ' / ' + TOTAL + ' 支');
    }

    function start() { idx = 0; next(); }

    if (document.readyState === 'loading') {
        nativeAdd.call(window, 'DOMContentLoaded', start);
    } else {
        start();
    }
})();