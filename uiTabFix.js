// js/uiTabFix.js (v1)
// ⭐ 擴充標籤排版修正器
//
// 【解決三個問題】
//   ① 寬條：clone 自錨點的按鈕繼承了 flex:1 → 單獨佔列時被拉長
//          → 強制 flex:0 0 auto / width:auto / 固定高度
//   ② 順序亂：各腳本插入時機不同 → 每次載入順序不同
//          → 依固定順序重排，且「保留錨點相鄰關係」避免被其他腳本搬回
//             · 🔠字體 必須緊貼 📱畫面 之後（uiFontPanel 的檢查條件）
//             · 🔗系統連動 必須緊貼 💾儲存進度 之前（uiFriend6 的檢查條件）
//   ③ 高度不齊 → 統一 height / padding / font-size / border-radius
//
// 【安全性】純 CSS + DOM 排序，不碰任何遊戲邏輯，不改任何按鈕文字（除非你開 compact）
//
// Console：
//   HY.TabFix.run()                // 立即校正
//   HY.TabFix.status()             // 現況（偵測到哪些按鈕、目前順序）
//   HY.TabFix.order([...])         // 自訂順序
//   HY.TabFix.hide('font')         // 隱藏某顆（'font'|'link'|'town'|'offline'|'cheat'|'save'|'adaptive'）
//   HY.TabFix.show('font')
//   HY.TabFix.compact(true)        // 精簡文字（畫面：智慧自適應 → 畫面適應）；預設關閉
//   HY.TabFix.audit()              // 列出所有按鈕的尺寸（診斷寬條）
//
// ⚠️ 載入順序：UI 層最後（所有會插按鈕的檔之後）、main.js 之前
window.HY = window.HY || {};

