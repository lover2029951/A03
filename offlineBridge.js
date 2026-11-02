// js/offlineBridge.js (v2)
// ⭐ 離線掛機收益（好友）＋ 與 offlineIdleSystem.js 整合
//
// 【v2 新增】與原版離線系統共存
//   • 自動偵測 HY.OfflineIdleSystem
//   • 若存在 → 不自己彈窗，改成「附加區塊」注入原版彈窗（#hy-offline-modal）
//     - showOfflineReportModal  → 追加好友收益區塊
//     - openStatusModal         → 追加好友效率預覽
//   • 若不存在 → 維持自己的彈窗（獨立運作）
//
// 【修正重點（原樣保留）】
//   ① localStorage 心跳（每 15 秒 + 關頁 + 切背景）
//   ② 補算前歸零 t._fr2LastTicks → 解開 friendPartySystem 的「單次最多 3 期」上限
//   ③ 補算前後快照比對 → 精確算出獲得什麼
//   ④ 停用內建 friendOffline() 避免重複計算
//   ⑤ 6 種離線模式（取自 LinkContent.OFFLINE_MODES）
//
// Console：
//   HY.OfflineBridge.run()             // 手動結算
//   HY.OfflineBridge.report()          // 上次結果
//   HY.OfflineBridge.mode('om_quest')  // 切換模式
//   HY.OfflineBridge.integrate()       // 手動重新嘗試整合
//   HY.OfflineBridge.status()          // 目前是「整合模式」還是「獨立模式」
//
// ⚠️ 載入順序：friendUnifySystem.js 之後（建議）
window.HY = window.HY || {};

