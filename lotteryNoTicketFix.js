// js/lotteryNoTicketFix.js (v1)
// ⭐ 樂透：沒有購買彩券時，不彈「開獎結果」視窗
//
// 【根因】uiLottery.js v5 的 showDrawResult() 沒有檢查玩家持票數，
//         lotterySystem.js 的 doDraw() 也是無條件觸發 onDraw。
//
// 【手法】包裹 HY.UILottery.prototype.showDrawResult
//         持票數為 0（record.myTickets 為空）→ 直接略過，不建立彈窗
//
// 【重要】class 方法為 non-enumerable，不能用 Object.keys 列舉
//         → 本檔一律「直接取用方法名」（UILottery.prototype.showDrawResult）
//
// 【附帶處理】
//   ① 離線補開會連續觸發多次 onDraw → 去重，只留最新一個彈窗
//      （被略過的結果仍寫入遊戲日誌，不會憑空消失）
//   ② showRemind 也加一道守門（原系統已有，這裡是防禦性補強）
//
// Console：
//   HY.LotteryNoTicketFix.status()                    // 目前狀態
//   HY.LotteryNoTicketFix.config({ SKIP_WHEN_NO_TICKET:true })
//   HY.LotteryNoTicketFix.restore()                   // 還原
//   HY.LotteryNoTicketFix.test()                      // 模擬一次「無票開獎」
//   HY.LotteryNoTicketFix.simulate(true)              // 模擬「有票開獎」
//
// ⚠️ 載入順序：uiLottery.js 之後
window.HY = window.HY || {};

