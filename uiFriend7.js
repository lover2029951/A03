// js/uiFriend7.js (v1)
// ⭐ 連動總覽 UI（取代「未偵測到外部來源」的顯示）
//    🔗 連動總覽：20 系統狀態（自建／已接軌／混合）＋ 效果來源 ＋ 交叉關聯網
//
// ⚠️ 載入順序：uiFriend6.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiFriend7] 找不到 HY.UITown'); return; }
  var L = window.HY.Link;
  if (!L) { console.error('[uiFriend7] linkBus.js 未載入'); return; }
  var C = window.HY.LinkContent;

  var SUB_ID = 'linkmap';
  var SUB_LABEL = '🗺️ 連動總覽';

  window.HY.UIFriend7 = {
    version: '1.0',
    subId: SUB_ID,
    ready: false,
    audit: function () { return L.audit(); },
    summary: function () { return L.summary(); }
  };

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function esc(s) { return String(s == null ? '' : s); }
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function G() { return window.HY.game || {}; }
  function T() { return G().townSys; }

  /* ══════════════════════════════════════════════════════
     分頁列
     ══════════════════════════════════════════════════════ */
  function subBarFull(active) {
    var subs = [
      { id: 'roster', label: '👥 好友名單' }, { id: 'team', label: '🚩 組隊同行' },
      { id: 'feed', label: '📡 好友動態' }, { id: 'social', label: '💬 互動' },
      { id: 'codex', label: '📖 名人圖鑑' }, { id: 'stat', label: '📊 統計與設定' },
      { id: 'exp', label: '🏰 出團遠征' }, { id: 'rank', label: '🏆 排行榜' },
      { id: 'bond', label: '💞 羈絆關係' }, { id: 'title', label: '🎖️ 稱號成就' },
      { id: 'mail', label: '✉️ 書信' }, { id: 'quest', label: '🎯 互助任務' },
      { id: 'tourney', label: '🎪 比武大會' },
      { id: 'wb', label: '🌍 世界王' }, { id: 'home', label: '🏠 洞府家園' },
      { id: 'auction', label: '🏛️ 拍賣行' }, { id: 'hostile', label: '😈 仇敵' },
      { id: 'teach', label: '🎓 授業傳功' }, { id: 'shop', label: '⚒️ 好友工坊' },
      { id: 'guard', label: '🛡️ 保鑣護衛' }, { id: 'wish', label: '💌 心願日常' },
      { id: 'ware', label: '📦 好友倉庫' },
      { id: 'link', label: '🔗 系統連動' },
      { id: SUB_ID, label: SUB_LABEL }
    ];
    var html = '<div class="fr-subs" data-fr7full="1">';
    subs.forEach(function (s) {
      html += '<button class="fr-sub' + (s.id === active ? ' on' : '') + '" data-frsub="' + s.id + '">' + s.label + '</button>';
    });
    return html + '</div>';
  }

  function postBar(ui) {
    var panel = ui.el && ui.el.panels && ui.el.panels.friend;
    if (!panel) return;
    var bar = panel.querySelector('.fr-subs');
    if (!bar) return;
    if (bar.getAttribute('data-fr7full') === '1') return;
    bar.setAttribute('data-fr7full', '1');
    var b = document.createElement('button');
    b.className = 'fr-sub' + (ui.frSub === SUB_ID ? ' on' : '');
    b.setAttribute('data-frsub', SUB_ID);
    b.textContent = SUB_LABEL;
    bar.appendChild(b);
  }

  /* ══════════════════════════════════════════════════════
     掛載
     ══════════════════════════════════════════════════════ */
  var _render = proto.renderFriendPanel;
  proto.renderFriendPanel = function () {
    if (this.frSub === SUB_ID) { this.fr7Render(); return; }
    _render.call(this);
    try { postBar(this); } catch (e) { /* 忽略 */ }
  };

  proto.fr7Render = function () {
    var panel = this.el && this.el.panels && this.el.panels.friend;
    if (!panel) return;

    var rep = null;
    try { rep = T() && T().friendReport ? T().friendReport() : null; } catch (e) { rep = null; }

    var html = '';
    try { if (rep) html += this.frHeaderHtml(rep); } catch (e) { /* 忽略 */ }
    html += subBarFull(SUB_ID);

    try {
      html += this.fr7SummaryHtml();
      html += this.fr7SystemsHtml();
      html += this.fr7EffectsHtml();
      html += this.fr7SynergyHtml();
      html += this.fr7LogHtml();
    } catch (e) {
      html += '<div class="fr-empty">渲染失敗：' + esc(e.message) + '</div>';
      console.error('[uiFriend7] 渲染失敗：', e);
    }

    panel.innerHTML = html;
    try { if (this.frBind) this.frBind(panel); } catch (e) { /* 忽略 */ }
    this.fr7Bind(panel);
  };

  /* ══════════ ① 摘要 ══════════ */
  proto.fr7SummaryHtml = function () {
    var s = L.summary();
    var html = '<div class="fr-block"><div class="fr-btitle">🗺️ 全系統連動總覽</div>' +
      '<div class="fr-rows">' +
      '<span>已註冊系統 <b>' + s.total + '</b></span>' +
      '<span>自建正本 <b>' + s.native + '</b></span>' +
      '<span>已接軌外部 <b>' + s.external + '</b></span>' +
      '<span>混合 <b>' + s.hybrid + '</b></span>' +
      '<span>效果 <b>' + s.effects + '</b></span>' +
      '<span>鉤子 <b>' + s.hooks + '</b></span>' +
      '</div>' +
      '<div class="fr3-dim">' +
      '<b>自建正本</b>：由本作自帶的完整實作，不依賴外部系統（原「未偵測到外部來源」已全部補齊）。<br>' +
      '<b>已接軌外部</b>：偵測到你的系統並取其數值。<br>' +
      '<b>混合</b>：自建為主、外部為輔（有外部時自動升級）。<br>' +
      '所有系統的加成統一經 <code>HY.Link.collect()</code> 聚合，數值必定一致。' +
      '</div></div>';

    html += '<div class="fr-block"><div class="fr-btitle">🔧 匯流排工具</div>' +
      '<div class="fr-btns">' +
      '<button class="fr3-btn" data-fr7="discover">🔍 重新探索外部系統</button>' +
      '<button class="fr3-btn" data-fr7="dump">📋 匯出稽核（Console）</button>' +
      '<button class="fr3-btn" data-fr7="testHooks">⚡ 測試鉤子</button>' +
      '</div></div>';
    return html;
  };

  /* ══════════ ② 系統清單 ══════════ */
  proto.fr7SystemsHtml = function () {
    var A = L.audit();
    var html = '<div class="fr-block"><div class="fr-btitle">🧩 系統註冊表（' + A.length + '）</div>' +
      '<div class="fr3-dim">來源標籤：<span class="fr3-chip g">自建</span> ' +
      '<span class="fr3-chip b">已接軌</span> <span class="fr3-chip v">混合</span></div></div>';

    html += '<div class="fr3-grid">';
    A.forEach(function (x) {
      var src = x.source === 'external' ? 'b' : (x.source === 'hybrid' ? 'v' : 'g');
      var srcLabel = x.source === 'external' ? '已接軌' : (x.source === 'hybrid' ? '混合' : '自建');
      var off = x.disabled;
      html += '<div class="fr3-card' + (off ? '' : ' ok') + '">' +
        '<div class="fr3-head"><span class="fr3-name">' + x.icon + ' ' + esc(x.name) + '</span>' +
        '<span class="fr3-chip ' + src + '">' + srcLabel + '</span></div>' +
        '<div class="fr3-dim">' + esc(x.desc) + '</div>' +
        '<div class="fr3-chips">' +
        '<span class="fr3-chip">效果 ' + x.effectCount + '</span>' +
        (x.hookNames.length ? '<span class="fr3-chip">鉤子 ' + x.hookNames.join('/') + '</span>' : '') +
        (x.boundPath ? '<span class="fr3-chip b">' + esc(x.boundPath) + '</span>' : '') +
        '</div>' +
        '<div class="fr-btns">' +
        '<button class="fr3-btn' + (off ? ' g' : ' y') + '" data-fr7="toggle" data-fr7v="' + x.id + '">' +
        (off ? '▶️ 啟用' : '⏸️ 停用') + '</button>' +
        '<button class="fr3-btn" data-fr7="bind" data-fr7v="' + x.id + '">🔗 手動綁定</button>' +
        '</div></div>';
    });
    html += '</div>';
    return html;
  };

  /* ══════════ ③ 效果來源 ══════════ */
  proto.fr7EffectsHtml = function () {
    var t = T();
    var f = t && t.friendAll ? t.friendAll()[0] : null;
    var ctx = f ? window.HY.LinkCtxOf(f) : {};
    var res = L.collect('friend', ctx);

    var html = '<div class="fr-block"><div class="fr-btitle">✨ 效果聚合實例' +
      (f ? '（範例：' + f.icon + esc(f.name) + '）' : '') + '</div>';
    if (!f) {
      html += '<div class="fr3-dim">尚無好友可示範。</div></div>';
      return html;
    }
    var keys = Object.keys(res).filter(function (k) { return k !== 'sources'; });
    html += '<div class="fr-rows">';
    keys.forEach(function (k) {
      var v = res[k];
      var isMul = /Mul$/.test(k) || k === 'expMul' || k === 'goldMul' || k === 'dropMul' || k === 'atbMul' || k === 'spMul';
      html += '<span>' + esc(k) + ' <b>' + (isMul ? pct(v) : v.toFixed(3)) + '</b></span>';
    });
    html += '</div>';
    html += '<div class="fr3-dim">來源（' + (res.sources || []).length + '）：</div>';
    html += '<div class="fr3-logs">';
    (res.sources || []).forEach(function (s) {
      html += '<div class="fr3-log ok"><span class="fr3-chip ' + (s.mul !== null ? 'v' : 'g') + '">' +
        esc(s.sys) + '</span> ' + esc(s.label) + '　' + s.target + ' = ' +
        (s.mul !== null ? pct(s.value) : s.value.toFixed(3)) + '</div>';
    });
    if (!(res.sources || []).length) html += '<div class="fr3-log">（無效果觸發，好友尚未學陣法／養寵物…）</div>';
    html += '</div></div>';
    return html;
  };

  /* ══════════ ④ 交叉關聯網 ══════════ */
  proto.fr7SynergyHtml = function () {
    var M = (C && C.SYNERGY_MAP) || {};
    var ids = Object.keys(M);
    var html = '<div class="fr-block"><div class="fr-btitle">🕸️ 系統交叉關聯網</div>' +
      '<div class="fr3-dim">每個系統與其他系統的咬合關係。未來的系統只要註冊進匯流排，' +
      '就會自動出現在此網中並與既有系統互相關聯。</div></div>';

    html += '<div class="fr3-grid">';
    ids.forEach(function (id) {
      var s = L.sysInfo(id) || { name: id, icon: '🧩' };
      var links = M[id] || [];
      html += '<div class="fr3-card"><div class="fr3-head">' +
        '<span class="fr3-name">' + (s.icon || '🧩') + ' ' + esc(s.name || id) + '</span>' +
        '<span class="fr3-meta">' + links.length + ' 條</span></div>' +
        '<div class="fr3-chips">';
      links.forEach(function (x) {
        var s2 = L.sysInfo(x) || { name: x, icon: '🧩' };
        html += '<span class="fr3-chip v">' + (s2.icon || '') + esc(s2.name || x) + '</span>';
      });
      html += '</div></div>';
    });
    html += '</div>';

    /* 新增系統偵測 */
    var all = L.systems().map(function (s) { return s.id; });
    var notMapped = all.filter(function (id) { return ids.indexOf(id) === -1; });
    if (notMapped.length) {
      html += '<div class="fr-block"><div class="fr-btitle">🆕 尚未納入關聯網的系統</div>' +
        '<div class="fr3-chips">' + notMapped.map(function (x) {
          var s = L.sysInfo(x) || {};
          return '<span class="fr3-chip">' + (s.icon || '') + esc(s.name || x) + '</span>';
        }).join('') + '</div>' +
        '<div class="fr3-dim">這些系統已註冊但尚未定義關聯，可在此面板按「🔗 補關聯」自動建立。</div>' +
        '<div class="fr-btns" style="margin-top:6px">' +
        '<button class="fr3-btn" data-fr7="autoSyn">🔗 自動補關聯</button>' +
        '</div></div>';
    }
    return html;
  };

  /* ══════════ ⑤ 匯流排日誌 ══════════ */
  proto.fr7LogHtml = function () {
    var lg = L.log();
    var html = '<div class="fr-block"><div class="fr-btitle">📜 匯流排日誌</div>';
    if (!lg.length) return html + '<div class="fr3-dim">尚無紀錄。</div>';
    html += '<div class="fr3-logs">';
    lg.slice(0, 40).forEach(function (l) {
      var cls = l.kind === 'error' ? 'no' : (l.kind === 'discover' || l.kind === 'auto' ? 'ok' : '');
      var d = new Date(l.t);
      var ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
      html += '<div class="fr3-log ' + cls + '"><span style="color:#64748b;font-size:.68rem;margin-right:5px">' +
        ts + '</span>' + esc(l.msg) + '</div>';
    });
    html += '</div></div>';
    return html;
  };

  /* ══════════ 事件 ══════════ */
  var ACT = {
    discover: function () {
      var r = L.discover(true);
      alert('重新探索完成：\n掃描 ' + r.scanned + ' 個候選\n新綁定 ' + r.bound + ' 個外部系統');
      this.renderFriendPanel();
    },
    dump: function () {
      var a = L.audit();
      console.log('%c=== HY.Link 稽核 ===', 'color:#6ee7b7;font-weight:bold');
      console.table(a.map(function (x) {
        return { id: x.id, name: x.name, source: x.source, boundPath: x.boundPath, effects: x.effectCount, hooks: x.hookNames.join('/') };
      }));
      console.log('%c=== 效果清單 ===', 'color:#6ee7b7;font-weight:bold');
      console.table(Object.keys(L.effectsOf ? {} : {}) ? [] : []);
      alert('稽核已輸出至 Console（請開啟 DevTools 查看）。');
    },
    testHooks: function () {
      var out = {};
      ['onTick', 'onBattleStart', 'onLoot', 'onLevelUp', 'onTownUp'].forEach(function (n) {
        var r = L.fire(n, { test: true, friend: null, tier: 1, enemyLv: 30 });
        out[n] = r.length;
      });
      console.log('[Link] 鉤子測試結果：', out);
      alert('鉤子測試完成，詳見 Console。\n' + Object.keys(out).map(function (k) { return k + ': ' + out[k] + ' 個處理器'; }).join('\n'));
    },
    toggle: function (v) {
      var off = !L.isOff(v);
      L.setOff(v, off);
      this.renderFriendPanel();
    },
    bind: function (v) {
      var cur = (L.audit().filter(function (x) { return x.id === v; })[0] || {}).boundPath || '';
      var p = prompt('輸入要綁定的路徑（例如 HY.game.petManager）\n留空 = 清除綁定', cur);
      if (p === null) return;
      L.setBinding(v, p.trim());
      L.discover(true);
      this.renderFriendPanel();
    },
    autoSyn: function () {
      if (!C) return;
      var M = C.SYNERGY_MAP;
      var all = L.systems().map(function (s) { return s.id; });
      var added = 0;
      all.forEach(function (id) {
        if (!M[id]) { M[id] = []; added += 1; }
        // 依 tag 自動關聯
        var a = L.sysInfo(id);
        all.forEach(function (o) {
          if (o === id) return;
          if (M[id].indexOf(o) !== -1) return;
          var b = L.sysInfo(o);
          if (!a || !b) return;
          var share = (a.caps || []).filter(function (c) { return (b.caps || []).indexOf(c) !== -1; });
          if (share.length) M[id].push(o);
        });
      });
      alert('自動補關聯完成，新增 ' + added + ' 個節點。');
      this.renderFriendPanel();
    }
  };

  proto.fr7Bind = function (panel) {
    if (!panel || panel._fr7Bound) return;
    panel._fr7Bound = true;
    var self = this;
    panel.addEventListener('click', function (e) {
      var el = (e.target && e.target.closest) ? e.target.closest('[data-fr7]') : null;
      if (!el) return;
      var fn = ACT[el.getAttribute('data-fr7')];
      if (!fn) return;
      e.preventDefault();
      try { fn.call(self, el.getAttribute('data-fr7v') || '', el); }
      catch (err) { console.error('[uiFriend7] 動作失敗：', err); }
    });
  };

  window.HY.UIFriend7.ready = true;
  console.log('[uiFriend7] ✓ 已載入（🗺️ 連動總覽）');
})();