(function () {
  var LS_HB = 'hy_offline_hb_v1';
  var LS_MODE = 'hy_offline_mode_v1';
  var MASK_ID = 'hy-offline-mask';
  var STYLE_ID = 'hy-offline-style';
  var BLOCK_ID = 'hy-ob-friend-block';

  var CFG = {
    MIN_AWAY_MS: 60000,
    MAX_TICKS: 600,
    HEARTBEAT_MS: 15000,
    MODE_BONUS: true,
    SHOW_POPUP: true,      // 獨立模式下才用
    QUIET_UNDER: 3,
    AUTO_MODE: 'om_balance',
    INTEGRATE: true,       // ★ 偵測到原版離線系統時自動整合
    REUSE_MS: 600000       // 報告 10 分鐘內直接沿用（避免被原版彈窗重複觸發）
  };

  var _lastReport = null;
  var _busy = false;
  var _hbTimer = null;
  var _integrated = false;
  var _wrapTries = 0;

  window.HY.OfflineBridge = {
    version: '2.0',
    ready: false,
    config: function (o) { if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; }); return CFG; },
    run: function () { return runOnce(true); },
    report: function () { return _lastReport; },
    heartbeat: function () { return writeHeartbeat(); },
    mode: function (id) { return setMode(id); },
    currentMode: function () { return getModeId(); },
    modes: function () { var C = window.HY.LinkContent; return (C && C.OFFLINE_MODES) || []; },
    open: function () { return showReport(_lastReport); },
    integrate: function () { return integrate(); },
    status: function () {
      return {
        integrated: _integrated,
        mode: _integrated ? '整合（附加於原版彈窗）' : '獨立（自有彈窗）',
        hasOriginal: hasOriginal(),
        wrapped: _wrappedFns.slice(),
        lastReport: !!_lastReport
      };
    }
  };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function esc(s) { return String(s == null ? '' : s); }
  function T() { return window.HY.game && window.HY.game.townSys; }
  function safe(fn, d) { try { var v = fn(); return (v === undefined || v === null) ? d : v; } catch (e) { return d; } }
  function tickMs() {
    var v = safe(function () { return window.HY.Data.TOWN.FRIEND.CONFIG.TICK_MS; }, 3000);
    return Math.max(1000, num(v, 3000));
  }
  function hasOriginal() {
    return !!(window.HY.OfflineIdleSystem && window.HY.OfflineIdleSystem.prototype &&
      typeof window.HY.OfflineIdleSystem.prototype.showOfflineReportModal === 'function');
  }

  /* ══════════════════════════════════════════════════════
     心跳
     ══════════════════════════════════════════════════════ */
  function readHb() {
    try {
      var raw = localStorage.getItem(LS_HB);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.at) return null;
      return o;
    } catch (e) { return null; }
  }
  function writeHeartbeat() {
    var t = T();
    if (!t) return null;
    var hb = {
      at: Date.now(),
      ticks: safe(function () { return t.friendState().ticks; }, 0),
      gold: safe(function () { return t.frUniGold ? t.frUniGold() : t.charSys.rootState.gold; }, 0),
      friends: safe(function () { return t.friendAll().length; }, 0)
    };
    try { localStorage.setItem(LS_HB, JSON.stringify(hb)); } catch (e) { /* 忽略 */ }
    return hb;
  }

  /* ══════════════════════════════════════════════════════
     離線模式
     ══════════════════════════════════════════════════════ */
  function getModeId() {
    var v = null;
    try { v = localStorage.getItem(LS_MODE); } catch (e) { /* 忽略 */ }
    var C = window.HY.LinkContent;
    var list = (C && C.OFFLINE_MODES) || [];
    var ok = false;
    list.forEach(function (m) { if (m.id === v) ok = true; });
    if (ok) return v;
    var t = T();
    var f = safe(function () { return t.friendAll()[0]; }, null);
    if (f && f.offlineMode) return f.offlineMode;
    return CFG.AUTO_MODE;
  }
  function setMode(id) {
    var C = window.HY.LinkContent;
    var list = (C && C.OFFLINE_MODES) || [];
    var found = null;
    list.forEach(function (m) { if (m.id === id) found = m; });
    if (!found) { console.warn('[OfflineBridge] 未知模式：' + id); return null; }
    try { localStorage.setItem(LS_MODE, id); } catch (e) { /* 忽略 */ }
    var t = T();
    if (t && t.friendAll) t.friendAll().forEach(function (f) { f.offlineMode = id; });
    console.log('[OfflineBridge] ✓ 離線模式：' + found.icon + found.name);
    return found;
  }
  function modeDef() {
    var C = window.HY.LinkContent;
    var list = (C && C.OFFLINE_MODES) || [];
    var id = getModeId(), out = null;
    list.forEach(function (m) { if (m.id === id) out = m; });
    return out || list[5] || { id: 'om_balance', name: '均衡發展', icon: '⚖️', eff: 0.58,
      out: { expMul: 0.9, goldMul: 0.9, dropMul: 0.9, spMul: 0.7 } };
  }

  /* ══════════════════════════════════════════════════════
     快照
     ══════════════════════════════════════════════════════ */
  function snapshot() {
    var t = T();
    if (!t) return null;
    var root = t.charSys.rootState;
    var s = {
      gold: num(root.gold, 0),
      sp: num(root.sp, 0),
      mats: safe(function () { return t.frUniMatTotal ? t.frUniMatTotal() : 0; }, 0),
      items: safe(function () { return t.frUniItems ? t.frUniItems().length : 0; }, 0),
      friends: safe(function () { return t.friendAll().length; }, 0),
      lvSum: 0, powSum: 0, kills: 0, drops: 0, goldEarned: 0, spEarned: 0,
      ticks: safe(function () { return t.friendState().ticks; }, 0),
      clear: safe(function () { return t.fr2ExpState().clears; }, 0),
      wb: safe(function () { return t.fr3WbState().kills; }, 0),
      quest: safe(function () { return t.fr2QuestState().done; }, 0),
      mail: safe(function () { return t.fr2MailState().list.length; }, 0),
      homeGift: safe(function () { return t.fr3HomeState().totalGifted; }, 0),
      aucSold: safe(function () { return t.fr3AucState().sold; }, 0),
      bond: safe(function () { return t.fr2BondState().list.length; }, 0),
      salvage: safe(function () { return t.fr6State().stats.salvages; }, 0),
      pills: safe(function () { return t.fr4State().stats.pills; }, 0),
      forged: safe(function () { return t.fr4State().stats.forged; }, 0)
    };
    safe(function () {
      t.friendAll().forEach(function (f) {
        s.lvSum += num(f.lv, 1);
        s.powSum += num(t.friendPower(f), 0);
        s.kills += num(f.kills, 0);
        s.drops += num(f.drops, 0);
        s.goldEarned += num(f.goldEarned, 0);
        s.spEarned += num(f.spEarned, 0);
      });
    });
    return s;
  }
  function diff(a, b) {
    var out = {};
    if (!a || !b) return out;
    Object.keys(b).forEach(function (k) {
      var d = num(b[k], 0) - num(a[k], 0);
      if (d !== 0) out[k] = d;
    });
    return out;
  }

  /* ── 補算（★ 歸零 tick 標記解開 3 期上限） ── */
  function runCatchUp(n) {
    var t = T();
    if (!t || n <= 0) return 0;
    var done = 0;
    try { t._fr2LastTicks = num(t.friendState().ticks, 0); } catch (e) { /* 忽略 */ }
    var oldQuiet = t._friendQuiet;
    t._friendQuiet = true;   // 靜音，避免刷爆事件紀錄
    for (var i = 0; i < n; i++) {
      try { t.friendTick(true); done += 1; }
      catch (e) { console.error('[OfflineBridge] 補算第 ' + i + ' 期失敗：', e); break; }
    }
    t._friendQuiet = oldQuiet;
    return done;
  }

  /* ── 模式加成 ── */
  function applyModeBonus(ticks, powSum) {
    if (!CFG.MODE_BONUS) return null;
    var t = T();
    var m = modeDef();
    var eff = num(m.eff, 0.58);
    var o = m.out || {};
    var cnt = Math.max(1, safe(function () { return t.friendAll().length; }, 1));
    var pow = Math.max(100, num(powSum, 100) / cnt);
    var gain = {
      mode: m,
      gold:  Math.round(pow * 0.012 * ticks * eff * num(o.goldMul, 1)),
      exp:   Math.round(pow * 0.020 * ticks * eff * num(o.expMul, 1)),
      sp:    Math.round(ticks * eff * num(o.spMul, 0.7) * 2),
      mats:  Math.round(ticks * eff * num(o.matMul, 1) * 0.12),
      drops: Math.round(ticks * eff * num(o.dropMul, 0.9) * 0.04)
    };
    if (gain.gold > 0) safe(function () { t.frUniAddGold(gain.gold); });
    if (gain.sp > 0) safe(function () { t.frUniAddSp(gain.sp); });
    if (gain.mats > 0) {
      var pool = ['wood', 'stone', 'iron', 'jade', 'herb', 'ore', 'silk', 'pelt', 'fish'];
      var id = pool[Math.floor(Math.random() * pool.length)];
      safe(function () { t.frUniMats()[id] = num(t.frUniMats()[id], 0) + gain.mats; });
      gain.matId = id;
    }
    if (gain.drops > 0) {
      var got = 0;
      for (var i = 0; i < gain.drops; i++) {
        var eq = safe(function () { return t.friendRollEquip(Math.max(1, t.fr2PlayerLv())); }, null);
        if (eq && safe(function () { return t.frUniStore(eq); }, false)) got += 1;
      }
      gain.drops = got;
    }
    return gain;
  }

  /* ── 主流程 ── */
  function runOnce(manual) {
    if (_busy) { console.warn('[OfflineBridge] 正在結算中'); return null; }
    var t = T();
    if (!t) { console.warn('[OfflineBridge] 好友系統尚未就緒'); return null; }

    var hb = readHb();
    if (!hb) { writeHeartbeat(); return null; }

    var awayMs = Date.now() - num(hb.at, Date.now());
    if (!manual && awayMs < num(CFG.MIN_AWAY_MS, 60000)) { writeHeartbeat(); return null; }

    var ms = tickMs();
    var awayTicks = Math.floor(awayMs / ms);
    var ticks = Math.min(awayTicks, num(CFG.MAX_TICKS, 600));
    if (!manual && ticks < 1) { writeHeartbeat(); return null; }

    _busy = true;
    var a = snapshot();
    var done = runCatchUp(ticks);
    var b = snapshot();
    var bonus = applyModeBonus(done, b ? b.powSum : 0);
    var b2 = snapshot();
    var d2 = diff(a, b2);

    var rep = {
      at: Date.now(), awayMs: awayMs, awayText: human(awayMs),
      awayTicks: awayTicks, done: done, capped: awayTicks > ticks,
      delta: d2, bonus: bonus, snap: { before: a, after: b2 }, manual: !!manual
    };
    _lastReport = rep;
    _busy = false;

    safe(function () {
      t.friendLog('🌙 離線 ' + rep.awayText + '：好友行動 ' + done + ' 期，獲得紋銀 ' +
        fmt(num(d2.gold, 0)) + ' 兩、武點 ' + fmt(num(d2.sp, 0)) +
        (bonus ? '（模式加成：' + bonus.mode.icon + bonus.mode.name + '）' : ''), 'wealth');
    });
    writeHeartbeat();

    // ★ 整合模式下不彈自己的窗（改由原版彈窗附加區塊）
    var ownPopup = CFG.SHOW_POPUP && !(_integrated && CFG.INTEGRATE);
    if (ownPopup && done >= num(CFG.QUIET_UNDER, 3)) {
      setTimeout(function () { showReport(rep); }, 400);
    }
    console.log('[OfflineBridge] ✓ 離線結算：離線 ' + rep.awayText + '，補算 ' + done + ' 期' +
      (_integrated ? '（已附加至原版彈窗）' : ''), rep);
    return rep;
  }

  /** 整合模式下，原版彈窗要渲染時呼叫：
   *  若已有近期報告 → 沿用；否則補跑一次 */
  function ensureCatchUp() {
    if (_lastReport && (Date.now() - num(_lastReport.at, 0)) < num(CFG.REUSE_MS, 600000)) return _lastReport;
    return runOnce(false);
  }

  function human(ms) {
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var out = [];
    if (d) out.push(d + ' 天');
    if (h) out.push(h + ' 小時');
    if (m) out.push(m + ' 分');
    if (!out.length) out.push(s + ' 秒');
    return out.join(' ');
  }

  /* ══════════════════════════════════════════════════════
     ★ 整合：包裹原版離線系統
     ══════════════════════════════════════════════════════ */
  var _wrappedFns = [];

  function friendBlockHtml() {
    var rep = _lastReport;
    if (!rep || !rep.done) return '';
    var d = rep.delta || {};
    var b = rep.bonus;
    var gold  = num(d.gold, 0) + (b ? num(b.gold, 0) : 0);
    var sp    = num(d.sp, 0) + (b ? num(b.sp, 0) : 0);
    var mats  = num(d.mats, 0) + (b ? num(b.mats, 0) : 0);
    var items = num(d.items, 0) + (b ? num(b.drops, 0) : 0);
    var mode  = b && b.mode ? (b.mode.icon + b.mode.name) : '—';

    var chips = [
      ['等級總和', num(d.lvSum, 0), ' Lv'],
      ['戰力總和', num(d.powSum, 0), ''],
      ['刷怪擊殺', num(d.kills, 0), ' 隻'],
      ['撿到戰利品', num(d.drops, 0), ' 件'],
      ['好友帶回紋銀', num(d.goldEarned, 0), ' 兩'],
      ['好友自賺武點', num(d.spEarned, 0), '']
    ].filter(function (x) { return x[1] > 0; });

    var prog = [
      ['副本通關', num(d.clear, 0)], ['世界王討伐', num(d.wb, 0)],
      ['互助任務', num(d.quest, 0)], ['新增書信', num(d.mail, 0)],
      ['洞府受贈', num(d.homeGift, 0)], ['拍賣成交', num(d.aucSold, 0)],
      ['新增羈絆', num(d.bond, 0)], ['打撈完成', num(d.salvage, 0)],
      ['煉丹出爐', num(d.pills, 0)], ['鍛造成功', num(d.forged, 0)]
    ].filter(function (x) { return x[1] > 0; });

    var h = '';
    h += '<div id="' + BLOCK_ID + '" style="background:#121822; padding:12px; border-radius:6px; border-left:4px solid #a78bfa; margin-top:10px;">';
    h += '<h4 style="margin:0 0 6px 0; color:#c4b5fd;">🤝 好友們的離線行動（' + rep.done + ' 期｜' + esc(rep.awayText) + '）</h4>';
    h += '<div>💰 好友帶回紋銀：<strong class="gold-color">+' + fmt(gold) + ' 兩</strong></div>';
    h += '<div>📖 好友武學點：<strong class="sp-color">+' + fmt(sp) + '</strong></div>';
    h += '<div>🧱 帶回材料：<strong style="color:#c98a4b;">+' + fmt(mats) + '</strong> 份</div>';
    h += '<div>⚔️ 存入倉庫裝備：<strong style="color:#6ee7b7;">+' + fmt(items) + '</strong> 件</div>';
    h += '<div style="margin-top:6px; color:#94a3b8; font-size:.85em;">🎛️ 離線模式：' + esc(mode) + '</div>';

    if (chips.length) {
      h += '<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #334155; color:#94a3b8; font-size:.85em;">好友成長：' +
        chips.map(function (x) { return x[0] + ' <strong style="color:#e2e8f0;">+' + fmt(x[1]) + esc(x[2]) + '</strong>'; }).join('　') +
        '</div>';
    }
    if (prog.length) {
      h += '<div style="margin-top:4px; color:#94a3b8; font-size:.85em;">系統進度：' +
        prog.map(function (x) { return x[0] + ' <strong style="color:#e2e8f0;">+' + x[1] + '</strong>'; }).join('　') +
        '</div>';
    }
    h += '<div style="margin-top:8px; color:#64748b; font-size:.78em;">想調整好友離線效率，可在 Console 執行 <code>HY.OfflineBridge.mode(\'om_quest\')</code></div>';
    h += '</div>';
    return h;
  }

  function friendEfficiencyHtml() {
    var m = modeDef();
    var eff = num(m.eff, 0.58);
    var o = m.out || {};
    var t = T();
    var cnt = Math.max(1, safe(function () { return t.friendAll().length; }, 1));
    var powSum = safe(function () { var s = 0; t.friendAll().forEach(function (f) { s += num(t.friendPower(f), 0); }); return s; }, 0);
    var pow = Math.max(100, powSum / cnt);
    var perHour = Math.round(3600 / Math.max(1, tickMs() / 1000));

    var gold = Math.round(pow * 0.012 * perHour * eff * num(o.goldMul, 1));
    var sp   = Math.round(perHour * eff * num(o.spMul, 0.7) * 2);
    var mats = Math.round(perHour * eff * num(o.matMul, 1) * 0.12);

    var h = '';
    h += '<div id="' + BLOCK_ID + '" style="background:#121822; padding:12px; border-radius:6px; border:1px solid #a78bfa; margin-top:10px;">';
    h += '<h4 style="margin:0 0 6px 0; color:#c4b5fd;">🤝 好友離線行動【每小時】預估</h4>';
    h += '<div>👥 好友人數：<strong>' + cnt + ' 位</strong></div>';
    h += '<div>⚡ 行動頻率：每 <strong>' + Math.round(tickMs() / 1000) + ' 秒</strong> 1 期（約 ' + perHour + ' 期／小時）</div>';
    h += '<div>🎛️ 當前模式：<strong>' + m.icon + esc(m.name) + '</strong>（效率 ' + Math.round(eff * 100) + '%）</div>';
    h += '<hr style="border:none; border-top:1px dashed #334155; margin:8px 0;">';
    h += '<div>💰 每小時預計帶回紋銀：<strong class="gold-color">+' + fmt(gold) + ' 兩</strong></div>';
    h += '<div>📖 每小時預計武點：<strong class="sp-color">+' + fmt(sp) + '</strong></div>';
    h += '<div>🧱 每小時預計材料：<strong style="color:#c98a4b;">+' + fmt(mats) + '</strong> 份</div>';
    h += '<div style="margin-top:6px; color:#64748b; font-size:.78em;">此區塊由 offlineBridge.js 提供（好友系統的離線行為）</div>';
    h += '</div>';
    return h;
  }

  function appendToModal(fnName, htmlFn) {
    var IDS = window.HY.OfflineIdleSystem;
    if (!IDS || !IDS.prototype) return false;
    var proto = IDS.prototype;
    if (typeof proto[fnName] !== 'function') return false;
    if (proto[fnName].__obWrapped) return true;

    var orig = proto[fnName];
    var wrapped = function () {
      // 先確保好友補算已跑完（同步）
      try { ensureCatchUp(); } catch (e) { /* 忽略 */ }
      var r = orig.apply(this, arguments);
      try {
        var body = document.getElementById('offline-modal-body');
        if (!body) return r;
        var old = document.getElementById(BLOCK_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var h = htmlFn();
        if (h) body.insertAdjacentHTML('beforeend', h);
      } catch (e) { console.warn('[OfflineBridge] 附加好友區塊失敗：', e); }
      return r;
    };
    wrapped.__obWrapped = true;
    wrapped.__orig = orig;
    proto[fnName] = wrapped;
    _wrappedFns.push('OfflineIdleSystem.prototype.' + fnName);
    return true;
  }

  function integrate() {
    if (!CFG.INTEGRATE) return false;
    if (_integrated) return true;
    if (!hasOriginal()) return false;

    var a = appendToModal('showOfflineReportModal', friendBlockHtml);
    var b = appendToModal('openStatusModal', friendEfficiencyHtml);

    if (a || b) {
      _integrated = true;
      // 自己不再彈窗，避免雙彈窗
      CFG.SHOW_POPUP = false;
      console.log('[OfflineBridge] ✓ 已整合進原版離線彈窗（' + _wrappedFns.join('、') + '）');
      console.log('[OfflineBridge]   ｜ 好友離線收益將附加在 #hy-offline-modal 內');
    }
    return _integrated;
  }

  /* ══════════════════════════════════════════════════════
     獨立彈窗（僅在未整合時使用）
     ══════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var css = `
.of-mask { position:fixed; inset:0; z-index:9800; background:rgba(2,6,12,.76);
  -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center; padding:16px; }
.of-mask.hidden { display:none !important; }
.of-modal { width:min(94vw,720px); max-height:88vh; display:flex; flex-direction:column;
  background:#0f141c; border:2px solid #a78bfa; border-radius:10px;
  box-shadow:0 24px 70px rgba(0,0,0,.78), inset 0 0 0 1px rgba(167,139,250,.25);
  overflow:hidden; animation:ofIn .2s ease-out; }
@keyframes ofIn { from { opacity:0; transform:scale(.95) translateY(12px);} to { opacity:1; transform:none; } }
.of-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 16px;
  background:linear-gradient(90deg,#1c1a2e,#241d35); border-bottom:1px solid #a78bfa; }
.of-title { font-size:1.08rem; font-weight:bold; color:#c4b5fd; }
.of-sub { font-size:.74rem; color:#94a3b8; }
.of-headbtns { margin-left:auto; display:flex; gap:8px; }
.of-body { flex:1 1 auto; overflow-y:auto; padding:14px 16px; }
.of-foot { padding:9px 16px; font-size:.73rem; color:#94a3b8; background:#131b26;
  border-top:1px solid #2e3b4e; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.of-btn { background:#2b394a; color:#c4b5fd; border:1px solid #a78bfa;
  border-radius:4px; padding:4px 12px; font-size:.78rem; cursor:pointer; }
.of-btn:hover { background:#3a4a5e; }
.of-btn.g { border-color:#34d399; color:#6ee7b7; }
.of-hero { background:linear-gradient(90deg,#1c1a2e,#241d35); border:1px solid #a78bfa;
  border-radius:7px; padding:12px 14px; margin-bottom:12px; }
.of-hero h3 { color:#c4b5fd; font-size:1rem; margin:0 0 6px; }
.of-rows { display:flex; gap:14px; flex-wrap:wrap; font-size:.8rem; margin-bottom:4px; }
.of-rows b { color:#e2e8f0; }
.of-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; margin-bottom:10px; }
.of-card { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 11px; }
.of-card .k { font-size:.72rem; color:#94a3b8; margin-bottom:3px; }
.of-card .v { font-size:1.05rem; font-weight:bold; color:#6ee7b7; }
.of-block { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:10px 12px; margin-bottom:10px; }
.of-btitle { font-size:.85rem; font-weight:bold; color:#c4b5fd; margin-bottom:7px; }
.of-dim { font-size:.72rem; color:#94a3b8; line-height:1.5; }
.of-modes { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; }
.of-mode { background:#121822; border:1px solid #2e3b4e; border-radius:5px; padding:8px 10px; cursor:pointer; }
.of-mode:hover { border-color:#a78bfa; }
.of-mode.on { border-color:#a78bfa; background:rgba(167,139,250,.14); }
.of-mode .mn { font-size:.82rem; font-weight:bold; color:#e2e8f0; }
.of-mode .md { font-size:.68rem; color:#64748b; margin-top:3px; line-height:1.4; }
`;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  function showReport(rep) {
    if (!rep) return false;
    if (!document.body) { setTimeout(function () { showReport(rep); }, 300); return false; }
    injectStyles();

    var mask = document.getElementById(MASK_ID);
    if (!mask) {
      mask = document.createElement('div');
      mask.id = MASK_ID;
      mask.className = 'of-mask hidden';
      mask.addEventListener('click', function (e) { if (e.target === mask) mask.classList.add('hidden'); });
      document.body.appendChild(mask);
    }
    var d = rep.delta || {};
    var bonus = rep.bonus;

    var html = '';
    html += '<div class="of-head">' +
      '<span class="of-title">🌙 好友離線結算</span>' +
      '<span class="of-sub">離線 ' + esc(rep.awayText) + '　補算 ' + rep.done + ' 期' +
      (rep.capped ? '（已達上限）' : '') + '</span>' +
      '<span class="of-headbtns"><button class="of-btn" data-of="close">✕ 關閉</button></span></div>';

    html += '<div class="of-body">';
    html += '<div class="of-hero"><h3>這段時間你的好友們替你賺到了——</h3>' +
      '<div class="of-rows">' +
      '<span>💰 紋銀 <b>+' + fmt(num(d.gold, 0) + (bonus ? num(bonus.gold, 0) : 0)) + '</b> 兩</span>' +
      '<span>📖 武學點 <b>+' + fmt(num(d.sp, 0) + (bonus ? num(bonus.sp, 0) : 0)) + '</b></span>' +
      '<span>🧱 材料 <b>+' + fmt(num(d.mats, 0) + (bonus ? num(bonus.mats, 0) : 0)) + '</b></span>' +
      '<span>⚔️ 倉庫裝備 <b>+' + fmt(num(d.items, 0) + (bonus ? num(bonus.drops, 0) : 0)) + '</b> 件</span>' +
      '</div></div>';

    html += '<div class="of-block"><div class="of-btitle">📈 好友成長</div><div class="of-grid">';
    var growth = [
      { k: '等級總和', v: num(d.lvSum, 0), s: ' Lv' },
      { k: '戰力總和', v: num(d.powSum, 0), s: '' },
      { k: '刷怪擊殺', v: num(d.kills, 0), s: ' 隻' },
      { k: '撿到戰利品', v: num(d.drops, 0), s: ' 件' },
      { k: '好友帶回紋銀', v: num(d.goldEarned, 0), s: ' 兩' },
      { k: '好友自賺武點', v: num(d.spEarned, 0), s: '' }
    ];
    var anyG = false;
    growth.forEach(function (g) {
      if (!g.v) return;
      anyG = true;
      html += '<div class="of-card"><div class="k">' + g.k + '</div><div class="v">+' + fmt(g.v) + esc(g.s) + '</div></div>';
    });
    if (!anyG) html += '<div class="of-dim">（無明顯成長）</div>';
    html += '</div></div>';

    var prog = [
      { k: '副本通關', v: num(d.clear, 0) }, { k: '世界王討伐', v: num(d.wb, 0) },
      { k: '互助任務', v: num(d.quest, 0) }, { k: '新增書信', v: num(d.mail, 0) },
      { k: '洞府受贈', v: num(d.homeGift, 0) }, { k: '拍賣成交', v: num(d.aucSold, 0) },
      { k: '新增羈絆', v: num(d.bond, 0) }, { k: '打撈完成', v: num(d.salvage, 0) },
      { k: '煉丹出爐', v: num(d.pills, 0) }, { k: '鍛造成功', v: num(d.forged, 0) }
    ].filter(function (x) { return x.v > 0; });
    if (prog.length) {
      html += '<div class="of-block"><div class="of-btitle">⚙️ 系統進度</div><div class="of-grid">';
      prog.forEach(function (p) {
        html += '<div class="of-card"><div class="k">' + p.k + '</div><div class="v">+' + fmt(p.v) + '</div></div>';
      });
      html += '</div></div>';
    }

    if (bonus && (bonus.gold || bonus.sp || bonus.mats || bonus.drops)) {
      html += '<div class="of-block"><div class="of-btitle">' + bonus.mode.icon + ' 離線模式加成：' + esc(bonus.mode.name) + '</div>' +
        '<div class="of-rows">' +
        (bonus.gold ? '<span>💰 +' + fmt(bonus.gold) + ' 兩</span>' : '') +
        (bonus.sp ? '<span>📖 +' + fmt(bonus.sp) + '</span>' : '') +
        (bonus.mats ? '<span>🧱 +' + fmt(bonus.mats) + '</span>' : '') +
        (bonus.drops ? '<span>⚔️ +' + fmt(bonus.drops) + ' 件</span>' : '') +
        '</div><div class="of-dim">切換模式可在下方選擇，或執行 <code>HY.OfflineBridge.mode(\'om_quest\')</code></div></div>';
    }

    var modes = window.HY.OfflineBridge.modes();
    if (modes.length) {
      var cur = getModeId();
      html += '<div class="of-block"><div class="of-btitle">🎛️ 離線模式（下次離線生效）</div><div class="of-modes">';
      modes.forEach(function (m) {
        html += '<div class="of-mode' + (m.id === cur ? ' on' : '') + '" data-of="mode" data-ofv="' + m.id + '">' +
          '<div class="mn">' + (m.icon || '') + ' ' + esc(m.name) + '</div>' +
          '<div class="md">' + esc(m.desc || '') + '</div></div>';
      });
      html += '</div></div>';
    }
    html += '</div>';

    html += '<div class="of-foot"><span class="of-dim">心跳每 15 秒寫入一次；關閉分頁或切到背景時亦會寫入。</span>' +
      '<span style="margin-left:auto"></span>' +
      '<button class="of-btn g" data-of="run">🔄 立即再結算</button>' +
      '<button class="of-btn" data-of="close">關閉</button></div>';

    mask.innerHTML = '<div class="of-modal">' + html + '</div>';

    if (!mask._ofBound) {
      mask._ofBound = true;
      mask.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-of]') : null;
        if (!el) return;
        var act = el.getAttribute('data-of');
        e.preventDefault();
        if (act === 'close') mask.classList.add('hidden');
        else if (act === 'run') runOnce(true);
        else if (act === 'mode') {
          setMode(el.getAttribute('data-ofv'));
          mask.querySelectorAll('[data-of="mode"]').forEach(function (n) {
            n.classList.toggle('on', n.getAttribute('data-ofv') === getModeId());
          });
        }
      });
    }
    mask.classList.remove('hidden');
    return true;
  }

  /* ── 停用內建 friendOffline（避免好友系統自己重複補算） ── */
  function disableBuiltin() {
    var TP = window.HY.TownSystem && window.HY.TownSystem.prototype;
    if (!TP || TP.__offBridgePatched) return false;
    TP.__offBridgePatched = true;
    if (typeof TP.friendOffline === 'function') {
      TP.friendOffline = function () {
        console.log('[OfflineBridge] 內建 friendOffline 已由 offlineBridge.js 接管');
        return 0;
      };
    }
    return true;
  }

  /* ── 啟動 ── */
  function startHeartbeat() {
    if (_hbTimer) return;
    _hbTimer = setInterval(writeHeartbeat, num(CFG.HEARTBEAT_MS, 15000));
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') writeHeartbeat();
      else setTimeout(function () { runOnce(false); }, 300);
    });
    window.addEventListener('pagehide', writeHeartbeat);
    window.addEventListener('beforeunload', writeHeartbeat);
  }

  function boot() {
    if (window.HY.OfflineBridge.ready) return;
    var t = T();
    if (!t) return false;
    window.HY.OfflineBridge.ready = true;
    disableBuiltin();

    var id = getModeId();
    if (t.friendAll) t.friendAll().forEach(function (f) { f.offlineMode = id; });

    // 先嘗試整合（原版可能還沒載入）
    integrate();

    var hb = readHb();
    if (!hb) writeHeartbeat();
    else setTimeout(function () { runOnce(false); }, 700);

    startHeartbeat();
    console.log('[OfflineBridge] ✓ 已啟動（心跳 ' + (num(CFG.HEARTBEAT_MS, 15000) / 1000) + 's｜上限 ' +
      num(CFG.MAX_TICKS, 600) + ' 期｜模式：' + modeDef().name + '）');
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (boot() || tries >= 120) clearInterval(timer);
  }, 500);
  boot();

  /* 整合重試：offlineIdleSystem.js 在「後置系統」區塊，比本檔晚載入 */
  var intTimer = setInterval(function () {
    _wrapTries += 1;
    if (_integrated) { clearInterval(intTimer); return; }
    if (hasOriginal()) {
      if (integrate()) clearInterval(intTimer);
    }
    if (_wrapTries >= 60) clearInterval(intTimer);
  }, 500);
  setTimeout(function () { clearInterval(intTimer); }, 35000);
})();