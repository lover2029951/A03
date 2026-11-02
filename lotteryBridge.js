// js/lotteryBridge.js (v1)
// ⭐ 樂透開獎彈窗守門：沒有買彩券時不顯示開獎提示，只有購買後才提示
//
// 【做法】不改原版檔案，改用「包裹」：
//   ① 找到樂透系統（探測多個路徑）
//   ② 包裹「開獎／結果」類方法 → 持票數為 0 時直接攔截
//   ③ 包裹「購買」類方法 → 記錄本輪已購買
//   ④ 探測失敗時可用 HY.LotteryBridge.setTicketGetter(fn) 手動指定
//
// Console：
//   HY.LotteryBridge.detect()               // 印出樂透物件欄位與方法
//   HY.LotteryBridge.state()                // 持票數／已購買標記
//   HY.LotteryBridge.markBought(true)       // 手動標記本輪已購買
//   HY.LotteryBridge.setTicketGetter(fn)    // 自訂持票數讀取器
//   HY.LotteryBridge.setTicketPaths([...])  // 自訂探測欄位
//   HY.LotteryBridge.config({strict:false}) // 探測不到就放行
//
// ⚠️ 載入順序：main.js 之前
window.HY = window.HY || {};

(function () {
  var CFG = { strict: true, quiet: true, resetOnRound: true };

  var SYS_PATHS = [
    'HY.game.lotterySys', 'HY.game.lotterySystem', 'HY.game.lottery',
    'HY.LotterySystem', 'HY.game.LotterySystem', 'app.lotterySys'
  ];
  var TICKET_PATHS = [
    'myTickets', 'tickets', 'ticket', 'myTicket', 'ticketCount', 'ownedTickets',
    'bought', 'purchased', 'purchaseCount', 'count', 'entries', 'slips',
    'state.myTickets', 'state.tickets', 'state.ticket', 'state.count',
    'state.bought', 'state.purchased', 'player.tickets', 'player.ticket'
  ];
  var RESULT_RE = /(show|open|display|pop|render|announce|present).{0,12}(result|prize|award|win|draw|lottery|ticket|number)|^(drawResult|showResult|reveal|announceResult|openResult)$/i;
  var BUY_RE = /(buy|purchase|order|spend|pay|bet|subscribe|addTicket|createTicket|newTicket)/i;

  var _bought = false;
  var _boughtAt = 0;
  var _ticketGetter = null;
  var _wrapped = [];
  var _logged = {};
  var _sys = null, _sysPath = '';

  window.HY.LotteryBridge = {
    version: '1.0',
    ready: false,
    config: function (o) { if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; }); return CFG; },
    state: function () {
      return { tickets: ticketCount(), bought: _bought, boughtAt: _boughtAt,
        wrapped: _wrapped.slice(), sys: !!_sys, sysPath: _sysPath, strict: CFG.strict };
    },
    markBought: function (v) { _bought = (v !== false); _boughtAt = Date.now(); return _bought; },
    setTicketGetter: function (fn) { _ticketGetter = (typeof fn === 'function') ? fn : null; return !!_ticketGetter; },
    setTicketPaths: function (a) { if (Array.isArray(a) && a.length) { TICKET_PATHS = a.slice(); return true; } return false; },
    detect: function () { return detect(true); },
    hasTicket: function () { return checkHasTicket(); },
    install: function () { return install(); }
  };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function resolve(p) {
    try {
      var parts = String(p).split('.'), o = window;
      for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
      return o;
    } catch (e) { return undefined; }
  }
  function pickPath(obj, p) {
    try {
      var parts = String(p).split('.'), o = obj;
      for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
      return o;
    } catch (e) { return undefined; }
  }

  function findSys() {
    for (var i = 0; i < SYS_PATHS.length; i++) {
      var v = resolve(SYS_PATHS[i]);
      if (v && typeof v === 'object') { _sys = v; _sysPath = SYS_PATHS[i]; return v; }
    }
    return null;
  }

  function ticketCount() {
    if (_ticketGetter) {
      try { var v = _ticketGetter(); return (v === undefined || v === null) ? null : num(v, 0); }
      catch (e) { return null; }
    }
    if (!_sys) return null;
    for (var i = 0; i < TICKET_PATHS.length; i++) {
      var v2 = pickPath(_sys, TICKET_PATHS[i]);
      if (v2 === undefined || v2 === null) continue;
      if (typeof v2 === 'function') { try { v2 = v2.call(_sys); } catch (e) { continue; } }
      if (typeof v2 === 'number' && isFinite(v2)) return v2;
      if (Array.isArray(v2)) return v2.length;
      if (typeof v2 === 'boolean') return v2 ? 1 : 0;
    }
    var ms = ['getTicketCount', 'getTickets', 'getMyTickets', 'countTickets', 'ticketTotal'];
    for (var j = 0; j < ms.length; j++) {
      if (typeof _sys[ms[j]] === 'function') {
        try {
          var r = _sys[ms[j]]();
          if (typeof r === 'number') return r;
          if (Array.isArray(r)) return r.length;
        } catch (e) { /* 忽略 */ }
      }
    }
    return null;
  }

  function checkHasTicket() {
    var n = ticketCount();
    if (n === null) return !CFG.strict ? true : _bought;
    return n > 0 || _bought;
  }

  function note(key, msg) {
    if (!CFG.quiet) { console.log('[LotteryBridge] ' + msg); return; }
    if (_logged[key]) return;
    _logged[key] = true;
    console.log('[LotteryBridge] ' + msg);
  }

  function wrapObj(obj, label) {
    if (!obj || typeof obj !== 'object') return 0;
    var n = 0, keys;
    try { keys = Object.keys(obj); } catch (e) { return 0; }
    keys.forEach(function (k) {
      var fn;
      try { fn = obj[k]; } catch (e) { return; }
      if (typeof fn !== 'function') return;
      if (obj.__lw && obj.__lw[k]) return;

      if (RESULT_RE.test(k)) {
        try {
          obj[k] = function () {
            if (!checkHasTicket()) {
              note('r_' + label + '_' + k, '未購買彩券 → 略過開獎彈窗：' + label + '.' + k);
              return undefined;
            }
            var r = fn.apply(this, arguments);
            if (CFG.resetOnRound) _bought = false;
            return r;
          };
          if (!obj.__lw) obj.__lw = {};
          obj.__lw[k] = 1;
          _wrapped.push(label + '.' + k);
          n += 1;
        } catch (e) { /* 忽略 */ }
      } else if (BUY_RE.test(k)) {
        try {
          obj[k] = function () {
            var r = fn.apply(this, arguments);
            _bought = true;
            _boughtAt = Date.now();
            note('b_' + label, '偵測到購買：' + label + '.' + k + ' → 本輪將允許開獎');
            return r;
          };
          if (!obj.__lw) obj.__lw = {};
          obj.__lw[k] = 1;
          _wrapped.push(label + '.' + k + '(buy)');
          n += 1;
        } catch (e) { /* 忽略 */ }
      }
    });
    return n;
  }

  function wrapUI() {
    var n = 0;
    ['HY.UILottery', 'HY.game.uiLottery', 'HY.game.lotteryUI', 'HY.UI.Lottery'].forEach(function (p) {
      var v = resolve(p);
      if (!v) return;
      if (v.prototype) n += wrapObj(v.prototype, p + '.prototype');
      if (typeof v === 'object') n += wrapObj(v, p);
    });
    return n;
  }

  function detect(print) {
    var out = { found: !!_sys, path: _sysPath, keys: [], methods: [], ticketPathsHit: [], ticketCount: null };
    if (_sys) {
      try {
        Object.keys(_sys).forEach(function (k) {
          var v;
          try { v = _sys[k]; } catch (e) { return; }
          if (typeof v === 'function') out.methods.push(k);
          else out.keys.push(k);
        });
      } catch (e) { /* 忽略 */ }
      for (var i = 0; i < TICKET_PATHS.length; i++) {
        var v2 = pickPath(_sys, TICKET_PATHS[i]);
        if (v2 !== undefined && v2 !== null) {
          out.ticketPathsHit.push(TICKET_PATHS[i] + ' = ' +
            (typeof v2 === 'object' ? JSON.stringify(v2).slice(0, 60) : String(v2)));
        }
      }
    }
    out.ticketCount = ticketCount();
    if (print) {
      console.log('%c=== LotteryBridge 探測 ===', 'color:#a78bfa;font-weight:bold');
      console.log('系統路徑：', _sysPath || '（未找到）');
      console.log('欄位：', out.keys);
      console.log('方法：', out.methods);
      console.log('持票數命中：', out.ticketPathsHit);
      console.log('目前持票數：', out.ticketCount);
      console.log('已包裹：', _wrapped);
      console.log('提示：若持票數為 null，執行 HY.LotteryBridge.setTicketGetter(() => 你的系統.getTickets())');
    }
    return out;
  }

  function install() {
    if (!findSys()) return false;
    var n = wrapObj(_sys, _sysPath) + wrapUI();
    if (n > 0) console.log('[LotteryBridge] ✓ 已包裹 ' + n + ' 個方法（' + _wrapped.join('、') + '）');
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (install() || tries >= 60) {
      clearInterval(timer);
      if (!_sys) console.warn('[LotteryBridge] ⚠️ 未找到樂透系統。請執行 HY.LotteryBridge.detect() 後回報。');
    }
  }, 500);
  setTimeout(function () { install(); detect(false); }, 2500);

  window.HY.LotteryBridge.ready = true;
  console.log('[LotteryBridge] ✓ 已載入（無票不彈開獎）');
})();