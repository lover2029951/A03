// js/fontSystem.js (v1)
// ⭐ 遊戲字體系統：全域基準 ＋ 各系統面板獨立字級
//    ① 全域：調整 <html> font-size（影響所有 rem 介面）
//    ② 好友面板：寫 --frf 變數（沿用 uiFriend4 的 calc 機制）
//    ③ 各系統面板：對容器套 zoom（可各自獨立）
//    ④ 設定持久化到 localStorage
//
// Console：
//   HY.FontSys.set('combat', 1.3)     // 戰鬥畫面放大 30%
//   HY.FontSys.setGlobal(1.1)         // 全域基準
//   HY.FontSys.preset('large')        // 一鍵套用「大」
//   HY.FontSys.detect()               // 偵測哪些面板選擇器命中
//   HY.FontSys.setSelector('combat', '#my-combat-root')  // 自訂選擇器
//   HY.FontSys.reset('combat') / HY.FontSys.resetAll()
//   HY.FontSys.open()                 // 開字體面板
//
// ⚠️ 載入順序：uiFriend4.js 之後、uiFontPanel.js 之前
window.HY = window.HY || {};

(function () {
  var LS_KEY = 'hy_font_cfg_v1';
  var LS_SEL = 'hy_font_sel_v1';
  var STYLE_ID = 'hy-font-style';

  /* ══════════════════════════════════════════════════════
     系統清單（sels = 候選選擇器，第一個命中者生效）
     ══════════════════════════════════════════════════════ */
  var SYSTEMS = [
    { id: 'global', name: '全域基準', icon: '🌐', mode: 'rem', sels: ['html'],
      desc: '影響所有使用 rem 的介面（大部分 UI）。' },
    { id: 'friend', name: '好友面板', icon: '🤝', mode: 'var', sels: ['#fr3-modal', '#friend-modal'],
      desc: '好友系統全部分頁。' },
    { id: 'font',   name: '字體面板', icon: '🔠', mode: 'zoom', sels: ['#font-modal'],
      desc: '本面板自身。' },
    { id: 'town',   name: '我的小鎮', icon: '🏘️', mode: 'zoom',
      sels: ['#town-modal', '#town-root', '#town-panel', '.town-root', '#ui-town', '.town-wrap'],
      desc: '小鎮、公會、名人彈窗。' },
    { id: 'char',   name: '角色與隊伍', icon: '🧑', mode: 'zoom',
      sels: ['#ui-character-party', '#character-panel', '#char-panel', '#panel-character', '.character-root'],
      desc: '角色、隊伍、陣法。' },
    { id: 'combat', name: '戰鬥畫面', icon: '⚔️', mode: 'zoom',
      sels: ['#combat-root', '#ui-combat', '#combat-panel', '#battle-root', '.combat-root'],
      desc: '戰鬥、探索、ATB。' },
    { id: 'bag',    name: '行囊與裝備', icon: '🎒', mode: 'zoom',
      sels: ['#ui-equip-market', '#equip-panel', '#inventory-panel', '#bag-panel', '#ui-inventory'],
      desc: '行囊、裝備、商店、黑市。' },
    { id: 'guild',  name: '冒險者公會', icon: '🏛️', mode: 'zoom',
      sels: ['#ui-guild', '#guild-panel', '#guild-root'],
      desc: '公會、建築、技能。' },
    { id: 'celeb',  name: '江湖名人', icon: '🌟', mode: 'zoom',
      sels: ['#ui-celeb', '#celeb-panel', '#lottery-panel', '#ui-lottery'],
      desc: '名人、大樂透。' },
    { id: 'martial',name: '武學與門派', icon: '📖', mode: 'zoom',
      sels: ['#ui-martial-sect', '#martial-panel', '#sect-panel', '#ui-martial'],
      desc: '武學、門派、心法、經脈。' },
    { id: 'pet',    name: '寵物與同伴', icon: '🐾', mode: 'zoom',
      sels: ['#ui-companion-pet', '#pet-panel', '#companion-panel'],
      desc: '寵物、同伴。' },
    { id: 'log',    name: '訊息記錄', icon: '📜', mode: 'zoom',
      sels: ['#ui-log-panels', '#log-panel', '#log-root', '.log-root'],
      desc: '訊息、紀錄面板。' }
  ];

  var PRESETS = {
    small:  { label: '小',   global: 0.92, panel: 0.88 },
    normal: { label: '標準', global: 1.00, panel: 1.00 },
    large:  { label: '大',   global: 1.08, panel: 1.20 },
    huge:   { label: '特大', global: 1.15, panel: 1.45 }
  };

  var MIN = 0.5, MAX = 3;

  /* ══════════════════════════════════════════════════════
     狀態
     ══════════════════════════════════════════════════════ */
  var cfg = {};
  var customSel = {};
  var origRootPx = null;
  var ready = false;

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sysById(id) { for (var i = 0; i < SYSTEMS.length; i++) if (SYSTEMS[i].id === id) return SYSTEMS[i]; return null; }

  function defaults() {
    var d = {};
    SYSTEMS.forEach(function (s) { d[s.id] = 1; });
    return d;
  }

  function load() {
    cfg = defaults();
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        Object.keys(o).forEach(function (k) {
          if (cfg[k] !== undefined) cfg[k] = clamp(num(o[k], 1), MIN, MAX);
        });
      }
    } catch (e) { /* 忽略 */ }
    try {
      var raw2 = localStorage.getItem(LS_SEL);
      if (raw2) customSel = JSON.parse(raw2) || {};
    } catch (e) { customSel = {}; }
    // 好友面板初始值沿用 uiFriend4 的設定
    try {
      var f4 = window.HY.UIFriend4 && window.HY.UIFriend4.fontScale;
      if (f4 && !localStorage.getItem(LS_KEY)) cfg.friend = clamp(num(f4, 2), MIN, MAX);
    } catch (e) { /* 忽略 */ }
  }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) { /* 忽略 */ }
    try { localStorage.setItem(LS_SEL, JSON.stringify(customSel)); } catch (e) { /* 忽略 */ }
  }

  /* ══════════════════════════════════════════════════════
     套用
     ══════════════════════════════════════════════════════ */
  function captureRoot() {
    if (origRootPx !== null) return;
    var cs = window.getComputedStyle(document.documentElement).fontSize;
    origRootPx = parseFloat(cs) || 16;
  }

  function buildCss() {
    captureRoot();
    var css = '';

    /* 全域：改 <html> font-size */
    var g = clamp(num(cfg.global, 1), MIN, MAX);
    css += 'html { font-size: ' + (origRootPx * g).toFixed(3) + 'px !important; }\n';

    /* 好友面板：--frf（與 uiFriend4 的 calc 相容） */
    css += ':root { --frf: ' + clamp(num(cfg.friend, 1), MIN, MAX).toFixed(3) + ' !important; }\n';

    /* 各系統：zoom */
    SYSTEMS.forEach(function (s) {
      if (s.mode !== 'zoom') return;
      var v = clamp(num(cfg[s.id], 1), MIN, MAX);
      if (Math.abs(v - 1) < 0.002) return;
      var sels = [];
      if (customSel[s.id]) sels.push(customSel[s.id]);
      (s.sels || []).forEach(function (x) { if (sels.indexOf(x) === -1) sels.push(x); });
      sels.forEach(function (sel) {
        css += sel + ' { zoom: ' + v.toFixed(3) + ' !important; }\n';
      });
    });

    return css;
  }

  function apply() {
    var old = document.getElementById(STYLE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(buildCss()));
    document.head.appendChild(st);
    return true;
  }

  /* ══════════════════════════════════════════════════════
     API
     ══════════════════════════════════════════════════════ */
  function set(id, v) {
    if (!sysById(id)) { console.warn('[FontSys] 未知系統：' + id); return null; }
    cfg[id] = clamp(num(v, 1), MIN, MAX);
    apply(); save();
    return cfg[id];
  }

  function get(id) { return cfg[id] === undefined ? 1 : cfg[id]; }

  function setGlobal(v) { return set('global', v); }

  function setMany(o) {
    if (!o) return cfg;
    Object.keys(o).forEach(function (k) { if (cfg[k] !== undefined) cfg[k] = clamp(num(o[k], 1), MIN, MAX); });
    apply(); save();
    return cfg;
  }

  function preset(name) {
    var p = PRESETS[name] || PRESETS.normal;
    SYSTEMS.forEach(function (s) {
      if (s.mode === 'rem') cfg[s.id] = p.global;
      else cfg[s.id] = p.panel;
    });
    apply(); save();
    console.log('[FontSys] ✓ 套用預設：' + p.label);
    return cfg;
  }

  function reset(id) {
    if (id) { cfg[id] = 1; } else { cfg = defaults(); }
    apply(); save();
    return cfg;
  }

  function resetAll() { return reset(null); }

  function setSelector(id, sel) {
    if (!sysById(id)) return false;
    if (!sel) delete customSel[id];
    else customSel[id] = String(sel);
    apply(); save();
    return true;
  }

  function getSelector(id) {
    var s = sysById(id);
    if (!s) return '';
    return customSel[id] || (s.sels && s.sels[0]) || '';
  }

  function detect() {
    var out = {};
    SYSTEMS.forEach(function (s) {
      if (s.mode === 'rem') { out[s.id] = { matched: ['html'], hit: true }; return; }
      var sels = [];
      if (customSel[s.id]) sels.push(customSel[s.id]);
      (s.sels || []).forEach(function (x) { if (sels.indexOf(x) === -1) sels.push(x); });
      var hit = [];
      sels.forEach(function (sel) {
        try { if (document.querySelector(sel)) hit.push(sel); } catch (e) { /* 無效選擇器 */ }
      });
      out[s.id] = { matched: hit, hit: hit.length > 0, all: sels };
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════
     初始化
     ══════════════════════════════════════════════════════ */
  function boot() {
    if (ready) { apply(); return; }
    if (!document.head) return;
    ready = true;
    load();
    apply();
    // 面板若晚點才建立，補套一次
    setTimeout(apply, 1200);
    setTimeout(apply, 3000);
    console.log('[FontSys] ✓ 遊戲字體系統已啟動（' + SYSTEMS.length + ' 個可調目標）');
  }

  window.HY.FontSys = {
    version: '1.0',
    systems: SYSTEMS,
    presets: PRESETS,
    min: MIN,
    max: MAX,
    ready: false,
    boot: boot,
    apply: apply,
    get: get,
    set: set,
    setGlobal: setGlobal,
    setMany: setMany,
    preset: preset,
    reset: reset,
    resetAll: resetAll,
    setSelector: setSelector,
    getSelector: getSelector,
    detect: detect,
    cfg: function () { return JSON.parse(JSON.stringify(cfg)); },
    selectors: function () { return JSON.parse(JSON.stringify(customSel)); },
    open: function () {
      if (window.HY.UIFont && typeof window.HY.UIFont.open === 'function') return window.HY.UIFont.open();
      console.warn('[FontSys] 字體面板尚未就緒（uiFontPanel.js）');
      return false;
    },
    close: function () {
      if (window.HY.UIFont && typeof window.HY.UIFont.close === 'function') return window.HY.UIFont.close();
      return false;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();