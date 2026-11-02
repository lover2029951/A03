// js/offlineIdleSystem.js  (v31)
// 離線掛機結算
//
// ══ v31 修正 ══════════════════════════════════════════
//   移除「隨身時空艙・離線掛機效率總覽」底部的「🧪 診斷資訊」區塊
//   （Console 診斷 API 保留：HY.offlineSys.debug() / forceCheck() / setLastTs()）
//
// ══ v30 修正「拿不到收益」══════════════════════════════
//   ① 建構時機：改為 waitReady() 輪詢，直到 gainRewards 與 renderAll 就緒
//   ② 獨立時間戳 key：hy_offline_ts_v1（權威來源），rootState 僅作備援
//   ③ 移除「每 10 秒直接寫原始 rootState 到存檔 key」
//   ④ 全部外部呼叫加 try/catch 與型別檢查
//   ⑤ 新增診斷 API（Console 專用，不出現在 UI）
//   ⑥ 保留 showOfflineReportModal / openStatusModal 與 #offline-modal-body
//
// ══ v29 原有修正（保留）══════════════════════════════
//   移除硬寫的 localStorage key，統一讀 HY.SaveSystem.SAVE_KEY
window.HY = window.HY || {};

(function () {
    var TS_KEY = 'hy_offline_ts_v1';          // ★ 獨立時間戳（權威）
    var MAX_CURRENCY_MULT = 20;
    var MAX_EQUIP_DROPS   = 10;
    var MAX_GUILD_CYCLES  = 40;
    var MAX_EXP_CYCLES    = 20;

    var CFG = {
        MAX_OFFLINE_SECONDS: 86400,   // 單次最高累積 24 小時
        MIN_TRIGGER_SECONDS: 60,      // 低於此秒數不結算
        TICK_MS: 10000,               // 背景檢查間隔
        DIRECT_SAVE: false,           // ★ v30：不再直接寫原始 rootState
        VERBOSE: true
    };

    /* ══════════════════════════════════════════════════════
       工具
       ══════════════════════════════════════════════════════ */
    function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
    function log() {
        if (!CFG.VERBOSE) return;
        try { console.log.apply(console, ['[OfflineIdle]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }
    function warn() {
        try { console.warn.apply(console, ['[OfflineIdle]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }
    function safe(fn, d) { try { var v = fn(); return (v === undefined || v === null) ? d : v; } catch (e) { return d; } }

    function getSaveKey() {
        if (window.HY && window.HY.SaveSystem && typeof window.HY.SaveSystem.SAVE_KEY === 'string') {
            return window.HY.SaveSystem.SAVE_KEY;
        }
        if (window.HY && typeof window.HY.SAVE_KEY === 'string') return window.HY.SAVE_KEY;
        return 'HUANGYI_WEB_RPG_SAVE_V2';
    }

    /* ── 獨立時間戳讀寫 ── */
    function readTs() {
        try {
            var v = parseFloat(localStorage.getItem(TS_KEY));
            if (isFinite(v) && v > 0) return v;
        } catch (e) { /* 忽略 */ }
        return null;
    }
    function writeTs(t) {
        try { localStorage.setItem(TS_KEY, String(num(t, Date.now()))); } catch (e) { /* 忽略 */ }
        return t;
    }
    function readTsFromRoot(root) {
        var v = root && root.lastOnlineTimestamp;
        return (typeof v === 'number' && isFinite(v) && v > 0) ? v : null;
    }

    /* ══════════════════════════════════════════════════════
       主系統
       ══════════════════════════════════════════════════════ */
    class OfflineIdleSystem {
        constructor(app) {
            this.app = app;
            this.MAX_OFFLINE_SECONDS = CFG.MAX_OFFLINE_SECONDS;
            this.MIN_TRIGGER_SECONDS = CFG.MIN_TRIGGER_SECONDS;
            this.lastTickTime = Date.now();
            this._checked = false;
            this._ready = false;
            this._timer = null;

            this.injectTopBarButtonAndModalDOM();

            // ★ v30：等到系統就緒才做第一次結算
            this.waitReady(function () {
                this._ready = true;
                this.checkOfflineGainsOnLoad();
                this.bindLifecycleTracking();
            }.bind(this));

            log('建構完成（等待系統就緒…）');
        }

        /* ── 就緒輪詢 ── */
        waitReady(cb) {
            var self = this;
            var tries = 0;
            var maxTries = 120;   // 120 × 100ms = 12 秒
            function ready() {
                var app = self.app;
                if (!app) return false;
                if (!app.charSys || !app.charSys.rootState) return false;
                if (typeof app.charSys.gainRewards !== 'function') return false;
                if (typeof app.renderAll !== 'function') return false;
                return true;
            }
            function step() {
                tries += 1;
                if (ready()) {
                    log('系統已就緒（' + (tries * 100) + 'ms）');
                    try { cb(); } catch (e) { console.error('[OfflineIdle] 初始化回呼失敗：', e); }
                    return;
                }
                if (tries >= maxTries) {
                    warn('等待逾時（' + maxTries * 100 + 'ms），仍嘗試結算。');
                    try { cb(); } catch (e2) { /* 忽略 */ }
                    return;
                }
                setTimeout(step, 100);
            }
            step();
        }

        /* ══════════════════════════════════════════════════════
           UI（DOM 結構與 id 一律保留，供 offlineBridge.js 掛鉤）
           ══════════════════════════════════════════════════════ */
        injectTopBarButtonAndModalDOM() {
            var sysCtrl = document.querySelector('.system-controls');
            if (sysCtrl && !document.getElementById('btn-offline-pod')) {
                var btn = document.createElement('button');
                btn.id = 'btn-offline-pod';
                btn.className = 'sys-btn';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#34d399';
                btn.style.marginRight = '6px';
                btn.textContent = '🧘 離線掛機艙';

                var self = this;
                btn.addEventListener('click', function () { self.openStatusModal(); });
                sysCtrl.prepend(btn);
            }

            if (!document.getElementById('hy-offline-modal')) {
                var modal = document.createElement('div');
                modal.id = 'hy-offline-modal';
                modal.className = 'hidden';
                modal.style.cssText =
                    'position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:9999; ' +
                    'display:flex; align-items:center; justify-content:center; padding:16px;';

                modal.innerHTML =
                    '<div style="background:#18202c; border:2px solid #00e5ff; border-radius:8px; max-width:620px; width:100%; padding:18px; box-shadow:0 0 25px rgba(0,229,255,0.3); color:#e2e8f0;">' +
                        '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2e3b4e; padding-bottom:10px; margin-bottom:12px;">' +
                            '<h3 id="offline-modal-title" style="margin:0; color:#00e5ff; font-size:1.1rem;">🛸 馬博士時空艙・離線掛機系統</h3>' +
                            '<button id="btn-close-offline-modal" class="action-btn" style="padding:3px 10px;">✖ 關閉</button>' +
                        '</div>' +
                        '<div id="offline-modal-body" style="font-size:0.88rem; line-height:1.6; max-height:65vh; overflow-y:auto;"></div>' +
                        '<div style="margin-top:14px; text-align:right;">' +
                            '<button id="btn-confirm-offline-modal" class="btn-primary" style="padding:8px 20px;">✅ 收下歷練成果</button>' +
                        '</div>' +
                    '</div>';

                document.body.appendChild(modal);

                var closeFn = function () { modal.classList.add('hidden'); };
                document.getElementById('btn-close-offline-modal').addEventListener('click', closeFn);
                document.getElementById('btn-confirm-offline-modal').addEventListener('click', closeFn);
            }
        }

        getOfflineCombatProfile() {
            var app = this.app;
            var curMap = safe(function () { return app.timeSys.getCurrentMapData(); }, null);
            var enemies = (curMap && curMap.enemies) || [];
            var targetEnemy = safe(function () { return app.combatSys.lastEnemyTemplate; }, null)
                || enemies[0]
                || { name: '全息訓練木人', lv: 1, exp: 30, sp: 25, gold: 20 };

            var partySize = safe(function () { return app.partySys.getPartySize(); }, 1);
            partySize = Math.max(1, num(partySize, 1));

            var mainStats = safe(function () { return app.charSys.getDerivedStats(); }, {}) || {};
            var avgSpd = Math.max(1, num(mainStats.atkSpd, 105));
            var secondsPerWave = Math.max(3.5, Math.min(10, 850 / avgSpd));

            return {
                mapName: curMap ? curMap.name : '揚州城郊',
                enemy: targetEnemy,
                partySize: partySize,
                secondsPerWave: secondsPerWave
            };
        }

        /* ── 離線偵測（獨立時間戳） ── */
        checkOfflineGainsOnLoad() {
            var app = this.app;
            var root = app.charSys.rootState;
            var now = Date.now();

            var tsKey = readTs();               // 權威
            var tsRoot = readTsFromRoot(root);  // 相容備援
            var last = (tsKey != null) ? tsKey : tsRoot;

            log('離線偵測：獨立戳=' + (tsKey ? new Date(tsKey).toLocaleString() : '（無）') +
                '｜存檔戳=' + (tsRoot ? new Date(tsRoot).toLocaleString() : '（無）'));

            if (last != null) {
                var elapsedSec = Math.floor((now - last) / 1000);
                log('離線時長：' + elapsedSec + ' 秒（門檻 ' + this.MIN_TRIGGER_SECONDS + ' 秒）');
                if (elapsedSec >= this.MIN_TRIGGER_SECONDS) {
                    try {
                        this.processOfflineRewards(elapsedSec, '離線閉關歷練');
                    } catch (e) {
                        console.error('[OfflineIdle] 離線結算失敗：', e);
                    }
                } else {
                    log('未達門檻，不結算。');
                }
            } else {
                log('首次執行（無時間戳），僅記錄基準。');
            }

            // 更新兩個來源
            writeTs(now);
            root.lastOnlineTimestamp = now;
            this.lastTickTime = now;
            this._checked = true;
        }

        bindLifecycleTracking() {
            var self = this;

            // 存檔時順手更新時間戳（不覆寫 saveSystem 的行為）
            var saveSys = this.app.saveSys;
            if (saveSys && typeof saveSys.save === 'function' && !saveSys.__offIdleWrapped) {
                var origSave = saveSys.save.bind(saveSys);
                saveSys.save = function (silent) {
                    try {
                        var now = Date.now();
                        writeTs(now);
                        if (self.app && self.app.charSys && self.app.charSys.rootState) {
                            self.app.charSys.rootState.lastOnlineTimestamp = now;
                        }
                    } catch (e) { /* 忽略 */ }
                    return origSave(silent);
                };
                saveSys.__offIdleWrapped = true;
            }

            // 背景檢查（不再直接寫原始 rootState）
            if (!this._timer) {
                this._timer = setInterval(function () {
                    var now = Date.now();
                    var deltaSec = Math.floor((now - self.lastTickTime) / 1000);
                    self.lastTickTime = now;

                    if (deltaSec >= self.MIN_TRIGGER_SECONDS) {
                        log('背景掛機補償：' + deltaSec + ' 秒');
                        try { self.processOfflineRewards(deltaSec, '背景分頁掛機補償'); }
                        catch (e) { console.error('[OfflineIdle] 背景補償失敗：', e); }
                    }

                    try {
                        writeTs(now);
                        if (self.app && self.app.charSys && self.app.charSys.rootState) {
                            self.app.charSys.rootState.lastOnlineTimestamp = now;
                        }
                        if (CFG.DIRECT_SAVE) {
                            localStorage.setItem(getSaveKey(), JSON.stringify(self.app.charSys.rootState));
                        }
                    } catch (e) { /* 忽略 */ }
                }, CFG.TICK_MS);
            }

            // 關頁
            if (!window.__offIdleUnloadBound) {
                window.__offIdleUnloadBound = true;
                window.addEventListener('pagehide', function () {
                    try {
                        var n = Date.now();
                        writeTs(n);
                        var t = window.HY.game && window.HY.game.townSys;
                        if (t && t.charSys && t.charSys.rootState) t.charSys.rootState.lastOnlineTimestamp = n;
                    } catch (e) { /* 忽略 */ }
                });
                window.addEventListener('beforeunload', function () {
                    try {
                        var n = Date.now();
                        writeTs(n);
                        if (window.HY.game && window.HY.game.charSys && window.HY.game.charSys.rootState) {
                            window.HY.game.charSys.rootState.lastOnlineTimestamp = n;
                        }
                    } catch (e) { /* 忽略 */ }
                });
            }

            // 切回前景：立刻檢查一次
            if (!window.__offIdleVisibleBound) {
                window.__offIdleVisibleBound = true;
                document.addEventListener('visibilitychange', function () {
                    if (document.visibilityState !== 'visible') return;
                    var sys = window.HY.offlineSys;
                    if (!sys) return;
                    var now = Date.now();
                    var d = Math.floor((now - sys.lastTickTime) / 1000);
                    sys.lastTickTime = now;
                    if (d >= sys.MIN_TRIGGER_SECONDS) {
                        log('切回前景補償：' + d + ' 秒');
                        try { sys.processOfflineRewards(d, '切回前景掛機補償'); }
                        catch (e) { /* 忽略 */ }
                    }
                });
            }
        }

        /* ══════════════════════════════════════════════════════
           結算
           ══════════════════════════════════════════════════════ */
        processOfflineRewards(rawSeconds, sourceTitle) {
            var app = this.app;
            var sec = Math.min(this.MAX_OFFLINE_SECONDS, Math.max(0, Math.floor(rawSeconds)));
            if (sec < this.MIN_TRIGGER_SECONDS) return null;

            var profile = this.getOfflineCombatProfile();
            var enemy = profile.enemy;
            var pSize = profile.partySize;
            var waves = Math.max(1, Math.floor(sec / profile.secondsPerWave));
            var totalKills = Math.max(1, waves * pSize);

            var rawExp  = num(enemy.exp, 30) * totalKills;
            var rawSp   = num(enemy.sp, 20) * totalKills;
            var rawGold = num(enemy.gold, 20) * totalKills;

            var finalExp  = Math.max(1, Math.floor(rawExp / 5));
            var finalSp   = Math.max(1, Math.floor(rawSp / 10));
            var finalGold = Math.max(1, Math.floor(rawGold / 10));

            /* ── 發放（多路徑容錯） ── */
            var granted = false;
            if (app.charSys && typeof app.charSys.gainRewards === 'function') {
                try { app.charSys.gainRewards(finalExp, finalSp, finalGold); granted = true; }
                catch (e) { warn('gainRewards 失敗，改用手動發放：', e); }
            }
            if (!granted) {
                try {
                    var root = app.charSys.rootState;
                    root.exp = num(root.exp, 0) + finalExp;
                    root.sp  = num(root.sp, 0) + finalSp;
                    root.gold = num(root.gold, 0) + finalGold;
                    granted = true;
                } catch (e2) { warn('後備發放也失敗：', e2); }
            }
            log('已發放：經驗 +' + finalExp + '｜武點 +' + finalSp + '｜紋銀 +' + finalGold + '（' + (granted ? '成功' : '失敗') + '）');

            /* ── 打寶 / 通貨 ── */
            var droppedEquips = [];
            var droppedOrbs = {};
            var equipAddedCount = 0;
            var poeSys = app.poeSys;

            if (poeSys) {
                var sampleKills = Math.min(150, Math.max(1, totalKills));
                var multFactor = Math.max(1, Math.min(MAX_CURRENCY_MULT, Math.floor(totalKills / sampleKills)));

                for (var i = 0; i < sampleKills; i++) {
                    try {
                        var isMagicOrRare = (Math.random() * 100 < 35);
                        var mockEnemy = {
                            lv: num(enemy.lv, 1),
                            rarity: isMagicOrRare ? (Math.random() < 0.5 ? 'rare' : 'magic') : 'normal',
                            lootMult: isMagicOrRare ? 1.5 : 1.0
                        };

                        if (equipAddedCount < MAX_EQUIP_DROPS && typeof poeSys.rollEquipmentDropByEnemy === 'function') {
                            var eq = poeSys.rollEquipmentDropByEnemy(mockEnemy);
                            if (eq) {
                                equipAddedCount += 1;
                                droppedEquips.push((eq.rareTitle || '') + eq.name);
                            }
                        }

                        if (typeof poeSys.rollCurrencyDropByEnemy === 'function') {
                            var orb = poeSys.rollCurrencyDropByEnemy(mockEnemy);
                            if (orb) {
                                droppedOrbs[orb.name] = (droppedOrbs[orb.name] || 0) + multFactor;
                                if (multFactor > 1 && typeof poeSys.addCurrency === 'function') {
                                    poeSys.addCurrency(orb.id, multFactor - 1);
                                }
                            }
                        }
                    } catch (e) { /* 單次失敗不中斷 */ }
                }
            }

            /* ── 幫會建築 ── */
            var guildCycles = Math.min(MAX_GUILD_CYCLES, Math.floor(sec / 15));
            if (guildCycles > 0 && app.guildBuilding &&
                typeof app.guildBuilding.harvestAllBuildings === 'function') {
                for (var gIdx = 0; gIdx < guildCycles; gIdx++) {
                    try { app.guildBuilding.harvestAllBuildings(false); } catch (e) { break; }
                }
            } else {
                guildCycles = 0;
            }

            /* ── 靈獸探險 ── */
            var expCycles = Math.min(MAX_EXP_CYCLES, Math.floor(sec / 180));
            if (expCycles > 0 && app.salvageExpSys) {
                try {
                    var activePets = (typeof app.salvageExpSys.getExpeditionPetList === 'function')
                        ? app.salvageExpSys.getExpeditionPetList() : [];
                    if (activePets && activePets.length > 0 &&
                        typeof app.salvageExpSys.completeExpeditionCycle === 'function') {
                        for (var pIdx = 0; pIdx < expCycles; pIdx++) {
                            app.salvageExpSys.completeExpeditionCycle(activePets);
                        }
                    } else {
                        expCycles = 0;
                    }
                } catch (e) { expCycles = 0; }
            } else {
                expCycles = 0;
            }

            try { if (typeof app.renderAll === 'function') app.renderAll(); } catch (e) { /* 忽略 */ }

            var report = {
                title: '🛸 馬博士時空艙・' + sourceTitle + '報告',
                sec: sec,
                mapName: profile.mapName,
                enemyName: enemy.name,
                waves: waves,
                totalKills: totalKills,
                exp: finalExp,
                sp: finalSp,
                gold: finalGold,
                equips: droppedEquips,
                equipCount: equipAddedCount,
                orbs: droppedOrbs,
                guildCycles: guildCycles,
                expCycles: expCycles
            };

            this.showOfflineReportModal(report);
            log('結算完成', report);
            return report;
        }

        formatDuration(sec) {
            var h = Math.floor(sec / 3600);
            var m = Math.floor((sec % 3600) / 60);
            var s = sec % 60;
            var parts = [];
            if (h > 0) parts.push(h + ' 小時');
            if (m > 0) parts.push(m + ' 分');
            parts.push(s + ' 秒');
            return parts.join(' ');
        }

        /* ── 結算彈窗（保持 id 不變，供 offlineBridge.js 掛鉤） ── */
        showOfflineReportModal(report) {
            var modal = document.getElementById('hy-offline-modal');
            var titleEl = document.getElementById('offline-modal-title');
            var bodyEl = document.getElementById('offline-modal-body');
            if (!modal || !bodyEl) { warn('找不到彈窗 DOM'); return; }

            titleEl.textContent = report.title;

            var orbs = report.orbs || {};
            var orbStr = Object.keys(orbs).map(function (k) {
                return '💎 ' + k + ' x' + orbs[k];
            }).join('、') || '無';

            var eqStr = (report.equips && report.equips.length > 0)
                ? '🗡️ 獲得 ' + report.equipCount + ' 件裝備（' + report.equips.slice(0, 6).join('、') +
                  (report.equips.length > 6 ? '...' : '') + '）'
                : '無';

            bodyEl.innerHTML =
                '<div style="background:#121822; padding:12px; border-radius:6px; border-left:4px solid #00e5ff; margin-bottom:10px;">' +
                    '<div>⏱️ <strong>離線歷練時長</strong>：<span style="color:#00e5ff;">' + this.formatDuration(report.sec) + '</span> (最高累積 24 小時)</div>' +
                    '<div>📍 <strong>駐守歷練時空</strong>：' + report.mapName + ' — 迎戰【' + report.enemyName + '】</div>' +
                    '<div>⚔️ <strong>離線殲敵統計</strong>：共交鋒 <strong>' + report.waves + '</strong> 波，殲滅 <strong>' + report.totalKills + '</strong> 名敵人</div>' +
                '</div>' +
                '<div style="background:#121822; padding:12px; border-radius:6px; border-left:4px solid #fbbf24; margin-bottom:10px;">' +
                    '<h4 style="margin:0 0 6px 0; color:#fbbf24;">💰 戰鬥修為與財富收益</h4>' +
                    '<div>🎉 上陣隊員各獲經驗：<strong style="color:#4ade80;">+' + report.exp.toLocaleString() + '</strong></div>' +
                    '<div>📖 獲得武學點數：<strong class="sp-color">+' + report.sp.toLocaleString() + '</strong></div>' +
                    '<div>🪙 獲得大唐紋銀：<strong class="gold-color">+' + report.gold.toLocaleString() + ' 兩</strong></div>' +
                '</div>' +
                '<div style="background:#121822; padding:12px; border-radius:6px; border-left:4px solid #10b981;">' +
                    '<h4 style="margin:0 0 6px 0; color:#10b981;">🎁 離線打寶、幫會生產與靈獸探險</h4>' +
                    '<div>🗡️ 離線裝備掉落：' + eqStr + '</div>' +
                    '<div>💎 離線通貨掉落：' + orbStr + '</div>' +
                    '<div>🏯 幫會建築自動徵收：已完成 <strong>' + report.guildCycles + '</strong> 輪生產結算</div>' +
                    '<div>🐉 靈獸時空探險隊：已完成 <strong>' + report.expCycles + '</strong> 次探險收集</div>' +
                '</div>';

            modal.classList.remove('hidden');
        }

        /* ── 效率總覽（★ v31：已移除「🧪 診斷資訊」區塊） ── */
        openStatusModal() {
            var modal = document.getElementById('hy-offline-modal');
            var titleEl = document.getElementById('offline-modal-title');
            var bodyEl = document.getElementById('offline-modal-body');
            if (!modal || !bodyEl) { warn('找不到彈窗 DOM'); return; }

            var profile = this.getOfflineCombatProfile();
            var enemy = profile.enemy;
            var wavesPerHour = Math.floor(3600 / profile.secondsPerWave);
            var killsPerHour = wavesPerHour * profile.partySize;

            var rate = num(safe(function () { return this.app.charSys.rewardRate; }, 1), 1);
            var expPerHour  = Math.max(1, Math.floor((num(enemy.exp, 30) * killsPerHour) / 5));
            var spPerHour   = Math.max(1, Math.floor(((num(enemy.sp, 20) * killsPerHour) / 10) * rate));
            var goldPerHour = Math.max(1, Math.floor(((num(enemy.gold, 20) * killsPerHour) / 10) * rate));

            titleEl.textContent = '🧘 隨身時空艙・離線掛機效率總覽';
            bodyEl.innerHTML =
                '<p style="color:#94a3b8; margin-bottom:10px;">💡 關閉網頁、重整或切到背景超過 <strong>60 秒</strong> 時，系統會依當前時空地圖、上陣人數與出手攻速結算離線收益（單次最高 24 小時）。</p>' +
                '<div style="background:#121822; padding:12px; border-radius:6px; border:1px solid #2e3b4e;">' +
                    '<h4 style="color:#00e5ff; margin-bottom:6px;">📊 當前配置【每小時】預計收益</h4>' +
                    '<div>📍 當前掛機地圖：<strong>' + profile.mapName + ' (目標：' + enemy.name + ')</strong></div>' +
                    '<div>🚩 上陣隊伍人數：<strong>' + profile.partySize + ' 人</strong></div>' +
                    '<div>⚡ 平均交鋒速度：約 <strong>' + profile.secondsPerWave.toFixed(1) + ' 秒 / 波</strong></div>' +
                    '<hr style="border:none; border-top:1px dashed #334155; margin:8px 0;">' +
                    '<div>⚔️ 每小時預計殲敵：<strong>' + killsPerHour.toLocaleString() + ' 隻</strong></div>' +
                    '<div>🎉 每小時預計經驗：<strong style="color:#4ade80;">+' + expPerHour.toLocaleString() + ' / 人</strong></div>' +
                    '<div>📖 每小時預計武點：<strong class="sp-color">+' + spPerHour.toLocaleString() + '</strong></div>' +
                    '<div>🪙 每小時預計紋銀：<strong class="gold-color">+' + goldPerHour.toLocaleString() + ' 兩</strong></div>' +
                '</div>';

            modal.classList.remove('hidden');
        }

        /* ══════════════════════════════════════════════════════
           診斷 API（Console 專用，不出現在 UI）
           ══════════════════════════════════════════════════════ */
        debug() {
            var root = safe(function () { return this.app.charSys.rootState; }, null);
            var out = {
                config: CFG,
                ready: this._ready,
                checked: this._checked,
                tsKey: readTs(),
                tsKeyText: readTs() ? new Date(readTs()).toLocaleString() : null,
                tsRoot: readTsFromRoot(root),
                tsRootText: readTsFromRoot(root) ? new Date(readTsFromRoot(root)).toLocaleString() : null,
                now: Date.now(),
                elapsedSec: (function () {
                    var t = readTs() != null ? readTs() : readTsFromRoot(root);
                    return t ? Math.floor((Date.now() - t) / 1000) : null;
                })(),
                minTrigger: this.MIN_TRIGGER_SECONDS,
                maxOffline: this.MAX_OFFLINE_SECONDS,
                saveKey: getSaveKey(),
                localStorageKeys: (function () {
                    var ks = [];
                    try { for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); } catch (e) {}
                    return ks.filter(function (k) { return /offline|huangyi|hy_/i.test(k); });
                })(),
                profile: safe(function () { return this.getOfflineCombatProfile(); }, null)
            };
            console.log('%c=== OfflineIdleSystem 診斷 ===', 'color:#00e5ff;font-weight:bold');
            console.table({
                就緒: out.ready, 已檢查: out.checked,
                獨立戳: out.tsKeyText || '（無）', 存檔戳: out.tsRootText || '（無）',
                離線秒數: out.elapsedSec, 門檻: out.minTrigger
            });
            console.log('完整物件：', out);
            return out;
        }
        forceCheck() {
            var t = readTs() != null ? readTs() : readTsFromRoot(safe(function () { return this.app.charSys.rootState; }, null));
            if (t == null) { warn('沒有時間戳，先 setLastTs()'); return null; }
            var sec = Math.floor((Date.now() - t) / 1000);
            log('手動結算：' + sec + ' 秒');
            return this.processOfflineRewards(sec, '手動測試');
        }
        setLastTs(ms) {
            var v = num(ms, Date.now());
            writeTs(v);
            var root = safe(function () { return this.app.charSys.rootState; }, null);
            if (root) root.lastOnlineTimestamp = v;
            log('時間戳已設為：' + new Date(v).toLocaleString() + '（離線 ' + Math.floor((Date.now() - v) / 1000) + ' 秒）');
            return v;
        }
        reset() {
            try { localStorage.removeItem(TS_KEY); } catch (e) { /* 忽略 */ }
            log('時間戳已清除');
            return true;
        }
    }

    /* ══════════════════════════════════════════════════════
       啟動（DOMContentLoaded → 建立實例）
       ══════════════════════════════════════════════════════ */
    function boot() {
        if (window.HY.offlineSys) return true;
        var game = window.HY.game;
        if (!game) return false;
        window.HY.offlineSys = new OfflineIdleSystem(game);
        return true;
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(boot, 120);
    } else {
        window.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 120); });
    }

    // 保險：game 若較晚建立，補跑
    var tries = 0;
    var t2 = setInterval(function () {
        tries += 1;
        if (boot() || tries >= 60) clearInterval(t2);
    }, 300);

    window.HY.OfflineIdleSystem = OfflineIdleSystem;
    console.log('[OfflineIdle] ✓ v31 已載入（獨立時間戳 ＋ 就緒輪詢）');
})();