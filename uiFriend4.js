// js/uiFriend4.js (v1)
// ⭐ 好友系統 v4 UI：
//    ① 好友面板字體放大（calc + CSS 變數，預設 ×2，可調）
//    ② 新增 5 個分頁：🎓授業傳功／⚒️好友工坊／🛡️保鑣護衛／💌心願日常／📦好友倉庫
//
// 字體倍率：HY.UIFriend4.setFontScale(2)   ← 預設一倍（×2）
//           HY.UIFriend4.setFontScale(1.5) ← 想小一點
//           HY.UIFriend4.setFontScale(1)   ← 還原原始大小
//
// ⚠️ 載入順序：uiFriend3.js 之後、main.js 之前
window.HY = window.HY || {};

(function () {
  /* ══════════════════════════════════════════════════════
     常數 + 立刻註冊 global
     ══════════════════════════════════════════════════════ */
  var FR4_SUBS = [
    { id: 'teach', label: '🎓 授業傳功' },
    { id: 'shop',  label: '⚒️ 好友工坊' },
    { id: 'guard', label: '🛡️ 保鑣護衛' },
    { id: 'wish',  label: '💌 心願日常' },
    { id: 'ware',  label: '📦 好友倉庫' }
  ];
  var FR4_IDS = FR4_SUBS.map(function (s) { return s.id; });

  var STYLE_ID = 'friend-style4';
  var DEFAULT_SCALE = 2;

  var _scale = DEFAULT_SCALE;

  window.HY.UIFriend4 = {
    version: '1.0',
    subs: FR4_SUBS.length,
    ready: false,
    get fontScale() { return _scale; },
    setFontScale: function (n) { return setFontScale(n); },
    install: function () { return tryInit(true); },
    redraw: function () { var c = getCtl(); if (c && c._frOpen) c.renderFriendPanel(); return true; },
    /** 列出目前面板所有子分頁（含 v1/v2/v3/v4） */
    audit: function () {
      var c = getCtl();
      var panel = c && c.el && c.el.panels && c.el.panels.friend;
      if (!panel) return 'panel not ready';
      var out = [];
      panel.querySelectorAll('[data-frsub]').forEach(function (b) { out.push(b.getAttribute('data-frsub')); });
      return { delegated: !!panel._frDelegated, count: out.length, subs: out };
    }
  };

  var proto = null;
  var inited = false;
  var _ctl = null;

  /* ══════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════ */
  function fmt(n) { return Number(n || 0).toLocaleString(); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function esc(s) { return String(s == null ? '' : s); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function ago(t) {
    if (!t) return '';
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }
  function townProto() { return (window.HY.TownSystem && window.HY.TownSystem.prototype) || null; }
  function fnExists(n) { var P = townProto(); return !!(P && typeof P[n] === 'function'); }

  /* ══════════════════════════════════════════════════════
     ① 字體放大（calc + CSS 變數）
     ══════════════════════════════════════════════════════ */
  function buildFontCss() {
    // 每一條都寫成 calc(原值 * var(--frf))，!important 蓋過 v1/v2/v3
    var pairs = [
      /* ── v1 (.fr-*) ── */
      ['.fr-title', '1.08rem'], ['.fr-sub', '.74rem'], ['.fr-foot', '.74rem'],
      ['.fr-hero h3', '.95rem'], ['.fr-rows', '.79rem'],
      ['.fr-cname', '.88rem'], ['.fr-cmeta', '.72rem'], ['.fr-tag', '.67rem'],
      ['.fr-slot', '.62rem'], ['.fr-attrs', '.72rem'], ['.fr-note', '.71rem'],
      ['.fr-dim', '.71rem'], ['.fr-empty', '.79rem'], ['.fr-btitle', '.85rem'],
      ['.fr-row', '.78rem'], ['.fr-logline', '.76rem'], ['.fr-logtime', '.68rem'],
      ['.fr-mini', '.72rem'], ['.fr-switch', '.74rem'], ['.fr-badge', '.66rem'],
      ['.fr-cx .ci', '1.1rem'], ['.fr-cx .cn', '.68rem'], ['.fr-cx .cc', '.62rem'],
      /* ── v2 (.fr2-*) ── */
      ['.fr2-title', '.85rem'], ['.fr2-chip', '.7rem'], ['.fr2-btn', '.72rem'],
      ['.fr2-row2', '.77rem'], ['.fr2-dim2', '.71rem'], ['.fr2-note2', '.72rem'],
      ['.fr2-log2', '.75rem'], ['.fr2-rank', '.78rem'], ['.fr2-up', '.7rem'],
      ['.fr2-dn', '.7rem'], ['.fr2-bt', '.73rem'], ['.fr2-tbl', '.76rem'],
      ['.fr2-tagx', '.68rem'], ['.fr2-mail .sj', '.8rem'], ['.fr2-mail .bd', '.73rem'],
      /* ── v3 (.fr3-*) ── */
      ['.fr3-badge', '.66rem'], ['.fr3-name', '.88rem'], ['.fr3-meta', '.72rem'],
      ['.fr3-chip', '.68rem'], ['.fr3-dim', '.71rem'], ['.fr3-note', '.72rem'],
      ['.fr3-row', '.77rem'], ['.fr3-btn', '.72rem'], ['.fr3-log', '.75rem'],
      /* ── v3 fallback ── */
      ['.fr3-fallback .fr-title', '1.08rem'], ['.fr3-fallback .fr-sub', '.74rem'],
      ['.fr3-fallback .fr-rows', '.79rem'], ['.fr3-fallback .fr-empty', '.79rem'],
      ['.fr3-fallback .fr-dim', '.71rem'], ['.fr3-fallback .fr-note', '.71rem'],
      ['.fr3-fallback .fr-btitle', '.85rem'], ['.fr3-fallback .fr-sub', '.79rem']
    ];
    var css = ':root { --frf: ' + _scale + '; }\n';
    pairs.forEach(function (p) {
      css += p[0] + ' { font-size: calc(' + p[1] + ' * var(--frf)) !important; }\n';
    });

    /* ── 版面同步放大（否則大字會擠爆）── */
    css += `
.fr-grid { grid-template-columns: repeat(auto-fill, minmax(calc(280px * var(--frf)), 1fr)) !important; gap: calc(9px * var(--frf)) !important; }
.fr2-grid2, .fr3-grid { grid-template-columns: repeat(auto-fill, minmax(calc(300px * var(--frf)), 1fr)) !important; gap: calc(10px * var(--frf)) !important; }
.fr-codex { grid-template-columns: repeat(auto-fill, minmax(calc(120px * var(--frf)), 1fr)) !important; max-height: calc(320px * var(--frf)) !important; }
.fr-card, .fr2-card, .fr3-card { padding: calc(9px * var(--frf)) calc(10px * var(--frf)) !important; gap: calc(6px * var(--frf)) !important; }
.fr-block, .fr3-fallback .fr-block { padding: calc(9px * var(--frf)) calc(11px * var(--frf)) !important; margin-bottom: calc(8px * var(--frf)) !important; }
.fr-btitle, .fr3-fallback .fr-btitle { margin-bottom: calc(6px * var(--frf)) !important; }
.fr-hero, .fr3-fallback .fr-hero { padding: calc(9px * var(--frf)) calc(12px * var(--frf)) !important; margin-bottom: calc(10px * var(--frf)) !important; }
.fr-sub { padding: calc(5px * var(--frf)) calc(13px * var(--frf)) !important; border-radius: calc(14px * var(--frf)) !important; }
.fr-mini, .fr2-btn, .fr3-btn { padding: calc(2px * var(--frf)) calc(8px * var(--frf)) !important; border-radius: calc(3px * var(--frf)) !important; }
.fr-switch { padding: calc(3px * var(--frf)) calc(9px * var(--frf)) !important; border-radius: calc(10px * var(--frf)) !important; }
.fr-row, .fr2-row2, .fr3-row { padding: calc(5px * var(--frf)) calc(8px * var(--frf)) !important; margin-bottom: calc(4px * var(--frf)) !important; border-radius: calc(4px * var(--frf)) !important; }
.fr-tag, .fr2-chip, .fr3-chip, .fr2-tagx { padding: calc(1px * var(--frf)) calc(7px * var(--frf)) !important; border-radius: calc(9px * var(--frf)) !important; }
.fr-bar { height: calc(6px * var(--frf)) !important; margin: calc(4px * var(--frf)) 0 !important; }
.fr2-bar2, .fr3-bar { height: calc(7px * var(--frf)) !important; }
.fr-logline, .fr2-log2, .fr3-log { padding-left: calc(7px * var(--frf)) !important; margin-bottom: calc(3px * var(--frf)) !important; }
.fr-logbox, .fr3-logs { max-height: calc(320px * var(--frf)) !important; gap: calc(4px * var(--frf)) !important; }
.fr-slot { padding: calc(3px * var(--frf)) calc(2px * var(--frf)) !important; }
.fr-cx { padding: calc(6px * var(--frf)) calc(4px * var(--frf)) !important; border-radius: calc(5px * var(--frf)) !important; }
.fr-badge, .fr3-badge { border-radius: calc(9px * var(--frf)) !important; padding: 0 calc(6px * var(--frf)) !important; min-width: calc(17px * var(--frf)) !important; line-height: calc(17px * var(--frf)) !important; }
.fr2-medal, .fr3-medal { width: calc(22px * var(--frf)) !important; }
.fr-subs { gap: calc(6px * var(--frf)) !important; margin-bottom: calc(10px * var(--frf)) !important; padding-bottom: calc(8px * var(--frf)) !important; }
.fr-body { padding: calc(12px * var(--frf)) calc(14px * var(--frf)) !important; }
.fr-head { padding: calc(10px * var(--frf)) calc(14px * var(--frf)) !important; gap: calc(12px * var(--frf)) !important; }
.fr-foot { padding: calc(7px * var(--frf)) calc(14px * var(--frf)) !important; gap: calc(12px * var(--frf)) !important; }
.fr2-bond { padding: calc(7px * var(--frf)) calc(9px * var(--frf)) !important; gap: calc(8px * var(--frf)) !important; }
.fr2-mail { padding: calc(7px * var(--frf)) calc(9px * var(--frf)) !important; }
.fr3-fallback .fr-sub { padding: calc(5px * var(--frf)) calc(13px * var(--frf)) !important; }
/* 字放大後把視窗放寬，避免擠壓 */
html.fr4-big .fr-modal { width: min(94vw, 1680px) !important; height: min(90vh, 1100px) !important; min-width: 0 !important; }
html.fr4-big .fr-modal.full { width: 97vw !important; height: 95vh !important; }
@media (max-width: 1100px) { html.fr4-big .fr-modal { width: 96vw !important; } }
`;
    return css;
  }

  function injectStyles4() {
    var old = document.getElementById(STYLE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(buildFontCss()));
    document.head.appendChild(st);
    if (_scale >= 1.5) document.documentElement.classList.add('fr4-big');
    else document.documentElement.classList.remove('fr4-big');
  }

  function setFontScale(n) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) v = DEFAULT_SCALE;
    _scale = Math.max(0.5, Math.min(4, v));
    injectStyles4();
    console.log('[uiFriend4] ✓ 好友面板字體倍率設為 ×' + _scale);
    return _scale;
  }

  /* ══════════════════════════════════════════════════════
     ② 依賴 + 初始化
     ══════════════════════════════════════════════════════ */
  function depStatus() {
    return {
      UITown: !!(window.HY.UITown && window.HY.UITown.prototype),
      UIFriend3: !!(window.HY.UIFriend3 && window.HY.UIFriend3.ready),
      FriendData4: !!window.HY.FriendData4,
      fr4Tick: fnExists('fr4Tick'),
      fr4Report: fnExists('fr4Report'),
      fr4Teach: fnExists('fr4Teach'),
      fr4AssignWork: fnExists('fr4AssignWork'),
      fr4Forge: fnExists('fr4Forge'),
      fr4SetGuard: fnExists('fr4SetGuard'),
      fr4WishFulfill: fnExists('fr4WishFulfill'),
      fr4DailyDo: fnExists('fr4DailyDo'),
      fr4WareTake: fnExists('fr4WareTake'),
      ok: false
    };
  }

  function getCtl() {
    if (!proto) return null;
    if (_ctl) {
      var t0 = window.HY.game && window.HY.game.townSys;
      if (t0) _ctl.town = t0;
      return _ctl;
    }
    if (window.HY.UIFriend3 && typeof window.HY.UIFriend3.ctl === 'function') {
      var c = window.HY.UIFriend3.ctl();
      if (c) { _ctl = c; return c; }
    }
    return null;
  }

  /* ══════════════════════════════════════════════════════
     ③ 分頁列（完整 22 個）
     ══════════════════════════════════════════════════════ */
  function fr4SubBar(active) {
    var subs = [
      { id: 'roster', label: '👥 好友名單' }, { id: 'team', label: '🚩 組隊同行' },
      { id: 'feed', label: '📡 好友動態' }, { id: 'social', label: '💬 互動' },
      { id: 'codex', label: '📖 名人圖鑑' }, { id: 'stat', label: '📊 統計與設定' },
      { id: 'exp', label: '🏰 出團遠征' }, { id: 'rank', label: '🏆 排行榜' },
      { id: 'bond', label: '💞 羈絆關係' }, { id: 'title', label: '🎖️ 稱號成就' },
      { id: 'mail', label: '✉️ 書信' }, { id: 'quest', label: '🎯 互助任務' },
      { id: 'tourney', label: '🎪 比武大會' },
      { id: 'wb', label: '🌍 世界王' }, { id: 'home', label: '🏠 洞府家園' },
      { id: 'auction', label: '🏛️ 拍賣行' }, { id: 'hostile', label: '😈 仇敵' }
    ].concat(FR4_SUBS);
    var html = '<div class="fr-subs" data-fr4full="1">';
    subs.forEach(function (s) {
      html += '<button class="fr-sub' + (s.id === active ? ' on' : '') + '" data-frsub="' + s.id + '">' + s.label + '</button>';
    });
    return html + '</div>';
  }

  /** 在別人的渲染結果上補掛 v4 按鈕 */
  function postBar(ui) {
    var panel = ui.el && ui.el.panels && ui.el.panels.friend;
    if (!panel) return;
    var bar = panel.querySelector('.fr-subs');
    if (!bar) return;
    if (bar.getAttribute('data-fr4full') === '1') return;
    bar.setAttribute('data-fr4full', '1');
    FR4_SUBS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'fr-sub' + (s.id === ui.frSub ? ' on' : '');
      b.setAttribute('data-frsub', s.id);
      b.textContent = s.label;
      bar.appendChild(b);
    });
  }

  /* ══════════════════════════════════════════════════════
     ④ 掛載
     ══════════════════════════════════════════════════════ */
  function patchProto() {
    if (proto.__fr4Patched) return;
    proto.__fr4Patched = true;

    var _render = proto.renderFriendPanel;
    proto.renderFriendPanel = function () {
      if (FR4_IDS.indexOf(this.frSub) !== -1) { this.fr4Render(); return; }
      _render.call(this);
      try { postBar(this); } catch (e) { /* 忽略 */ }
    };

    /* ── 主渲染 ── */
    proto.fr4Render = function () {
      var panel = this.el && this.el.panels && this.el.panels.friend;
      if (!panel) return;
      var TS = this.town;
      if (!TS) { panel.innerHTML = '<div class="fr-empty">好友系統未載入。</div>'; return; }

      var rep = null;
      try { rep = TS.friendReport ? TS.friendReport() : null; } catch (e) { rep = null; }

      var html = '';
      try { if (rep) html += this.frHeaderHtml(rep); } catch (e) { /* 忽略 */ }
      html += fr4SubBar(this.frSub);

      var v4 = (rep && rep.v4) || {};
      var sub = this.frSub;
      try {
        if (sub === 'teach') html += this.fr4TeachHtml(v4.teach);
        else if (sub === 'shop') html += this.fr4ShopHtml(v4);
        else if (sub === 'guard') html += this.fr4GuardHtml(v4.guard);
        else if (sub === 'wish') html += this.fr4WishHtml(v4.wish, v4.daily);
        else if (sub === 'ware') html += this.fr4WareHtml(v4.ware);
        else html += '<div class="fr-empty">未知分頁。</div>';
      } catch (e) {
        html += '<div class="fr-empty">渲染失敗：' + esc(e.message) + '</div>';
        console.error('[uiFriend4] 渲染失敗：', e);
      }

      panel.innerHTML = html;
      try { if (this.frBind) this.frBind(panel); } catch (e) { /* 忽略 */ }
      try { if (this.fr3Bind) this.fr3Bind(panel); } catch (e) { /* 忽略 */ }
      this.fr4Bind(panel);
    };

    /* ── 🎓 授業傳功 ── */
    proto.fr4TeachHtml = function (T) {
      if (!T) return '<div class="fr-empty">授業系統未載入。</div>';
      var html = '<div class="fr-block"><div class="fr-btitle">🎓 授業傳功 —— 好友把絕學傳給你</div>' +
        '<div class="fr-rows">' +
        '<span>你已學招式 <b>' + T.mySkills + '</b> 式</span>' +
        '<span>每次消耗好感 <b>' + T.favorCost + '</b></span>' +
        '<span>額外武點 <b>+' + T.spGain + '</b></span>' +
        '<span>可學新招 <b>' + (T.grantNew ? '是' : '否') + '</b></span>' +
        '</div>' +
        '<div class="fr3-dim">向好友請益，他能把自己會的招式傳給你：你沒有的直接學會（Lv.1），已學會的升 1 級。' +
        '招式等級越高、好友等級越高，學費越貴。</div></div>';

      if (!T.list.length) return html + '<div class="fr-empty">目前沒有好友可以授業。</div>';

      html += '<div class="fr3-grid">';
      T.list.forEach(function (x) {
        if (!x.teachable.length && !x.teachCount) return;
        html += '<div class="fr3-card">';
        html += '<div class="fr3-head"><span class="fr3-name">' + x.icon + ' ' + esc(x.name) + '</span>' +
          '<span class="fr3-meta">Lv.' + x.lv + '</span></div>';
        html += '<div class="fr3-chips">' +
          '<span class="fr3-chip v">' + (x.socIcon || '') + esc(x.socName || '') + '</span>' +
          (x.tier ? '<span class="fr3-chip y">' + (x.tier.icon || '★') + ' ' + esc(x.tier.name || '') + '</span>' : '') +
          '<span class="fr3-chip">' + esc(x.sect) + '</span>' +
          '<span class="fr3-chip p">好感 ' + x.favor + '</span>' +
          '<span class="fr3-chip b">可授 ' + x.teachCount + ' 式</span>' +
          '</div>';
        if (!x.teachable.length) {
          html += '<div class="fr3-dim">他的招式你都已練至極限。</div>';
        } else {
          html += '<div class="fr3-dim">可傳授：</div>';
          x.teachable.forEach(function (a) {
            html += '<div class="fr3-row"><span>' + a.icon + ' <b>' + esc(a.name) + '</b>' +
              (a.isNew ? ' <span class="fr3-chip g">新招</span>' : ' <span class="fr3-chip">Lv.' + a.have + '→' + a.next + '</span>') +
              '　<span class="fr3-dim">好友 Lv.' + a.friendLv + '／上限 ' + a.maxLv + '</span></span>' +
              '<button class="fr3-btn" data-fr4="teach" data-fr4v="' + x.id + '|' + a.id + '">🎓 請益</button></div>';
          });
        }
        html += '</div>';
      });
      html += '</div>';
      return html;
    };

    /* ── ⚒️ 好友工坊（打工 + 鍛造 + 煉丹）── */
    proto.fr4ShopHtml = function (V) {
      var W = V.work, FG = V.forge, AL = V.alchemy;
      var html = '';

      /* 打工 */
      html += '<div class="fr-block"><div class="fr-btitle">⛏️ 派遣打工（產出材料入好友倉庫）</div>' +
        '<div class="fr-rows">' +
        '<span>外出中 <b>' + ((W && W.works.length) || 0) + '/' + ((W && W.maxAssign) || 4) + '</b></span>' +
        '<span>空閒好友 <b>' + ((W && W.idle.length) || 0) + '</b></span>' +
        '</div>' +
        '<div class="fr3-dim">好友外出採集，回來把材料存入共同倉庫；「跑商」不產材料但銀兩最多。</div></div>';

      if (W && W.works.length) {
        html += '<div class="fr3-grid">';
        W.works.forEach(function (r) {
          html += '<div class="fr3-card">' +
            '<div class="fr3-head"><span class="fr3-name">' + r.jobIcon + ' ' + r.icon + ' ' + esc(r.name) + '</span>' +
            '<span class="fr3-meta">剩 ' + r.left + '/' + r.total + ' 期</span></div>' +
            '<div class="fr3-bar y"><div style="width:' + r.pct + '%"></div></div>' +
            '<div class="fr3-chips"><span class="fr3-chip y">' + esc(r.jobName) + '</span></div>' +
            '<div class="fr-btns"><button class="fr3-btn r" data-fr4="workCancel" data-fr4v="' + r.id + '">🛑 召回</button></div></div>';
        });
        html += '</div>';
      }

      if (W) {
        html += '<div class="fr-block"><div class="fr-btitle">🧭 選擇工作派遣</div>';
        html += '<div class="fr3-grid">';
        W.jobs.forEach(function (j) {
          html += '<div class="fr3-card"><div class="fr3-head">' +
            '<span class="fr3-name">' + j.icon + ' ' + esc(j.name) + '</span>' +
            '<span class="fr3-meta">' + (j.dur ? j.dur[0] + '~' + j.dur[1] + ' 期' : '') + '</span></div>' +
            '<div class="fr3-dim">' + esc(j.desc) + '</div>' +
            '<div class="fr3-chips">' +
            (j.mats.length ? '<span class="fr3-chip n">' + j.mats.join('、') + '</span>' : '<span class="fr3-chip">無材料</span>') +
            '<span class="fr3-chip y">紋銀 ' + fmt(j.gold[0]) + '~' + fmt(j.gold[1]) + '</span>' +
            '</div>';
          if (!W.idle.length) html += '<div class="fr3-dim">沒有空閒好友。</div>';
          else {
            html += '<div class="fr3-chips">';
            W.idle.slice(0, 6).forEach(function (f) {
              html += '<button class="fr3-btn" data-fr4="workGo" data-fr4v="' + f.id + '|' + j.id + '">' + f.icon + esc(f.name) + '</button>';
            });
            html += '</div>';
          }
          html += '</div>';
        });
        html += '</div></div>';
      }

      /* 鍛造 */
      html += '<div class="fr-block"><div class="fr-btitle">🔨 鍛造強化（把行囊裝備送好友強化）</div>' +
        '<div class="fr-rows">' +
        '<span>強化上限 <b>+' + ((FG && FG.maxLv) || 10) + '</b></span>' +
        '<span>成功 <b>' + ((FG && FG.stats.forged) || 0) + '</b> 次</span>' +
        '<span>失敗 <b>' + ((FG && FG.stats.fail) || 0) + '</b> 次</span>' +
        '<span>累計花費 <b>' + fmt((FG && FG.stats.gold) || 0) + '</b> 兩</span>' +
        '</div>' +
        '<div class="fr3-dim">需 ★★ 以上的好友才能承接。強化等級越高越貴、成功率越低；失敗退還一半費用、裝備不降級。</div></div>';

      if (FG) {
        if (!FG.bag.length) {
          html += '<div class="fr3-dim" style="padding:0 4px 8px">行囊中沒有可強化的裝備（或都已達上限）。</div>';
        } else {
          html += '<div class="fr3-grid">';
          FG.bag.slice(0, 8).forEach(function (b) {
            html += '<div class="fr3-card"><div class="fr3-head">' +
              '<span class="fr3-name">' + esc(b.name) + '</span>' +
              '<span class="fr3-meta">+' + b.forgeLv + ' → +' + (b.forgeLv + 1) + '</span></div>' +
              '<div class="fr3-chips">' +
              '<span class="fr3-chip">Lv.' + b.reqLv + '</span>' +
              '<span class="fr3-chip r">戰力 ' + fmt(b.power) + '</span>' +
              '</div>';
            if (!FG.smiths.length) html += '<div class="fr3-dim">沒有符合資格的好友（需 ★★ 以上）。</div>';
            else {
              html += '<div class="fr3-chips">';
              FG.smiths.slice(0, 4).forEach(function (s) {
                var rate = Math.max(0.15, Math.min(0.97, s.baseRate - b.forgeLv * 0.04));
                var cost = Math.round(FG.costBase + b.forgeLv * FG.costPerLv);
                html += '<button class="fr3-btn" data-fr4="forge" data-fr4v="' + b.idx + '|' + s.id + '">' +
                  s.icon + esc(s.name) + ' ' + Math.round(rate * 100) + '%／' + fmt(cost) + ' 兩</button>';
              });
              html += '</div>';
            }
            html += '</div>';
          });
          html += '</div>';
        }
      }

      /* 煉丹 */
      html += '<div class="fr-block" style="margin-top:10px"><div class="fr-btitle">💊 煉丹房（好友自動煉丹，成品直送行囊）</div>' +
        '<div class="fr-rows">' +
        '<span>煉丹中 <b>' + ((AL && AL.runs.length) || 0) + '/' + ((AL && AL.maxAssign) || 2) + '</b></span>' +
        '<span>成功率 <b>' + pct((AL && AL.rate) || 0.85) + '</b></span>' +
        '<span>累計出丹 <b>' + ((AL && AL.pills) || 0) + '</b> 顆</span>' +
        '</div></div>';

      if (AL && AL.runs.length) {
        html += '<div class="fr3-grid">';
        AL.runs.forEach(function (r) {
          html += '<div class="fr3-card">' +
            '<div class="fr3-head"><span class="fr3-name">💊 ' + r.icon + ' ' + esc(r.name) + '</span>' +
            '<span class="fr3-meta">剩 ' + r.left + '/' + r.total + ' 期</span></div>' +
            '<div class="fr3-bar v"><div style="width:' + r.pct + '%"></div></div>' +
            '<div class="fr-btns"><button class="fr3-btn r" data-fr4="alchemyCancel" data-fr4v="' + r.id + '">🛑 停爐</button></div></div>';
        });
        html += '</div>';
      }
      if (AL && AL.idle.length) {
        html += '<div class="fr3-chips" style="padding:0 4px 8px">派誰煉丹：';
        AL.idle.slice(0, 8).forEach(function (f) {
          html += '<button class="fr3-btn v" data-fr4="alchemyGo" data-fr4v="' + f.id + '">' + f.icon + esc(f.name) + '</button>';
        });
        html += '</div>';
      }
      return html;
    };

    /* ── 🛡️ 保鑣護衛 ── */
    proto.fr4GuardHtml = function (G) {
      if (!G) return '<div class="fr-empty">保鑣系統未載入。</div>';
      var html = '<div class="fr-block"><div class="fr-btitle">🛡️ 保鑣護衛</div>' +
        '<div class="fr-rows">' +
        '<span>玩家加成 <b>攻 +' + pct(G.bonus.atkPct) + '／防 +' + pct(G.bonus.defPct) + '／血 +' + pct(G.bonus.hpPct) + '</b></span>' +
        '<span>打劫減免 <b>' + pct(G.raidReduce) + '</b></span>' +
        '<span>不佔同行名額 <b>' + (G.freeSlot ? '是' : '否') + '</b></span>' +
        '<span>累計追回 <b>' + fmt(G.stats.blocked) + '</b> 兩</span>' +
        '<span>加速療傷 <b>' + fmt(G.stats.healed) + '</b> 期</span>' +
        '</div>' +
        '<div class="fr3-dim">指定一位好友為保鑣：他會常駐隨行（不佔同行名額），提升你的攻防血；' +
        '仇敵打劫時出手攔截、追回部分損失；並持續為負傷好友加速療傷。</div></div>';

      if (G.guard) {
        html += '<div class="fr3-card ok" style="margin-bottom:8px">' +
          '<div class="fr3-head"><span class="fr3-name">🛡️ ' + G.guard.icon + ' ' + esc(G.guard.name) + '（現任保鑣）</span>' +
          '<span class="fr3-meta">Lv.' + G.guard.lv + '</span></div>' +
          '<div class="fr3-chips">' +
          '<span class="fr3-chip r">戰力 ' + fmt(G.guard.power) + '</span>' +
          '<span class="fr3-chip v">' + (G.guard.socIcon || '') + esc(G.guard.socName || '') + '</span>' +
          (G.guard.tier ? '<span class="fr3-chip y">' + (G.guard.tier.icon || '★') + '</span>' : '') +
          '<span class="fr3-chip p">好感 ' + G.guard.favor + '</span>' +
          (G.guard.injured ? '<span class="fr3-chip r">負傷中</span>' : '<span class="fr3-chip g">隨行中</span>') +
          '</div>' +
          '<div class="fr-btns"><button class="fr3-btn r" data-fr4="guard" data-fr4v="">🛑 解除保鑣</button></div></div>';
      } else {
        html += '<div class="fr-empty">目前沒有指定保鑣。挑一位戰力最高的好友出任吧。</div>';
      }

      html += '<div class="fr3-grid">';
      G.candidates.slice(0, 20).forEach(function (f) {
        html += '<div class="fr3-card' + (f.isGuard ? ' ok' : '') + '">' +
          '<div class="fr3-head"><span class="fr3-name">' + f.icon + ' ' + esc(f.name) + '</span>' +
          '<span class="fr3-meta">Lv.' + f.lv + '</span></div>' +
          '<div class="fr3-chips">' +
          '<span class="fr3-chip r">戰力 ' + fmt(f.power) + '</span>' +
          '<span class="fr3-chip v">' + (f.socIcon || '') + esc(f.socName || '') + '</span>' +
          (f.tier ? '<span class="fr3-chip y">' + (f.tier.icon || '★') + '</span>' : '') +
          (f.injured ? '<span class="fr3-chip r">負傷</span>' : '') +
          '</div>' +
          '<div class="fr-btns">' +
          (f.isGuard
            ? '<button class="fr3-btn r" data-fr4="guard" data-fr4v="">🛑 解除</button>'
            : '<button class="fr3-btn" data-fr4="guard" data-fr4v="' + f.id + '"' + (f.injured ? ' disabled' : '') + '>🛡️ 任命保鑣</button>') +
          '</div></div>';
      });
      html += '</div>';
      return html;
    };

    /* ── 💌 心願日常 ── */
    proto.fr4WishHtml = function (WS, D) {
      var html = '';

      /* 心願 */
      html += '<div class="fr-block"><div class="fr-btitle">💌 好友心願</div>' +
        '<div class="fr-rows">' +
        '<span>待辦心願 <b>' + ((WS && WS.wishes.length) || 0) + '/' + ((WS && WS.max) || 4) + '</b></span>' +
        '<span>已完成 <b>' + ((WS && WS.stats.done) || 0) + '</b> 件</span>' +
        '<span>回禮累計 <b>' + fmt((WS && WS.stats.gold) || 0) + '</b> 兩</span>' +
        '</div>' +
        '<div class="fr3-dim">好友會不時提出心願。了卻他的心願可獲得大量好感與回禮；置之不理會讓他失望（好感下降）。</div></div>';

      if (WS && WS.wishes.length) {
        html += '<div class="fr3-grid">';
        WS.wishes.forEach(function (w) {
          html += '<div class="fr3-card' + (w.left <= 6 ? ' raid' : '') + '">' +
            '<div class="fr3-head"><span class="fr3-name">' + w.icon + ' ' + esc(w.name) + '</span>' +
            '<span class="fr3-meta">剩 ' + w.left + ' 期</span></div>' +
            '<div class="fr3-chips"><span class="fr3-chip y">' + w.typeIcon + ' ' + esc(w.title) + '</span>' +
            '<span class="fr3-chip p">好感 +' + w.favor + '</span></div>' +
            '<div class="fr3-dim">' + esc(w.desc) + '</div>';

          if (w.need === 'gold') {
            html += '<div class="fr3-chips"><span class="fr3-chip y">需 ' + fmt(w.amount) + ' 兩</span>' +
              '<button class="fr3-btn" data-fr4="wishGold" data-fr4v="' + w.id + '">💰 借他</button></div>';
          } else if (w.need === 'equip') {
            if (!w.equips || !w.equips.length) html += '<div class="fr3-dim">你行囊裡沒有可贈的裝備。</div>';
            else {
              html += '<div class="fr3-chips">';
              w.equips.slice(0, 4).forEach(function (e) {
                html += '<button class="fr3-btn" data-fr4="wishEquip" data-fr4v="' + w.id + '|' + e.idx + '">贈 ' + esc(e.name) + '</button>';
              });
              html += '</div>';
            }
          } else if (w.need === 'mat') {
            html += '<div class="fr3-chips"><span class="fr3-chip n">需 ' + w.amount + ' 份材料</span>';
            (w.mats || []).forEach(function (m) {
              if (m.count < w.amount) return;
              html += '<button class="fr3-btn" data-fr4="wishMat" data-fr4v="' + w.id + '|' + m.id + '">給 ' + m.icon + m.name + '</button>';
            });
            html += '</div>';
          } else {
            html += '<div class="fr3-chips">' +
              '<button class="fr3-btn" data-fr4="wishDo" data-fr4v="' + w.id + '">' +
              (w.need === 'spar' ? '⚔️ 與他切磋' : '🍵 陪他論道') + '</button>' +
              '<button class="fr3-btn r" data-fr4="wishDrop" data-fr4v="' + w.id + '">🙈 不予理會</button></div>';
          }
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="fr3-dim" style="padding:0 4px 10px">目前沒有心願。</div>';
      }

      /* 日常互動 */
      html += '<div class="fr-block" style="margin-top:10px"><div class="fr-btitle">🍵 日常互動</div>' +
        '<div class="fr-rows">' +
        '<span>冷卻 <b>' + ((D && D.cd) || 8) + '</b> 期</span>' +
        '<span>累計互動 <b>' + ((D && D.stats.dailies) || 0) + '</b> 次</span>' +
        '</div>';
      if (D && D.buffs && D.buffs.length) {
        html += '<div class="fr3-chips">';
        D.buffs.forEach(function (b) {
          html += '<span class="fr3-chip g">✨ ' + esc(b.name) + ' +' + pct(b.mul) + '（剩 ' + b.left + ' 期）</span>';
        });
        html += '</div>';
      }
      html += '<div class="fr3-dim">與好友品茶、對飲、賞花、下棋、聽曲、論劍：提升好感並獲得短期增益。同一位好友有冷卻。</div></div>';

      if (D && D.acts && D.acts.length) {
        html += '<div class="fr3-grid">';
        D.acts.forEach(function (a) {
          html += '<div class="fr3-card"><div class="fr3-head">' +
            '<span class="fr3-name">' + a.icon + ' ' + esc(a.name) + '</span>' +
            '<span class="fr3-meta">好感 +' + a.favor + '</span></div>' +
            '<div class="fr3-dim">' + esc(a.desc) + '</div>' +
            '<div class="fr3-chips"><span class="fr3-chip g">' + esc(a.buffName) + ' +' + pct(a.mul) + '</span></div>';
          if (!D.friends.length) html += '<div class="fr3-dim">沒有可互動的好友。</div>';
          else {
            html += '<div class="fr3-chips">';
            D.friends.slice(0, 6).forEach(function (f) {
              var dis = f.cd > 0;
              html += '<button class="fr3-btn" data-fr4="daily" data-fr4v="' + f.id + '|' + a.id + '"' +
                (dis ? ' disabled title="還需 ' + f.cd + ' 期"' : '') + '>' + f.icon + esc(f.name) + (dis ? '（' + f.cd + '）' : '') + '</button>';
            });
            html += '</div>';
          }
          html += '</div>';
        });
        html += '</div>';
      }
      return html;
    };

    /* ── 📦 好友倉庫 ── */
    proto.fr4WareHtml = function (W) {
      if (!W) return '<div class="fr-empty">倉庫系統未載入。</div>';
      var html = '<div class="fr-block"><div class="fr-btitle">📦 好友共同倉庫</div>' +
        '<div class="fr-rows">' +
        '<span>材料種類 <b>' + W.mats.filter(function (m) { return m.count > 0; }).length + '</b></span>' +
        '<span>裝備 <b>' + W.items.length + '/' + W.cap + '</b></span>' +
        '<span>累計存入 <b>' + W.stats.deposits + '</b> 件</span>' +
        '<span>材料累計 <b>' + fmt(W.stats.matsGained) + '</b> 份</span>' +
        '</div>' +
        '<div class="fr3-dim">好友在外行走、打工時會把材料與裝備存入共同倉庫。材料可轉贈好友洞府裝修，裝備可取出或變賣。</div></div>';

      /* 材料 */
      html += '<div class="fr-block"><div class="fr-btitle">🧱 材料庫存</div><div class="fr3-chips">';
      W.mats.forEach(function (m) {
        html += '<span class="fr3-chip ' + (m.count > 0 ? 'n' : '') + '">' + m.icon + ' ' + m.name + ' × ' + fmt(m.count) +
          '　<span style="opacity:.7">(洞府 +' + m.value + ')</span></span>';
      });
      html += '</div>';
      if (W.donateTargets && W.donateTargets.length) {
        var matsWith = W.mats.filter(function (m) { return m.count > 0; });
        if (matsWith.length) {
          html += '<div class="fr3-dim" style="margin-top:4px">轉贈好友洞府（增加裝修進度）：</div>';
          matsWith.slice(0, 4).forEach(function (m) {
            html += '<div class="fr3-row"><span>' + m.icon + ' ' + m.name + ' × ' + fmt(m.count) + '</span>' +
              '<span class="fr3-chips">';
            W.donateTargets.slice(0, 4).forEach(function (t) {
              html += '<button class="fr3-btn" data-fr4="donate" data-fr4v="' + t.id + '|' + m.id + '|5">送 ' + t.icon + esc(t.name) + '</button>';
            });
            html += '</span></div>';
          });
        }
      }
      html += '</div>';

      /* 裝備 */
      html += '<div class="fr-block"><div class="fr-btitle">⚔️ 裝備倉庫</div>' +
        '<div class="fr-btns" style="margin-bottom:6px">' +
        '<button class="fr3-btn" data-fr4="wareTakeAll">📥 一鍵全部取出</button></div>';
      if (!W.items.length) html += '<div class="fr3-dim">倉庫裡沒有裝備。</div>';
      W.items.forEach(function (it) {
        html += '<div class="fr3-row"><span>' + esc(it.name) +
          (it.forgeLv ? ' <span class="fr3-chip y">+' + it.forgeLv + '</span>' : '') +
          '　<span class="fr3-dim">Lv.' + it.reqLv + '　戰力 ' + fmt(it.power) + '</span></span>' +
          '<span class="fr3-chips">' +
          '<button class="fr3-btn" data-fr4="wareTake" data-fr4v="' + it.idx + '">📥 取出</button>' +
          '<button class="fr3-btn y" data-fr4="wareSell" data-fr4v="' + it.idx + '">💰 變賣 ' + fmt(it.sell) + '</button>' +
          '</span></div>';
      });
      html += '</div>';

      /* 紀錄 */
      if (W.log && W.log.length) {
        html += '<div class="fr-block"><div class="fr-btitle">📜 擴充功能紀錄</div><div class="fr3-logs">';
        W.log.forEach(function (l) {
          var cls = l.type === 'gain' ? 'ok' : (l.type === 'wealth' ? 'w' : (l.type === 'loot' ? 'ok' : 'no'));
          html += '<div class="fr3-log ' + cls + '"><span style="color:#64748b;font-size:.68rem;margin-right:5px">' +
            ago(l.t) + '</span>' + esc(l.msg) + '</div>';
        });
        html += '</div></div>';
      }
      return html;
    };

    /* ── 事件委派 ── */
    var ACT = {
      teach: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4Teach(p[0], p[1])) this.renderFriendPanel();
      },
      workGo: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4AssignWork(p[0], p[1])) this.renderFriendPanel();
      },
      workCancel: function (v) { if (this.town.fr4WorkCancel(v)) this.renderFriendPanel(); },
      forge: function (v) {
        var p = String(v).split('|');
        this.town.fr4Forge(parseInt(p[0], 10), p[1]);
        this.renderFriendPanel();
      },
      alchemyGo: function (v) { if (this.town.fr4AssignAlchemy(v)) this.renderFriendPanel(); },
      alchemyCancel: function (v) { if (this.town.fr4AlchemyCancel(v)) this.renderFriendPanel(); },
      guard: function (v) { if (this.town.fr4SetGuard(v || null)) this.renderFriendPanel(); },
      wishGold: function (v) { if (this.town.fr4WishFulfill(v, {})) this.renderFriendPanel(); },
      wishEquip: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4WishFulfill(p[0], { idx: parseInt(p[1], 10) })) this.renderFriendPanel();
      },
      wishMat: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4WishFulfill(p[0], { matId: p[1] })) this.renderFriendPanel();
      },
      wishDo: function (v) { if (this.town.fr4WishFulfill(v, {})) this.renderFriendPanel(); },
      wishDrop: function (v) {
        if (!confirm('確定不予理會？對方好感會下降。')) return;
        if (this.town.fr4WishDrop(v)) this.renderFriendPanel();
      },
      daily: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4DailyDo(p[0], p[1])) this.renderFriendPanel();
      },
      wareTake: function (v) { if (this.town.fr4WareTake(parseInt(v, 10))) this.renderFriendPanel(); },
      wareTakeAll: function () { this.town.fr4WareTakeAll(); this.renderFriendPanel(); },
      wareSell: function (v) { if (this.town.fr4WareSell(parseInt(v, 10))) this.renderFriendPanel(); },
      donate: function (v) {
        var p = String(v).split('|');
        if (this.town.fr4DonateHome(p[0], p[1], parseInt(p[2], 10) || 1)) this.renderFriendPanel();
      }
    };

    proto.fr4Bind = function (panel) {
      if (!panel || panel._fr4Bound) return;
      panel._fr4Bound = true;
      var self = this;
      panel.addEventListener('click', function (e) {
        var el = (e.target && e.target.closest) ? e.target.closest('[data-fr4]') : null;
        if (!el) return;
        var fn = ACT[el.getAttribute('data-fr4')];
        if (!fn) return;
        e.preventDefault();
        try { fn.call(self, el.getAttribute('data-fr4v') || '', el); }
        catch (err) { console.error('[uiFriend4] 動作失敗：', err); }
      });
    };
  }

  /* ══════════════════════════════════════════════════════
     ⑤ 初始化
     ══════════════════════════════════════════════════════ */
  function tryInit(force) {
    if (inited) {
      if (force) { injectStyles4(); }
      return true;
    }
    var P = window.HY.UITown && window.HY.UITown.prototype;
    if (!P) { if (force) console.warn('[uiFriend4] 找不到 HY.UITown'); return false; }
    if (!window.HY.FriendData4) { if (force) console.warn('[uiFriend4] friendData4.js 未載入'); return false; }
    if (!fnExists('fr4Report')) { if (force) console.warn('[uiFriend4] friendExtraSystem.js 未載入'); return false; }

    proto = P;
    inited = true;
    window.HY.UIFriend4.ready = true;

    injectStyles4();
    try { patchProto(); } catch (e) { console.error('[uiFriend4] 掛載失敗：', e); }

    console.log('[uiFriend4] ✓ 已就緒（字體 ×' + _scale + ' ＋ 授業／工坊／保鑣／心願／倉庫）');
    return true;
  }

  // 依賴重試
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (tryInit(false) || tries >= 80) clearInterval(timer);
  }, 250);
  tryInit(false);

  var watch = setInterval(function () {
    if (window.HY.game && window.HY.game.townSys) {
      clearInterval(watch);
      tryInit(false);
      setTimeout(function () { tryInit(false); }, 900);
    }
  }, 500);
  setTimeout(function () { clearInterval(watch); }, 30000);
})();