(function () {
  var CFG = {
    CONTAINER_SEL: '.system-controls',
    FALLBACK_SEL: '#top-bar',

    /* 固定順序（左→右）。未列出的會接在最後，並保持原本相對順序 */
    ORDER: ['offline', 'adaptive', 'font', 'town', 'friend', 'bag', 'link', 'save', 'cheat'],

    /* 隱藏清單 */
    HIDDEN: {},

    /* 統一尺寸 */
    BTN_HEIGHT: 30,
    BTN_PAD: 11,
    BTN_FONT: '.78rem',

    /* 精簡文字（預設關閉；開啟不影響錨點比對） */
    COMPACT: false,

    /* 校正頻率 */
    TICK_MS: 700,
    TICK_MAX: 80,
    VERBOSE: true
  };

  var _orig = {};     // key -> 原始文字
  var _lastSig = '';

  function log() { if (!CFG.VERBOSE) return; try { console.log.apply(console, ['[TabFix]'].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, ['[TabFix]'].concat([].slice.call(arguments))); } catch (e) {} }
  function norm(s) { return String(s == null ? '' : s).replace(/[\s\u00a0\u200b]+/g, ''); }
  function txtOf(el) { return el ? String(el.textContent || '') : ''; }
  function isEl(n) { return n && n.nodeType === 1; }

  /* ══════════════════════════════════════════════════════
     ① 辨識按鈕
     ══════════════════════════════════════════════════════ */
  var ID_MAP = {
    'fr3-main-tab': 'friend',
    'link-main-tab': 'link',
    'font-main-tab': 'font',
    'bagov-main-tab': 'bag'
  };

  function detect(el) {
    if (!isEl(el)) return null;
    var id = el.id || '';
    if (ID_MAP[id]) return ID_MAP[id];

    var t = norm(txtOf(el));
    if (!t || t.length > 22) return null;

    /* 依序比對（長字串優先，避免誤判） */
    if (t.indexOf('系統連動') !== -1) return 'link';
    if (t.indexOf('行囊大修') !== -1) return 'bag';
    if (t.indexOf('儲存進度') !== -1) return 'save';
    if (t.indexOf('作弊面板') !== -1 || t.indexOf('作弊') !== -1) return 'cheat';
    if (t.indexOf('離線掛機艙') !== -1) return 'offline';
    if (t.indexOf('我的小鎮') !== -1 || (t.indexOf('小鎮') !== -1 && t.length <= 8)) return 'town';
    if (t.indexOf('重啟') !== -1 && t.indexOf('時空') !== -1) return 'reset';
    if (t.indexOf('字體') !== -1 && t.length <= 8) return 'font';
    if (t.indexOf('好友') !== -1 && t.length <= 8) return 'friend';
    /* 畫面適應：需同時含「畫面」+（適應 or 智慧） */
    if (t.indexOf('畫面') !== -1 && (t.indexOf('適應') !== -1 || t.indexOf('智慧') !== -1)) return 'adaptive';
    return null;
  }

  /* ══════════════════════════════════════════════════════
     ② 精簡文字
     ══════════════════════════════════════════════════════ */
  var SHORT = {
    adaptive: '📱 畫面適應',
    offline: '🧘 離線',
    cheat: '🛠️ 作弊',
    save: '💾 儲存',
    town: '🏘️ 小鎮'
  };

  function applyCompact(el, key) {
    if (!el) return;
    if (_orig[key] === undefined) _orig[key] = txtOf(el);
    if (CFG.COMPACT && SHORT[key]) {
      if (txtOf(el) !== SHORT[key]) el.textContent = SHORT[key];
    } else if (_orig[key] !== undefined) {
      if (txtOf(el) !== _orig[key]) el.textContent = _orig[key];
    }
  }

  /* ══════════════════════════════════════════════════════
     ③ 樣式
     ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('tabfix-style')) return;
    var host = document.head || document.documentElement;
    if (!host) return;
    var H = CFG.BTN_HEIGHT, P = CFG.BTN_PAD, F = CFG.BTN_FONT;
    var css = `
/* ══ .system-controls：統一為整齊的換行工具列 ══ */
${CFG.CONTAINER_SEL}{
  display:flex !important;
  flex-wrap:wrap !important;
  align-items:center !important;
  justify-content:flex-end !important;
  gap:6px !important;
  row-gap:6px !important;
  max-width:100% !important;
}
/* ══ 每一顆按鈕：統一尺寸（★ 關鍵：flex:0 0 auto 修正寬條）══ */
${CFG.CONTAINER_SEL} > button,
${CFG.CONTAINER_SEL} > a,
${CFG.CONTAINER_SEL} > .hy-ext-btn,
.hy-ext-btn{
  flex:0 0 auto !important;
  width:auto !important;
  min-width:0 !important;
  max-width:none !important;
  height:${H}px !important;
  box-sizing:border-box !important;
  padding:0 ${P}px !important;
  margin:0 !important;
  font-size:${F} !important;
  line-height:${H - 2}px !important;
  white-space:nowrap !important;
  overflow:hidden !important;
  text-overflow:ellipsis !important;
  border-radius:6px !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:5px !important;
  vertical-align:middle !important;
  animation:none !important;
}
/* 內部裝飾元素不要影響排版 */
.hy-ext-btn > span,
${CFG.CONTAINER_SEL} > button > span{
  display:inline-block !important;
  line-height:1 !important;
  flex:0 0 auto !important;
}
.hy-ext-btn .font-shine,
.hy-ext-btn .fr3-shine{display:none !important;}

/* ══ 窄螢幕：縮短內距 ══ */
@media (max-width:1100px){
  ${CFG.CONTAINER_SEL} > button,
  ${CFG.CONTAINER_SEL} > a,
  .hy-ext-btn{ padding:0 8px !important; font-size:.74rem !important; }
}
`;
    var st = document.createElement('style');
    st.id = 'tabfix-style';
    st.appendChild(document.createTextNode(css));
    host.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════
     ④ 主流程
     ══════════════════════════════════════════════════════ */
  function container() {
    var c = document.querySelector(CFG.CONTAINER_SEL);
    if (c) return c;
    return document.querySelector(CFG.FALLBACK_SEL);
  }

  function run() {
    if (!document.body) return false;
    injectCSS();

    var ctrl = container();
    if (!ctrl) return false;

    var kids = Array.prototype.slice.call(ctrl.children).filter(isEl);

    /* ① 分桶 */
    var bucket = {};     // key -> [el...]
    var unknown = [];
    kids.forEach(function (el) {
      var k = detect(el);
      if (!k) { unknown.push(el); return; }
      (bucket[k] = bucket[k] || []).push(el);
    });

    /* ② 去重（同 key 只留第一顆，其餘移除） */
    var keep = {};
    Object.keys(bucket).forEach(function (k) {
      var arr = bucket[k];
      keep[k] = arr[0];
      for (var i = 1; i < arr.length; i++) {
        if (arr[i].parentNode) arr[i].parentNode.removeChild(arr[i]);
        log('移除重複按鈕：' + k);
      }
    });

    /* ③ 標記 class + 顯示/隱藏 + 文字 */
    Object.keys(keep).forEach(function (k) {
      var el = keep[k];
      if (!el) return;
      el.classList.add('hy-ext-btn');
      el.setAttribute('data-tabfix', k);
      if (CFG.HIDDEN[k]) el.style.setProperty('display', 'none', 'important');
      else el.style.removeProperty('display');
      applyCompact(el, k);
    });

    /* ④ 組出目標順序 */
    var seq = [];
    CFG.ORDER.forEach(function (k) { if (keep[k]) seq.push(keep[k]); });
    Object.keys(keep).forEach(function (k) {
      if (CFG.ORDER.indexOf(k) === -1 && keep[k]) seq.push(keep[k]);
    });
    unknown.forEach(function (el) { seq.push(el); });

    /* ⑤ 比對現況，不同才重排（避免無意義的 DOM 變動） */
    var cur = Array.prototype.slice.call(ctrl.children).filter(isEl);
    var same = (cur.length === seq.length) && cur.every(function (el, i) { return el === seq[i]; });

    if (!same) {
      /* 一次同步搬完 → MutationObserver 在微任務後才跑，會看到「已一致」的狀態
         且錨點相鄰關係（font 緊貼 adaptive、link 緊貼 save）全程保留 → 不會被其他腳本搬回 */
      seq.forEach(function (el) { ctrl.appendChild(el); });
      var sig = seq.map(function (el) { return el.getAttribute('data-tabfix') || '?'; }).join('>');
      if (sig !== _lastSig) {
        _lastSig = sig;
        log('已重排：' + sig);
      }
    }

    /* ⑥ 錨點相鄰檢查（若被外力拆散，這裡會在下一次 run 修回） */
    var adjOK = true;
    if (keep.adaptive && keep.font) {
      if (keep.font.previousElementSibling !== keep.adaptive) adjOK = false;
    }
    if (keep.link && keep.save) {
      if (keep.link.nextElementSibling !== keep.save) adjOK = false;
    }
    if (!adjOK && CFG.VERBOSE) log('偵測到錨點相鄰被拆散，下次校正會修回');

    return !same;
  }

  /* ══════════════════════════════════════════════════════
     ⑤ 持續校正
     ══════════════════════════════════════════════════════ */
  var _pending = false;
  function schedule() {
    if (_pending) return;
    _pending = true;
    setTimeout(function () {
      _pending = false;
      try { run(); } catch (e) { warn('校正失敗：', e); }
    }, 50);
  }

  function startObserver() {
    if (!window.MutationObserver || !document.body) return;
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type !== 'childList') continue;
          if (!m.addedNodes || !m.addedNodes.length) continue;
          /* 只關心「新按鈕被加進容器」或「容器本身」 */
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (!isEl(n)) continue;
            if (n === container() || n.closest && n.closest(CFG.CONTAINER_SEL)) { schedule(); return; }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      window.__tabFixMO = mo;
    } catch (e) { warn('MutationObserver 失敗：', e); }
  }

  /* ══════════════════════════════════════════════════════
     ⑥ 對外 API
     ══════════════════════════════════════════════════════ */
  window.HY.TabFix = {
    version: '1.0',
    ready: false,
    run: function () { return run(); },
    config: function (o) { if (o) Object.keys(o).forEach(function (k) { CFG[k] = o[k]; }); injectCSS(); return CFG; },
    order: function (a) {
      if (Array.isArray(a) && a.length) { CFG.ORDER = a.slice(); run(); }
      return CFG.ORDER.slice();
    },
    hide: function (k) { if (k) { CFG.HIDDEN[k] = 1; run(); } return Object.keys(CFG.HIDDEN); },
    show: function (k) { if (k) { delete CFG.HIDDEN[k]; run(); } return Object.keys(CFG.HIDDEN); },
    compact: function (v) {
      CFG.COMPACT = (v !== false);
      run();
      return CFG.COMPACT;
    },
    /** 列出所有按鈕的實際尺寸（診斷寬條用） */
    audit: function () {
      var ctrl = container();
      if (!ctrl) { warn('找不到容器 ' + CFG.CONTAINER_SEL); return []; }
      var rows = [];
      Array.prototype.slice.call(ctrl.children).filter(isEl).forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        rows.push({
          '#': i,
          key: el.getAttribute('data-tabfix') || '（未知）',
          id: el.id || '',
          text: norm(txtOf(el)).slice(0, 14),
          寬: Math.round(r.width),
          高: Math.round(r.height),
          flexGrow: window.getComputedStyle(el).flexGrow,
          display: window.getComputedStyle(el).display
        });
      });
      console.log('%c=== TabFix 按鈕尺寸稽核 ===', 'color:#34d399;font-weight:bold');
      console.table(rows);
      console.log('提示：寬度特別大的那顆，就是原本的「寬條」問題來源（已由 flex:0 0 auto 修正）');
      return rows;
    },
    status: function () {
      var ctrl = container();
      var keys = [];
      if (ctrl) {
        Array.prototype.slice.call(ctrl.children).filter(isEl).forEach(function (el) {
          keys.push(el.getAttribute('data-tabfix') || (el.id ? '#' + el.id : norm(txtOf(el)).slice(0, 10)));
        });
      }
      return {
        version: '1.0',
        ready: window.HY.TabFix.ready,
        container: ctrl ? (ctrl.className || ctrl.id || ctrl.tagName) : null,
        containerFound: !!ctrl,
        order: CFG.ORDER.slice(),
        current: keys,
        hidden: Object.keys(CFG.HIDDEN),
        compact: CFG.COMPACT,
        observer: !!window.__tabFixMO,
        styleInjected: !!document.getElementById('tabfix-style')
      };
    }
  };

  /* ══════════════════════════════════════════════════════
     ⑦ 啟動
     ══════════════════════════════════════════════════════ */
  function boot() {
    if (!document.body) return false;
    if (!window.HY.TabFix.ready) {
      injectCSS();
      startObserver();
      window.HY.TabFix.ready = true;
      log('已啟動（容器：' + CFG.CONTAINER_SEL + '｜順序：' + CFG.ORDER.join(' > ') + '）');
    }
    run();
    return true;
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 200);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 200); });
  window.addEventListener('load', function () { setTimeout(boot, 600); });

  /* 保險：其他腳本會在 150ms / 700ms / 1200ms 等時機插按鈕，這裡持續校正 */
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    boot();
    if (tries >= CFG.TICK_MAX) clearInterval(timer);
  }, CFG.TICK_MS);

  /* 額外補幾次（offlineIdleSystem 較晚） */
  [1500, 2500, 4000, 6000].forEach(function (ms) {
    setTimeout(function () { try { run(); } catch (e) {} }, ms);
  });

  console.log('[TabFix] ✓ 已載入（擴充標籤排版修正）');
})();