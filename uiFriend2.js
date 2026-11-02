// js/uiFriend2.js (v2)
// ⭐ 好友系統 v2 UI：新增 7 個分頁
//    🏰 出團遠征　🏆 排行榜　💞 羈絆關係　🎖️ 稱號成就　✉️ 書信　🎯 互助任務　🎪 比武大會
//
// 【v2 改動】檔尾 HY.UIFriend2 增加 injectStyles2 對外暴露
//            → 讓 uiFriend3.js 在「小鎮 UI 未建構」時也能注入樣式
//
// 手法：包裝 renderFriendPanel（v2 分頁走自己的渲染器；v1 分頁沿用原渲染器並補上分頁按鈕）
// ⚠️ 載入順序：uiFriend.js 之後、uiFriend3.js 之前
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiFriend2] 找不到 HY.UITown'); return; }
  if (!window.HY.FriendData2 || !window.HY.FriendParty) { console.error('[uiFriend2] 好友 v2 系統未載入'); return; }

  var V1_SUBS = [
    { id: 'roster', label: '👥 好友名單' },
    { id: 'team',   label: '🚩 組隊同行' },
    { id: 'feed',   label: '📡 好友動態' },
    { id: 'social', label: '💬 互動' },
    { id: 'codex',  label: '📖 名人圖鑑' },
    { id: 'stat',   label: '📊 統計與設定' }
  ];
  var V2_SUBS = [
    { id: 'exp',    label: '🏰 出團遠征' },
    { id: 'rank',   label: '🏆 排行榜' },
    { id: 'bond',   label: '💞 羈絆關係' },
    { id: 'title',  label: '🎖️ 稱號成就' },
    { id: 'mail',   label: '✉️ 書信' },
    { id: 'quest',  label: '🎯 互助任務' },
    { id: 'tourney',label: '🎪 比武大會' }
  ];
  var V2_IDS = V2_SUBS.map(function (s) { return s.id; });
  var ALL_SUBS = V1_SUBS.concat(V2_SUBS);

  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function esc(s) { return String(s == null ? '' : s); }
  function ago(t) {
    if (!t) return '';
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }

  /* ══════════ 樣式 ══════════ */
  function injectStyles2() {
    if (document.getElementById('friend-style2')) return;
    var css = `
.fr2-grid2 { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
.fr2-card { background:#131b26; border:1px solid #2e3b4e; border-radius:6px; padding:9px 10px; display:flex; flex-direction:column; gap:6px; }
.fr2-card:hover { border-color:#34d399; }
.fr2-card.hot { border-color:#ef4444; background:#1d1214; }
.fr2-card.ok { border-color:#10b981; }
.fr2-card.run { border-color:#00e5ff; }
.fr2-title { font-size:.85rem; font-weight:bold; color:#6ee7b7; margin-bottom:6px; }
.fr2-sub2 { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed #2e3b4e; }
.fr2-chip { font-size:.7rem; padding:1px 8px; border-radius:9px; border:1px solid #2e3b4e; color:#94a3b8; background:#0f1720; }
.fr2-chip.g { border-color:#10b981; color:#6ee7b7; }
.fr2-chip.b { border-color:#00e5ff; color:#67e8f9; }
.fr2-chip.r { border-color:#ef4444; color:#fca5a5; }
.fr2-chip.y { border-color:#fbbf24; color:#fcd34d; }
.fr2-chip.p { border-color:#f472b6; color:#f9a8d4; }
.fr2-chip.v { border-color:#a78bfa; color:#c4b5fd; }
.fr2-btn { background:#2b394a; color:#6ee7b7; border:1px solid #34d399; border-radius:3px; padding:2px 8px; font-size:.72rem; cursor:pointer; }
.fr2-btn:hover { background:#3a4a5e; }
.fr2-btn:disabled { opacity:.35; cursor:not-allowed; }
.fr2-btn.r { border-color:#ef4444; color:#fca5a5; }
.fr2-btn.y { border-color:#fbbf24; color:#fcd34d; }
.fr2-bar2 { height:7px; background:#0d1219; border:1px solid #334155; border-radius:3px; overflow:hidden; }
.fr2-bar2 > div { height:100%; background:linear-gradient(90deg,#0f766e,#34d399); }
.fr2-bar2.hp > div { background:linear-gradient(90deg,#b91c1c,#ef4444); }
.fr2-bar2.p > div { background:linear-gradient(90deg,#b78a3f,#fbbf24); }
.fr2-bar2.c > div { background:linear-gradient(90deg,#00e5ff,#7dd3fc); }
.fr2-row2 { display:flex; justify-content:space-between; align-items:center; gap:8px; background:#121822; border:1px solid #2e3b4e; border-radius:4px; padding:5px 8px; font-size:.77rem; margin-bottom:4px; }
.fr2-row2:hover { border-color:#c89d54; }
.fr2-dim2 { font-size:.71rem; color:#94a3b8; line-height:1.5; }
.fr2-note2 { font-size:.72rem; color:#7dd3fc; line-height:1.5; }
.fr2-log2 { font-size:.75rem; line-height:1.5; border-left:2px solid #2e3b4e; padding-left:7px; color:#cbd5e1; margin-bottom:3px; }
.fr2-log2.ok { border-color:#10b981; }
.fr2-log2.no { border-color:#ef4444; }
.fr2-rank { display:flex; align-items:center; gap:8px; background:#121822; border:1px solid #2e3b4e; border-radius:4px; padding:5px 8px; font-size:.78rem; margin-bottom:3px; }
.fr2-rank.me { border-color:#fbbf24; background:#1c1a10; }
.fr2-rank.top1 { border-color:#fbbf24; } .fr2-rank.top2 { border-color:#cbd5e1; } .fr2-rank.top3 { border-color:#c98a4b; }
.fr2-medal { width:24px; text-align:center; font-weight:bold; color:#94a3b8; }
.fr2-up { color:#10b981; font-size:.7rem; } .fr2-dn { color:#ef4444; font-size:.7rem; }
.fr2-boardtabs { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
.fr2-bt { font-size:.73rem; padding:3px 10px; border-radius:11px; border:1px solid #2e3b4e; background:#0f1720; color:#94a3b8; cursor:pointer; }
.fr2-bt.on { border-color:#34d399; color:#6ee7b7; background:rgba(52,211,153,.14); font-weight:bold; }
.fr2-bond { display:flex; align-items:center; gap:8px; background:#121822; border:1px solid #2e3b4e; border-radius:6px; padding:7px 9px; margin-bottom:5px; }
.fr2-bond .pl { font-size:1.1rem; }
.fr2-two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:940px){ .fr2-two { grid-template-columns:1fr; } }
.fr2-tbl { width:100%; font-size:.76rem; border-collapse:collapse; }
.fr2-tbl td { padding:3px 5px; border-bottom:1px solid #1e293b; }
.fr2-tbl td:last-child { text-align:right; color:#e2e8f0; }
.fr2-tagx { display:inline-block; font-size:.68rem; padding:1px 7px; border-radius:9px; border:1px solid #a78bfa; color:#c4b5fd; margin:1px 2px; background:#0f1720; }
.fr2-tagx.r1 { border-color:#94a3b8; color:#cbd5e1; }
.fr2-tagx.r2 { border-color:#7dd3fc; color:#bae6fd; }
.fr2-tagx.r3 { border-color:#fbbf24; color:#fcd34d; }
.fr2-mail { background:#121822; border:1px solid #2e3b4e; border-radius:5px; padding:7px 9px; margin-bottom:5px; }
.fr2-mail.unread { border-color:#34d399; }
.fr2-mail .sj { font-size:.8rem; font-weight:bold; color:#e2e8f0; }
.fr2-mail .bd { font-size:.73rem; color:#94a3b8; line-height:1.5; margin:3px 0; }
`;
    var st = document.createElement('style');
    st.id = 'friend-style2';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════ 分頁列 ══════════ */
  function subBar(active) {
    var html = '<div class="fr-subs fr2-sub2">';
    ALL_SUBS.forEach(function (s) {
      html += '<button class="fr-sub' + (s.id === active ? ' on' : '') + '" data-frsub="' + s.id + '">' + s.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  function injectSubs(panel, active) {
    var bar = panel.querySelector('.fr-subs');
    if (!bar) return;
    if (bar.getAttribute('data-fr2full') === '1') return;
    bar.setAttribute('data-fr2full', '1');
    V2_SUBS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'fr-sub' + (s.id === active ? ' on' : '');
      b.setAttribute('data-frsub', s.id);
      b.textContent = s.label;
      bar.appendChild(b);
    });
  }

  /* ══════════ 包裝 renderFriendPanel ══════════ */
  var _renderFriendPanel = proto.renderFriendPanel;
  proto.renderFriendPanel = function () {
    if (V2_IDS.indexOf(this.frSub) !== -1) { this.renderFriendPanelV2(); return; }
    _renderFriendPanel.call(this);
    var panel = this.el && this.el.panels && this.el.panels.friend;
    if (panel) { try { injectStyles2(); injectSubs(panel, this.frSub); } catch (e) { /* 忽略 */ } }
  };

  /* ══════════ v2 主渲染 ══════════ */
  proto.renderFriendPanelV2 = function () {
    var panel = this.el && this.el.panels && this.el.panels.friend;
    if (!panel) return;
    var TS = this.town;
    if (!TS || !TS.friendReport) { panel.innerHTML = '<div class="fr-empty">好友系統未載入。</div>'; return; }
    injectStyles2();

    var rep;
    try { rep = TS.friendReport(); }
    catch (e) { panel.innerHTML = '<div class="fr-empty">讀取失敗：' + esc(e.message) + '</div>'; return; }
    var v2 = rep.v2 || {};

    var html = '';
    try { html += this.frHeaderHtml(rep); } catch (e) { /* 忽略 */ }
    html += subBar(this.frSub);

    var sub = this.frSub;
    if (sub === 'exp') html += this.fr2ExpHtml(rep, v2.exp);
    else if (sub === 'rank') html += this.fr2RankHtml(rep, v2.rank);
    else if (sub === 'bond') html += this.fr2BondHtml(rep, v2.bond, v2.title);
    else if (sub === 'title') html += this.fr2TitleHtml(rep, v2.title, v2.bond);
    else if (sub === 'mail') html += this.fr2MailHtml(rep, v2.mail);
    else if (sub === 'quest') html += this.fr2QuestHtml(rep, v2.quest, v2.rescue, v2.visit, v2.retire);
    else if (sub === 'tourney') html += this.fr2TourneyHtml(rep, v2.tourney, v2.rank, v2.exp);
    else html += '<div class="fr-empty">未知分頁。</div>';

    panel.innerHTML = html;
    this.fr2Bind(panel);
    if (typeof this.frBind === 'function') { try { this.frBind(panel); } catch (e) { /* 忽略 */ } }
  };

  /* ══════════ 🏰 出團遠征 ══════════ */
  proto.fr2ExpHtml = function (rep, E) {
    if (!E) return '<div class="fr-empty">出團系統未載入。</div>';
    var html = '<div class="fr-block"><div class="fr-btitle">🏰 好友自行組隊出團（副本遠征）</div>' +
      '<div class="fr-rows">' +
      '<span>進行中 <b>' + E.runs.length + '</b> / ' + E.maxActive + ' 團</span>' +
      '<span>空閒好友 <b>' + E.idle + '</b> 位</span>' +
      '<span>編隊需求 <b>' + E.teamMin + '~' + E.teamMax + '</b> 人</span>' +
      '<span>累計通關 <b>' + fmt(E.clears) + '</b> 次</span>' +
      '<span>失敗 <b>' + fmt(E.fails) + '</b> 次</span>' +
      '</div>';
    html += '<div class="fr-dim2">好友會<b>自己找隊友</b>（自動挑選坦／補／輸出以取得陣容加成），' +
      '自己挑選能打的最高階副本，逐層推進並帶回經驗、紋銀與裝備。<br>' +
      '成功率取決於「隊伍平均等級 ÷ 副本需求等級」再乘上陣容默契，因此等級落差太大就會失敗。</div>';
    html += '<div class="fr-btns" style="margin-top:6px">' +
      '<button class="fr2-btn" data-fr2="expAuto" data-fr2v="1">🤖 自動出團：' + (E.auto ? '開' : '關') + '</button>' +
      '<button class="fr2-btn" data-fr2="expAutoNow">⚡ 立刻自動派團</button>' +
      '</div></div>';

    // 進行中
    if (E.runs.length) {
      html += '<div class="fr2-grid2">';
      E.runs.forEach(function (r) {
        html += '<div class="fr2-card run">';
        html += '<div class="fr-chead"><span class="fr-cname">' + r.icon + ' ' + esc(r.name) + '</span>' +
          '<span class="fr-cmeta">第 ' + r.stage + '/' + r.stages + ' 層</span></div>';
        html += '<div class="fr2-bar2 c"><div style="width:' + r.pct + '%"></div></div>';
        html += '<div class="fr-tags">' +
          '<span class="fr2-chip b">成功率 ' + r.prob + '%</span>' +
          '<span class="fr2-chip y">頭目 ' + r.bossProb + '%</span>' +
          '<span class="fr2-chip g">默契 ' + r.synergy + '%</span>' +
          '<span class="fr2-chip p">磨合 ' + r.chem + '</span>' +
          (r.includePlayer ? '<span class="fr2-chip v">你隨隊</span>' : '') +
          '</div>';
        html += '<div class="fr2-dim2">成員：' + r.members.map(function (m) {
          return m.icon + m.name + '（Lv.' + m.lv + '｜' + m.roleName + '）';
        }).join('、') + '</div>';
        html += '<div class="fr2-dim2">累計收益：經驗 ' + fmt(r.gains.exp) + '｜紋銀 ' + fmt(r.gains.gold) + '｜戰利品 ' + r.gains.drops + ' 件</div>';
        (r.log || []).forEach(function (l) {
          html += '<div class="fr2-log2 ' + (l.ok ? 'ok' : 'no') + '">' + esc(l.text) + '</div>';
        });
        html += '<div class="fr-btns"><button class="fr2-btn r" data-fr2="expCancel" data-fr2v="' + r.id + '">🛑 召回</button></div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 可派團副本
    html += '<div class="fr-block" style="margin-top:10px"><div class="fr-btitle">🗺️ 派遣遠征隊（手動派團）</div>';
    html += '<div class="fr2-grid2">';
    E.avail.forEach(function (d) {
      html += '<div class="fr2-card' + (d.unlocked ? '' : '') + '">';
      html += '<div class="fr-chead"><span class="fr-cname">' + d.icon + ' ' + esc(d.name) + '</span>' +
        '<span class="fr-cmeta">需求 Lv.' + d.reqLv + '</span></div>';
      html += '<div class="fr-tags">' +
        '<span class="fr2-chip">' + d.stages + ' 層</span>' +
        '<span class="fr2-chip y">T' + d.tier + '</span>' +
        '<span class="fr2-chip">' + esc(d.boss) + '</span>' +
        '<span class="fr2-chip' + (d.ready ? ' g' : ' r') + '">可用 ' + d.pool + ' 人</span>' +
        (d.unlocked ? '<span class="fr2-chip g">已解鎖</span>' : '<span class="fr2-chip r">未解鎖</span>') +
        '</div>';
      html += '<div class="fr2-dim2">出沒：' + (d.mobs || []).join('、') + '　獎金約 ' + fmt(d.gold) + ' 兩</div>';
      html += '<div class="fr-btns">' +
        '<button class="fr2-btn" data-fr2="expGo" data-fr2v="' + d.id + '"' + (d.unlocked && d.ready ? '' : ' disabled') + '>🚩 派團出征</button>' +
        '<button class="fr2-btn y" data-fr2="expGoSelf" data-fr2v="' + d.id + '"' + (d.unlocked && d.ready ? '' : ' disabled') + '>🧑‍🎤 我也加入</button>' +
        '</div></div>';
    });
    html += '</div></div>';

    // 合擊技
    if (E.combos && E.combos.length) {
      var st = E.combo || {};
      html += '<div class="fr-block"><div class="fr-btitle">✨ 合擊技（依羈絆解鎖）</div>';
      if (st.active) html += '<div class="fr2-note2">當前已施展：' + esc(st.active) + '</div>';
      html += '<div class="fr2-grid2">';
      E.combos.forEach(function (c) {
        html += '<div class="fr2-card' + (c.avail ? ' ok' : '') + '">';
        html += '<div class="fr-chead"><span class="fr-cname">' + c.def.icon + ' ' + esc(c.def.name) + '</span>' +
          '<span class="fr-cmeta">' + (c.avail ? '可用' : '未解鎖') + '</span></div>';
        html += '<div class="fr2-dim2">' + esc(c.def.desc) + '</div>';
        html += '<div class="fr-tags">' +
          '<span class="fr2-chip g">攻 +' + pct(c.def.atkPct) + '</span>' +
          '<span class="fr2-chip b">防 +' + pct(c.def.defPct) + '</span>' +
          '<span class="fr2-chip p">血 +' + pct(c.def.hpPct) + '</span>' +
          '<span class="fr2-chip y">' + c.def.ticks + ' 期</span>' +
          '<span class="fr2-chip">' + c.def.sp + ' 武點</span>' +
          '</div>';
        if (!c.avail) html += '<div class="fr2-note2">🔒 ' + esc(c.why) + '</div>';
        html += '<div class="fr-btns"><button class="fr2-btn" data-fr2="combo" data-fr2v="' + c.def.id + '"' + (c.avail ? '' : ' disabled') + '>✨ 施展合擊</button></div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 戰報
    if (E.history && E.history.length) {
      html += '<div class="fr-block"><div class="fr-btitle">📜 遠征戰報</div>';
      E.history.forEach(function (h) {
        html += '<div class="fr2-row2"><span>' + (h.ok ? '🏆' : '💀') + ' ' + esc(h.icon) + ' <b>' + esc(h.dzName) + '</b>' +
          '　' + h.members.join('、') + (h.includePlayer ? '（含你）' : '') + '</span>' +
          '<span>' + (h.ok ? '通關' : '失敗') + '　' + h.stage + '/' + h.stages + ' 層　紋銀 ' + fmt(h.gains.gold) + '　' + ago(h.at) + '</span></div>';
        (h.log || []).slice(-3).forEach(function (l) {
          html += '<div class="fr2-log2 ' + (l.ok ? 'ok' : 'no') + '">' + esc(l.text) + '</div>';
        });
      });
      html += '</div>';
    }
    return html;
  };

  /* ══════════ 🏆 排行榜 ══════════ */
  proto.fr2RankHtml = function (rep, R) {
    if (!R) return '<div class="fr-empty">排行榜未載入。</div>';
    var cur = this.fr2Board || 'fame';
    var html = '<div class="fr-block"><div class="fr-btitle">🏆 江湖排行榜（第 ' + R.season + ' 賽季）</div>' +
      '<div class="fr-rows">' +
      '<span>你的威望 <b>' + fmt(R.myFame) + '</b></span>' +
      '<span>你的名次 <b>第 ' + R.myRank + ' / ' + R.total + '</b></span>' +
      '<span>本季剩餘 <b>' + R.seasonLeft + '</b> 期</span>' +
      '</div>' +
      '<div class="fr2-bar2 p"><div style="width:' + Math.round(R.seasonTicks / Math.max(1, R.seasonTotal) * 100) + '%"></div></div>' +
      '<div class="fr2-dim2">賽季結束時，威望榜前 3 名會獲得稱號、獎金與書信分紅。' +
      (R.boardsMeta ? '共 ' + R.boardsMeta.length + ' 個榜單。' : '') + '</div></div>';

    html += '<div class="fr2-boardtabs">';
    R.boards.forEach(function (b) {
      html += '<button class="fr2-bt' + (b.id === cur ? ' on' : '') + '" data-fr2="board" data-fr2v="' + b.id + '">' + b.icon + ' ' + b.name + '</button>';
    });
    html += '</div>';

    var board = null;
    R.boards.forEach(function (b) { if (b.id === cur) board = b; });
    if (!board) board = R.boards[0];
    if (board) {
      html += '<div class="fr-block"><div class="fr-btitle">' + board.icon + ' ' + esc(board.name) + '</div>' +
        '<div class="fr2-dim2">' + esc(board.desc) + '</div>';
      board.rows.forEach(function (r) {
        var cls = 'fr2-rank' + (r.isPlayer ? ' me' : '') + (r.rank <= 3 ? ' top' + r.rank : '');
        var medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
        var dv = r.delta > 0 ? '<span class="fr2-up">▲' + r.delta + '</span>'
          : (r.delta < 0 ? '<span class="fr2-dn">▼' + Math.abs(r.delta) + '</span>' : '<span class="fr2-dim2">—</span>');
        html += '<div class="' + cls + '"><span class="fr2-medal">' + medal + '</span>' +
          '<span>' + (r.icon || '🧑') + ' <b>' + esc(r.name) + '</b>' + (r.retired ? ' 🏮' : '') + '</span>' +
          '<span class="fr2-dim2">Lv.' + r.lv + '</span>' +
          '<span style="margin-left:auto"><b>' + fmt(r[board.key]) + '</b>　' + dv + '</span></div>';
      });
      html += '</div>';
    }

    if (R.history && R.history.length) {
      html += '<div class="fr-block"><div class="fr-btitle">📜 賽季結算紀錄</div>';
      R.history.forEach(function (h) {
        html += '<div class="fr2-row2"><span>第 ' + h.season + ' 賽季　' +
          h.top.map(function (t) { return '第' + t.rank + ' ' + t.icon + t.name; }).join('、') + '</span>' +
          '<span>' + ago(h.at) + '</span></div>';
      });
      html += '</div>';
    }
    return html;
  };

  /* ══════════ 💞 羈絆關係 ══════════ */
  proto.fr2BondHtml = function (rep, B, TT) {
    if (!B) return '<div class="fr-empty">羈絆系統未載入。</div>';
    var pb = B.playerBonus || { atkPct: 0, defPct: 0, hpPct: 0, list: [] };
    var html = '<div class="fr-block"><div class="fr-btitle">💞 羈絆關係網</div>' +
      '<div class="fr-rows">' +
      '<span>羈絆總數 <b>' + B.list.length + '</b></span>' +
      '<span>已斷 <b>' + B.broken + '</b></span>' +
      '<span>你的羈絆加成 <b>攻 +' + pct(pb.atkPct) + '／防 +' + pct(pb.defPct) + '／血 +' + pct(pb.hpPct) + '</b></span>' +
      '</div>' +
      '<div class="fr2-dim2">羈絆分為 <b>結拜</b>（義同生死）、<b>師徒</b>（傳功授業）、<b>道侶</b>（雙修同行）三種。' +
      '好友之間也會自己結交，羈絆等級會隨時間提升，加成也跟著變強。</div></div>';

    // 可締結
    html += '<div class="fr-block"><div class="fr-btitle">🤝 與你結成羈絆（好感達標即可）</div>';
    if (!B.candidates || !B.candidates.length) {
      html += '<div class="fr2-dim2">目前沒有符合條件的對象。提升好友好感（送禮／切磋／論道／互助）即可解鎖。</div>';
    } else {
      html += '<div class="fr2-grid2">';
      B.candidates.forEach(function (c) {
        html += '<div class="fr2-card"><div class="fr-chead">' +
          '<span class="fr-cname">' + c.icon + ' ' + esc(c.name) + '</span>' +
          '<span class="fr-cmeta">好感 ' + c.favor + '</span></div>' +
          '<div class="fr2-dim2">' + esc(c.typeName) + '</div>' +
          '<div class="fr-btns"><button class="fr2-btn" data-fr2="bondMake" data-fr2v="' + c.type + '|' + c.id + '">💞 締結「' + esc(c.typeName) + '」</button></div>' +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // 現有羈絆
    html += '<div class="fr-block"><div class="fr-btitle">📜 現有羈絆</div>';
    if (!B.list.length) html += '<div class="fr2-dim2">尚無羈絆。</div>';
    B.list.forEach(function (b) {
      html += '<div class="fr2-bond" style="border-color:' + b.color + '">' +
        '<span class="pl">' + b.aIcon + '</span>' +
        '<span><b>' + esc(b.aName) + '</b> <span class="fr2-dim2">Lv.' + b.aLv + '</span></span>' +
        '<span>' + b.icon + '</span>' +
        '<span><b>' + esc(b.bName) + '</b> <span class="fr2-dim2">Lv.' + b.bLv + '</span></span>' +
        '<span class="pl">' + b.bIcon + '</span>' +
        '<span style="margin-left:auto"><span class="fr2-chip y">' + esc(b.typeName) + ' Lv.' + b.lv + '/' + b.lvMax + '</span>' +
        ' <span class="fr2-chip">' + b.days + ' 期</span>' +
        ' <button class="fr2-btn r" data-fr2="bondBreak" data-fr2v="' + b.id + '">斷絕</button></span>' +
        '</div>';
      html += '<div class="fr2-dim2" style="margin:-2px 0 6px 6px">' + esc(b.desc) + '</div>';
    });
    html += '</div>';

    if (TT && TT.list) {
      html += '<div class="fr-block"><div class="fr-btitle">🎖️ 好友稱號速覽</div>';
      TT.list.forEach(function (x) {
        if (!x.titles.length) return;
        html += '<div class="fr2-row2"><span>' + x.icon + ' <b>' + esc(x.name) + '</b> Lv.' + x.lv + '</span>' +
          '<span>' + x.titles.map(function (t) {
            return '<span class="fr2-tagx r' + (t.rank || 1) + '">' + t.icon + t.name + '</span>';
          }).join('') + '</span></div>';
      });
      html += '</div>';
    }
    return html;
  };

  /* ══════════ 🎖️ 稱號成就 ══════════ */
  proto.fr2TitleHtml = function (rep, TT, B) {
    if (!TT) return '<div class="fr-empty">稱號系統未載入。</div>';
    var html = '<div class="fr-block"><div class="fr-btitle">🎖️ 稱號成就</div>' +
      '<div class="fr-rows">' +
      '<span>已授予稱號 <b>' + TT.total + '</b> 個</span>' +
      '<span>涵蓋好友 <b>' + TT.list.filter(function (x) { return x.titles.length; }).length + '</b> 位</span>' +
      '<span>稱號總表 <b>' + TT.defs.length + '</b> 種</span>' +
      '</div>' +
      '<div class="fr2-dim2">稱號由系統依成就自動授予（擊殺、財富、通關、羈絆、經脈、救人…），' +
      '每個稱號都提供屬性加成與威望，加成有上限 ' + pct(0.6) + '。</div></div>';

    html += '<div class="fr2-grid2">';
    TT.list.forEach(function (x) {
      html += '<div class="fr2-card' + (x.titles.length ? ' ok' : '') + '">';
      html += '<div class="fr-chead"><span class="fr-cname">' + x.icon + ' ' + esc(x.name) + '</span>' +
        '<span class="fr-cmeta">Lv.' + x.lv + '　威望 ' + fmt(x.bonus.fame) + '</span></div>';
      if (!x.titles.length) html += '<div class="fr2-dim2">尚無稱號。</div>';
      else html += '<div>' + x.titles.map(function (t) {
        return '<span class="fr2-tagx r' + (t.rank || 1) + '" title="' + esc(t.desc) + '">' + t.icon + ' ' + t.name + '</span>';
      }).join('') + '</div>';
      html += '<div class="fr-tags">' +
        '<span class="fr2-chip g">攻 +' + pct(x.bonus.atkPct) + '</span>' +
        '<span class="fr2-chip b">防 +' + pct(x.bonus.defPct) + '</span>' +
        '<span class="fr2-chip p">血 +' + pct(x.bonus.hpPct) + '</span>' +
        '</div></div>';
    });
    html += '</div>';

    html += '<div class="fr-block"><div class="fr-btitle">📖 稱號總表</div>';
    TT.defs.forEach(function (t) {
      var cond = [];
      Object.keys(t.cond || {}).forEach(function (k) { cond.push(k + ' ≥ ' + t.cond[k]); });
      html += '<div class="fr2-row2"><span><span class="fr2-tagx r' + (t.rank || 1) + '">' + t.icon + ' ' + t.name + '</span>　' +
        '<span class="fr2-dim2">' + esc(t.desc) + '</span></span>' +
        '<span class="fr2-dim2">' + (cond.join('、') || '系統授予') + '</span></div>';
    });
    html += '</div>';
    void B;
    return html;
  };

  /* ══════════ ✉️ 書信 ══════════ */
  proto.fr2MailHtml = function (rep, M) {
    if (!M) return '<div class="fr-empty">書信系統未載入。</div>';
    var html = '<div class="fr-block"><div class="fr-btitle">✉️ 好友書信</div>' +
      '<div class="fr-rows">' +
      '<span>未讀／待領 <b>' + M.unread + '</b></span>' +
      '<span>信箱 <b>' + M.list.length + ' / ' + M.max + '</b></span>' +
      '<span>累計收到 <b>' + fmt(M.sent) + '</b> 封</span>' +
      '</div>' +
      '<div class="fr-btns" style="margin-top:6px">' +
      '<button class="fr2-btn" data-fr2="mailAll">📥 一鍵領取全部附件</button>' +
      '<button class="fr2-btn y" data-fr2="mailClear">🧹 清除已讀無附件信件</button>' +
      '</div>' +
      '<div class="fr2-dim2">好友會在突破、打寶、獲救、賽季結算等時機寄信並附上禮物。回信可提升好感。</div></div>';

    if (!M.list.length) return html + '<div class="fr-empty">信箱是空的。</div>';
    M.list.forEach(function (m) {
      html += '<div class="fr2-mail' + ((!m.read || m.hasAttach) ? ' unread' : '') + '">';
      html += '<div class="fr-chead"><span class="sj">' + esc(m.subject) + '</span>' +
        '<span class="fr-cmeta">' + ago(m.at) + '</span></div>';
      html += '<div class="bd">' + esc(m.body) + '</div>';
      if (m.attach && m.attach.length) {
        html += '<div>' + m.attach.map(function (a) {
          return '<span class="fr2-chip y">📦 ' + esc(a.label) + '</span>';
        }).join(' ') + '</div>';
      }
      html += '<div class="fr-btns" style="margin-top:5px">' +
        (m.hasAttach ? '<button class="fr2-btn" data-fr2="mailClaim" data-fr2v="' + m.id + '">📥 領取附件</button>' : '') +
        (m.fromId && !m.replied ? '<button class="fr2-btn y" data-fr2="mailReply" data-fr2v="' + m.id + '">✍️ 回信</button>' : '') +
        (!m.hasAttach ? '<button class="fr2-btn r" data-fr2="mailDel" data-fr2v="' + m.id + '">🗑️ 刪除</button>' : '') +
        '</div></div>';
    });
    return html;
  };

  /* ══════════ 🎯 互助任務 / 🚨 求救 / 🏡 來訪 / 🏮 名宿 ══════════ */
  proto.fr2QuestHtml = function (rep, Q, RS, V, RT) {
    var html = '';

    // 求救（最緊急，放最上面）
    html += '<div class="fr-block"><div class="fr-btitle">🚨 江湖求救（限時）</div>';
    if (!RS || !RS.active.length) {
      html += '<div class="fr2-dim2">目前沒有好友遇險。好友在江湖上行動時，有機率傳回求救訊號。' +
        (RS ? '（累計成功救援 ' + RS.done + ' 次、失敗 ' + RS.failed + ' 次）' : '') + '</div>';
    } else {
      RS.active.forEach(function (r) {
        html += '<div class="fr2-card hot" style="margin-bottom:6px">';
        html += '<div class="fr-chead"><span class="fr-cname">' + r.icon + ' 【' + esc(r.friendName) + '】' + esc(r.name) + '</span>' +
          '<span class="fr-cmeta">剩 ' + r.left + ' 期</span></div>';
        html += '<div class="fr2-bar2 hp"><div style="width:' + Math.round(r.left / Math.max(1, RS.window) * 100) + '%"></div></div>';
        html += '<div class="fr2-note2">' + esc(r.desc) + '</div>';
        html += '<div class="fr-btns">' +
          '<button class="fr2-btn y" data-fr2="rescue" data-fr2v="' + r.id + '|self">🧑‍🎤 親自馳援</button>';
        (r.rescuers || []).slice(0, 4).forEach(function (h) {
          html += '<button class="fr2-btn" data-fr2="rescue" data-fr2v="' + r.id + '|' + h.id + '">' + h.icon + ' 派' + esc(h.name) + '</button>';
        });
        html += '</div></div>';
      });
    }
    html += '</div>';

    // 互助任務
    html += '<div class="fr-block"><div class="fr-btitle">🎯 互助任務</div>' +
      '<div class="fr-rows"><span>進行中／待接 <b>' + ((Q && Q.list.length) || 0) + '</b></span>' +
      '<span>已完成 <b>' + fmt(Q ? Q.done : 0) + '</b></span></div>' +
      '<div class="fr2-dim2">好友會發布求助，你可親自前往或派一位空閒好友代辦（被派去的好友會離開崗位數期）。</div></div>';
    if (Q && Q.list.length) {
      Q.list.forEach(function (q) {
        html += '<div class="fr2-card' + (q.status === 'doing' ? ' run' : '') + '" style="margin-bottom:6px">';
        html += '<div class="fr-chead"><span class="fr-cname">' + q.icon + ' ' + esc(q.title) + '</span>' +
          '<span class="fr-cmeta">' + esc(q.type) + '　' + q.left + ' 期</span></div>';
        html += '<div class="fr2-dim2">' + esc(q.desc) + '</div>';
        html += '<div class="fr-tags">' +
          '<span class="fr2-chip y">紋銀 ' + fmt(q.reward.gold) + '</span>' +
          '<span class="fr2-chip p">好感 +' + q.reward.favor + '</span>' +
          (q.assigned ? '<span class="fr2-chip b">已派：' + esc(q.assignedName) + '</span>' : '<span class="fr2-chip g">待接</span>') +
          '</div>';
        if (q.status === 'open') {
          html += '<div class="fr-btns"><button class="fr2-btn y" data-fr2="qSelf" data-fr2v="' + q.id + '">🧑‍🎤 我親自去</button>';
          (Q.helpers || []).slice(0, 4).forEach(function (h) {
            html += '<button class="fr2-btn" data-fr2="qAssign" data-fr2v="' + q.id + '|' + h.id + '">' + h.icon + ' 派' + esc(h.name) + '</button>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
    } else {
      html += '<div class="fr2-dim2">目前沒有互助任務。</div>';
    }

    // 來訪
    html += '<div class="fr-block"><div class="fr-btitle">🏡 好友來訪小鎮</div>';
    if (!V || !V.active.length) html += '<div class="fr2-dim2">目前沒有好友作客。（累計來訪 ' + fmt(V ? V.total : 0) + ' 次）</div>';
    else V.active.forEach(function (v) {
      html += '<div class="fr2-row2"><span>' + v.icon + ' <b>' + esc(v.friendName) + '</b>　' + esc(v.name) + '　' +
        '<span class="fr2-dim2">' + esc(v.desc) + '</span></span>' +
        '<span>停留 ' + v.left + ' 期　留禮 ' + fmt(v.gift) + ' 兩</span></div>';
    });
    html += '</div>';

    // 名宿
    html += '<div class="fr-block"><div class="fr-btitle">🏮 名宿錄（功成身退）</div>' +
      '<div class="fr-rows"><span>名宿 <b>' + fmt(RT ? RT.count : 0) + '</b> 位</span>' +
      '<span>小鎮被動加成 <b>+' + pct((RT ? RT.legacyMul : 1) - 1) + '</b></span></div>' +
      '<div class="fr2-dim2">高階好友會退隱（不會消失，仍提供被動加成），並收一名弟子繼承部分功力與裝備，' +
      '讓戰力不會斷層。</div>';
    if (RT && RT.list && RT.list.length) {
      RT.list.forEach(function (r) {
        html += '<div class="fr2-row2"><span>' + r.icon + ' <b>' + esc(r.name) + '</b>　' +
          '<span class="fr2-chip y">' + esc(r.title) + '</span>　Lv.' + r.lv + '</span>' +
          '<span>戰力 ' + fmt(r.power) + '　通關 ' + r.stats.clears + ' 次</span></div>';
      });
    } else {
      html += '<div class="fr2-dim2">尚無名宿。</div>';
    }
    html += '</div>';
    return html;
  };

  /* ══════════ 🎪 比武大會 ══════════ */
  proto.fr2TourneyHtml = function (rep, X, R, E) {
    if (!X) return '<div class="fr-empty">比武大會未載入。</div>';
    var left = Math.max(0, num2(X.nextAt) - num2(X.now));
    var html = '<div class="fr-block"><div class="fr-btitle">🎪 比武大會</div>' +
      '<div class="fr-rows">' +
      '<span>下一屆 <b>' + left + '</b> 期後</span>' +
      '<span>參賽人數 <b>' + X.eligible.length + '</b></span>' +
      '<span>賽制 <b>單淘汰</b></span>' +
      '<span>自動開賽 <b>' + (X.auto ? '開' : '關') + '</b></span>' +
      '</div>' +
      '<div class="fr2-dim2">好友會自動報名。冠軍獲封「武林盟主」稱號與獎金；你可以在賽前<b>押注</b>看好的好友，' +
      '賠率依其實力排名計算。押注金額 ' + fmt(X.minBet) + ' ~ ' + fmt(X.maxBet) + ' 兩。</div>' +
      '<div class="fr-btns" style="margin-top:6px">' +
      '<button class="fr2-btn y" data-fr2="tourneyNow">⚡ 立刻開賽</button>' +
      '<button class="fr2-btn" data-fr2="tourneyAuto" data-fr2v="1">🤖 自動開賽：' + (X.auto ? '開' : '關') + '</button>' +
      '</div></div>';

    // 押注
    html += '<div class="fr-block"><div class="fr-btitle">🎲 押注（下一屆）</div>';
    if (!X.eligible.length) html += '<div class="fr2-dim2">沒有可參賽的好友。</div>';
    html += '<div class="fr2-grid2">';
    X.eligible.slice(0, 8).forEach(function (f) {
      html += '<div class="fr2-card"><div class="fr-chead">' +
        '<span class="fr-cname">' + f.icon + ' ' + esc(f.name) + '</span>' +
        '<span class="fr-cmeta">賠率 ' + f.odds + ' 倍</span></div>' +
        '<div class="fr2-dim2">Lv.' + f.lv + '　戰力 ' + fmt(f.power) + '　奪冠 ' + f.wins + ' 次</div>' +
        '<div class="fr-btns">' +
        '<button class="fr2-btn" data-fr2="bet" data-fr2v="' + f.id + '|500">押 500</button>' +
        '<button class="fr2-btn" data-fr2="bet" data-fr2v="' + f.id + '|2000">押 2,000</button>' +
        '<button class="fr2-btn" data-fr2="bet" data-fr2v="' + f.id + '|10000">押 10,000</button>' +
        '</div></div>';
    });
    html += '</div>';

    if (X.bets && X.bets.length) {
      html += '<div class="fr2-dim2" style="margin-top:6px">近期押注：';
      X.bets.forEach(function (b) {
        html += '<span class="fr2-chip ' + (b.settled ? (b.win ? 'g' : 'r') : '') + '">' +
          esc(b.targetName) + ' ' + fmt(b.amount) + '×' + b.odds +
          (b.settled ? (b.win ? ' ✅+' + fmt(b.payout) : ' ❌') : ' 待賽') + '</span> ';
      });
      html += '</div>';
    }
    html += '</div>';

    // 上屆結果
    if (X.last) {
      html += '<div class="fr-block"><div class="fr-btitle">👑 上屆結果 —— 盟主：' + X.last.champIcon + ' ' + esc(X.last.champName) + '</div>';
      X.last.rounds.forEach(function (rd) {
        html += '<div class="fr2-dim2">第 ' + rd.round + ' 輪</div>';
        rd.matches.forEach(function (m) {
          html += '<div class="fr2-row2"><span>' + esc(m.a) + ' <span class="fr2-dim2">vs</span> ' + esc(m.b) + '</span>' +
            '<span>勝：<b>' + esc(m.win) + '</b>' + (m.scoreA !== undefined ? '　<span class="fr2-dim2">' + fmt(m.scoreA) + ' : ' + fmt(m.scoreB) + '</span>' : '') + '</span></div>';
        });
      });
      if (X.last.payout) html += '<div class="fr2-note2">本屆你的押注收益：' + fmt(X.last.payout) + ' 兩</div>';
      html += '</div>';
    }

    if (X.history && X.history.length > 1) {
      html += '<div class="fr-block"><div class="fr-btitle">📜 歷屆盟主</div>';
      X.history.forEach(function (h) {
        html += '<div class="fr2-row2"><span>' + h.champIcon + ' <b>' + esc(h.champName) + '</b>　Lv.' + h.champLv + '</span>' +
          '<span>' + ago(h.at) + '　收益 ' + fmt(h.payout) + ' 兩</span></div>';
      });
      html += '</div>';
    }

    // 江湖大事記（對話 + 動態）
    if (rep && rep.v2 && rep.v2.chat) {
      html += '<div class="fr-block"><div class="fr-btitle">💬 好友近況</div>';
      rep.v2.chat.forEach(function (c) {
        html += '<div class="fr2-row2"><span>' + c.icon + ' <b>' + esc(c.name) + '</b>' +
          (c.retired ? ' <span class="fr2-chip y">名宿</span>' : '') + '</span>' +
          '<span class="fr2-dim2">「' + esc(c.line) + '」</span></div>';
      });
      html += '</div>';
    }
    void R; void E;
    return html;
  };
  function num2(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }

  /* ══════════ 事件委派 ══════════ */
  var ACTIONS = {
    board: function (v) { this.fr2Board = v; this.renderFriendPanel(); },
    expAuto: function () { var E = this.town.fr2ExpState(); E.auto = !E.auto; this.renderFriendPanel(); },
    expAutoNow: function () { var E = this.town.fr2ExpState(); E.nextAuto = 0; this.town.fr2ExpAutoTick(); this.renderFriendPanel(); },
    expGo: function (v) { if (this.town.fr2ExpDispatch(v, null, false)) this.renderFriendPanel(); },
    expGoSelf: function (v) { if (this.town.fr2ExpDispatch(v, null, true)) this.renderFriendPanel(); },
    expCancel: function (v) { this.town.fr2ExpCancel(v); this.renderFriendPanel(); },
    combo: function (v) { if (this.town.fr2ComboUse(v)) this.renderFriendPanel(); },
    bondMake: function (v) {
      var p = String(v).split('|');
      if (this.town.fr2BondMake(p[0], 'player', p[1])) this.renderFriendPanel();
    },
    bondBreak: function (v) {
      var L = this.town.fr2BondList(), bd = null;
      L.forEach(function (x) { if (x.id === v) bd = x; });
      if (!bd) return;
      if (!confirm('確定斷絕【' + bd.a + '】與【' + bd.b + '】的羈絆？雙方好感會大幅下降。')) return;
      if (this.town.fr2BondBreak(v)) this.renderFriendPanel();
    },
    mailAll: function () { this.town.fr2MailClaimAll(); this.renderFriendPanel(); },
    mailClaim: function (v) { if (this.town.fr2MailClaim(v)) this.renderFriendPanel(); },
    mailReply: function (v) { if (this.town.fr2MailReply(v)) this.renderFriendPanel(); },
    mailDel: function (v) { if (this.town.fr2MailDelete(v)) this.renderFriendPanel(); },
    mailClear: function () {
      var M = this.town.fr2MailState();
      var ids = M.list.filter(function (m) { return m.read && !(m.attach && m.attach.length); }).map(function (m) { return m.id; });
      ids.forEach(function (id) { this.town.fr2MailDelete(id); }, this);
      this.renderFriendPanel();
    },
    rescue: function (v) {
      var p = String(v).split('|');
      if (this.town.fr2RescueResolve(p[0], p[1])) this.renderFriendPanel();
    },
    qSelf: function (v) { if (this.town.fr2QuestAssign(v, 'self')) this.renderFriendPanel(); },
    qAssign: function (v) {
      var p = String(v).split('|');
      if (this.town.fr2QuestAssign(p[0], p[1])) this.renderFriendPanel();
    },
    bet: function (v) {
      var p = String(v).split('|');
      if (this.town.fr2TourneyBet(p[0], parseInt(p[1], 10))) this.renderFriendPanel();
    },
    tourneyNow: function () { this.town.fr2TourneyStart(); this.renderFriendPanel(); },
    tourneyAuto: function () { var X = this.town.fr2TourneyState(); X.auto = !X.auto; this.renderFriendPanel(); }
  };

  proto.fr2Bind = function (panel) {
    if (!panel || panel._fr2Bound) return;
    panel._fr2Bound = true;
    var self = this;
    panel.addEventListener('click', function (e) {
      var el = (e.target && e.target.closest) ? e.target.closest('[data-fr2]') : null;
      if (!el) return;
      var act = el.getAttribute('data-fr2');
      var val = el.getAttribute('data-fr2v') || '';
      var fn = ACTIONS[act];
      if (!fn) return;
      e.preventDefault();
      try { fn.call(self, val, el); } catch (err) { console.error('[uiFriend2] 動作失敗：', act, err); }
    });
  };

  /* ══════════ 徽章：把信件／求救一併算進去 ══════════ */
  var _frUpdateBadge = proto._frUpdateBadge;
  proto._frUpdateBadge = function () {
    _frUpdateBadge.call(this);
    try {
      var root = this.el && this.el.root;
      if (!root || !root.querySelectorAll) return;
      var btn = null;
      root.querySelectorAll('.town-tab-btn').forEach(function (b) {
        if (b.getAttribute('data-ttab') === 'friend') btn = b;
      });
      if (!btn) return;
      var n = 0;
      var TS = this.town;
      if (TS) {
        try { n += TS.friendFollowers().length; } catch (e) { /* 忽略 */ }
        try { n += TS.fr2MailUnread(); } catch (e) { /* 忽略 */ }
        try { n += TS.fr2RescueState().active.length * 2; } catch (e) { /* 忽略 */ }
      }
      var badge = btn.querySelector ? btn.querySelector('.fr-badge') : null;
      if (n > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'fr-badge'; btn.appendChild(badge); }
        var t = String(n);
        if (badge.textContent !== t) badge.textContent = t;
        btn.setAttribute('title', '好友動態：同行 ' + (TS ? TS.friendFollowers().length : 0) +
          '／待領信件 ' + (TS ? TS.fr2MailUnread() : 0) +
          '／待救援 ' + (TS ? TS.fr2RescueState().active.length : 0));
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    } catch (e) { /* 忽略 */ }
  };

  proto.fr2Board = proto.fr2Board || 'fame';

  // 【v2 改動】增加 injectStyles2 對外暴露
  window.HY.UIFriend2 = {
    version: '2.0',
    subs: V2_SUBS.length,
    injectStyles2: injectStyles2,
    subBar: subBar
  };
  console.log('[uiFriend2] ✓ 已載入（新增 ' + V2_SUBS.length + ' 個分頁）');
})();