(function () {
  var CFG = {
    SKIP_WHEN_NO_TICKET: true,   // ★ 沒票就不彈開獎視窗（本檔的核心）
    DEDUPE: true,                // 離線補開只留最新一個彈窗
    DEDUPE_MS: 1500,             // 幾毫秒內視為「同一批補開」
    GUARD_REMIND: true,          // showRemind 也加守門
    LOG_SUPPRESSED: true,        // 被略過的開獎結果寫進遊戲日誌
    VERBOSE: true
  };

  var _orig = { showDrawResult: null, showRemind: null };
  var _stats = { checked: 0, skipped: 0, shown: 0, deduped: 0, remindSkipped: 0 };
  var _lastShowAt = 0;
  var _installed = false;

  function log() {
    if (!CFG.VERBOSE) return;
    try { console.log.apply(console, ['[LotteryFix]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function warn() {
    try { console.warn.apply(console, ['[LotteryFix]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function fmt(n) { return Math.floor(num(n, 0)).toLocaleString(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ── 取得遊戲實例（寫日誌用） ── */
  function G() { return window.HY.game || {}; }

  /* ── 玩家在本期是否有彩券 ── */
  function hasTickets(record) {
    if (!record) return false;
    var arr = record.myTickets;
    return !!(arr && arr.length > 0);
  }

  /* ── 被略過的結果 → 寫進遊戲日誌，避免「無聲無息」 ── */
  function logSuppressed(record, reason) {
    if (!CFG.LOG_SUPPRESSED || !record) return;
    try {
      var g = G();
      if (!g.logger || typeof g.logger.add !== 'function') return;
      var t = new Date(num(record.drawTs, Date.now())).toLocaleTimeString('zh-TW', { hour12: false });
      var nums = (record.numbers || []).map(pad2).join(' ');
      g.logger.add(
        '🎟️ 【大樂透開獎 ' + t + '】' + nums + ' ｜ 特別號 ' + pad2(record.special) +
        '（你本期未購票' + (reason === 'deduped' ? '；已併入最新一次開獎視窗' : '') + '）',
        'wealth'
      );
    } catch (e) { /* 忽略 */ }
  }

  /* ── 移除既有彈窗（去重用） ── */
  function removeExisting() {
    var old = document.getElementById('hy-lottery-result');
    if (old && old.parentNode) {
      try { old.parentNode.removeChild(old); } catch (e) { /* 忽略 */ }
      return true;
    }
    return false;
  }

  /* ══════════════════════════════════════════════════════
     安裝
     ══════════════════════════════════════════════════════ */
  function install() {
    if (_installed) return true;

    var UI = window.HY.UILottery;
    if (!UI || !UI.prototype) return false;

    /* ★ 直接取用方法名（class 方法為 non-enumerable，不能用 Object.keys） */
    var proto = UI.prototype;

    if (typeof proto.showDrawResult === 'function' && !proto.showDrawResult.__lotFixWrapped) {
      _orig.showDrawResult = proto.showDrawResult;

      proto.showDrawResult = function (record) {
        _stats.checked += 1;

        /* ① 沒票 → 不彈 */
        if (CFG.SKIP_WHEN_NO_TICKET && !hasTickets(record)) {
          _stats.skipped += 1;
          if (record) logSuppressed(record, 'no_ticket');
          log('略過開獎視窗（本期未購票）drawTs=' +
            new Date(num(record && record.drawTs, Date.now())).toLocaleTimeString('zh-TW', { hour12: false }));
          return undefined;
        }

        /* ② 去重：離線補開會連續觸發，只留最新一個 */
        var now = Date.now();
        var isBatch = (now - _lastShowAt) < num(CFG.DEDUPE_MS, 1500);
        if (CFG.DEDUPE && isBatch) {
          if (removeExisting()) _stats.deduped += 1;
          logSuppressed(record, 'deduped');
        }
        _lastShowAt = now;

        /* ③ 正常顯示 */
        _stats.shown += 1;
        return _orig.showDrawResult.apply(this, arguments);
      };
      proto.showDrawResult.__lotFixWrapped = true;
      proto.showDrawResult.__lotFixOrig = _orig.showDrawResult;
      log('已包裹 showDrawResult');
    }

    /* ── 開獎前提醒：防禦性守門（原系統 checkReminder 已有，這裡再保險） ── */
    if (CFG.GUARD_REMIND &&
        typeof proto.showRemind === 'function' && !proto.showRemind.__lotFixWrapped) {
      _orig.showRemind = proto.showRemind;

      proto.showRemind = function (remainMs) {
        try {
          var sys = this.sys;
          if (sys && typeof sys.hasPlayerTicketForDraw === 'function') {
            var L = sys.getState ? sys.getState() : null;
            if (L && !sys.hasPlayerTicketForDraw(L.nextDrawTs)) {
              _stats.remindSkipped += 1;
              log('略過開獎前提醒（本期未購票）');
              return undefined;
            }
          }
        } catch (e) { /* 檢查失敗 → 放行，維持原行為 */ }
        return _orig.showRemind.apply(this, arguments);
      };
      proto.showRemind.__lotFixWrapped = true;
      proto.showRemind.__lotFixOrig = _orig.showRemind;
      log('已包裹 showRemind（防禦性守門）');
    }

    if (!proto.showDrawResult.__lotFixWrapped) return false;

    _installed = true;
    console.log('[LotteryFix] ✓ 已生效 —— 沒有購買彩券時不再彈出開獎視窗');
    return true;
  }

  /* ══════════════════════════════════════════════════════
     對外 API
     ══════════════════════════════════════════════════════ */
  window.HY.LotteryNoTicketFix = {
    version: '1.0',
    ready: false,
    config: function (o) {
      if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; });
      return CFG;
    },
    status: function () {
      var sys = G().lotterySys;
      return {
        installed: _installed,
        uiClass: !!window.HY.UILottery,
        uiInstance: !!window.HY.uiLottery,
        lotterySys: !!sys,
        hasDrawResult: !!(window.HY.UILottery && window.HY.UILottery.prototype &&
          typeof window.HY.UILottery.prototype.showDrawResult === 'function'),
        wrapped: {
          showDrawResult: !!(window.HY.UILottery && window.HY.UILottery.prototype &&
            window.HY.UILottery.prototype.showDrawResult &&
            window.HY.UILottery.prototype.showDrawResult.__lotFixWrapped),
          showRemind: !!(window.HY.UILottery && window.HY.UILottery.prototype &&
            window.HY.UILottery.prototype.showRemind &&
            window.HY.UILottery.prototype.showRemind.__lotFixWrapped)
        },
        myTicketsNow: (function () {
          try { return sys && sys.getMyTickets ? sys.getMyTickets().length : null; } catch (e) { return null; }
        })(),
        cfg: CFG,
        stats: JSON.parse(JSON.stringify(_stats))
      };
    },
    restore: function () {
      var UI = window.HY.UILottery;
      if (UI && UI.prototype) {
        if (UI.prototype.showDrawResult && UI.prototype.showDrawResult.__lotFixOrig) {
          UI.prototype.showDrawResult = UI.prototype.showDrawResult.__lotFixOrig;
        }
        if (UI.prototype.showRemind && UI.prototype.showRemind.__lotFixOrig) {
          UI.prototype.showRemind = UI.prototype.showRemind.__lotFixOrig;
        }
      }
      _installed = false;
      log('已還原為原版行為');
      return true;
    },
    /** 模擬一次開獎回呼，驗證守門 */
    test: function (withTicket) {
      var rec = {
        drawTs: Date.now(), numbers: [1, 2, 3, 4, 5, 6], special: 7,
        poolBefore: 123456, poolAfter: 100000, totalPayout: 0, jackpotCount: 0,
        npcEntries: [], npcTotal: 0,
        myTickets: withTicket
          ? [{ uid: 'test', numbers: [1, 2, 3, 4, 5, 6], match: 6, hasSpecial: false,
               prize: { key: 'jackpot', label: '🏆 頭獎', type: 'pool' }, payout: 100000 }]
          : []
      };
      var UI = window.HY.UILottery;
      if (!UI || !UI.prototype) { warn('UILottery 未載入'); return false; }
      var inst = window.HY.uiLottery || null;
      var fn = UI.prototype.showDrawResult;
      try {
        fn.call(inst || {}, rec);
        var el = document.getElementById('hy-lottery-result');
        var shown = !!el;
        if (el && el.parentNode) el.parentNode.removeChild(el);
        console.log('[LotteryFix] 測試：withTicket=' + !!withTicket + ' → 彈窗' + (shown ? '出現 ✓' : '未出現 ✓（正確）'));
        return shown;
      } catch (e) {
        console.error('[LotteryFix] 測試失敗：', e);
        return null;
      }
    },
    /** 別名：simulate(true) = 有票；simulate(false) = 無票 */
    simulate: function (withTicket) { return this.test(withTicket); },
    stats: function () { return JSON.parse(JSON.stringify(_stats)); }
  };

  /* ══════════════════════════════════════════════════════
     啟動（輪詢等待 UILottery 載入）
     ══════════════════════════════════════════════════════ */
  var tries = 0;
  function attempt() {
    tries += 1;
    if (install()) {
      window.HY.LotteryNoTicketFix.ready = true;
      return true;
    }
    if (tries >= 100) {
      warn('等待 UILottery 逾時（' + tries + ' 次）。請確認 uiLottery.js 已載入且排在本檔之前。');
      return true;
    }
    setTimeout(attempt, 100);
    return false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(attempt, 200); });
  } else {
    setTimeout(attempt, 200);
  }
  attempt();   // 立即試一次（若 uiLottery.js 已先載入就會立刻成功）

  console.log('[LotteryFix] ✓ 已載入（無票不彈開獎視窗）');
})();