// js/uiTownOverlays.js (v1)
// ⭐ 小鎮：彈出視窗化 —— 把「⚔️ 冒險者公會」「🌟 名人」改成 2/3 大視窗
//
// 為什麼：原本公會／名人的內容擠在畫面下方約 500px 的分頁裡，操作空間不足。
//   本檔把它們改成「點標籤 → 彈出佔畫面 2/3 的獨立視窗」，內容原封不動搬進去。
//
// 手法（不重寫既有 UI，只搬移 DOM 節點）：
//   ① 攔截 switchTab('guild' | 'celeb') → 改為 openTownModal()
//   ② 把既有 panel 節點 appendChild 到 modal 內（節點搬移，參照與事件全部保留）
//   ③ 關閉時搬回原位置並加回 hidden
//   ④ 標籤加上發光邊框、⧉ 記號、即時徽章（數字）
//
// ⚠️ 載入順序：uiTownGuild.js → uiTownGuildAdvance.js → uiTownCeleb.js → 本檔 → main.js
window.HY = window.HY || {};

(function () {
  var proto = window.HY.UITown && window.HY.UITown.prototype;
  if (!proto) { console.error('[uiTownOverlays] 找不到 HY.UITown，請確認 uiTown.js 已載入。'); return; }

  var MODAL_ID = 'town-overlay-modal';
  var MASK_ID  = 'town-overlay-mask';

  var PANELS = {
    guild: {
      title: '⚔️ 冒險者公會', theme: 'guild',
      sub: '名冊 · 倉庫 · 派遣 · 委託 · 深造',
      hint: '提示：派遣冒險者去「守護／探險／採集」；到「🎓 深造」可習武學、覺醒靈根、洗點傳功。'
    },
    celeb: {
      title: '🌟 名人遊歷', theme: 'celeb',
      sub: '來訪 · 消費 · 結交 · 定居 · 圖鑑',
      hint: '提示：名人來訪期間每期消費銀兩；送禮把好感拉到 100，即可邀他定居換取永久加成。'
    }
  };

  /* ══════════════════════════════════════════════════════
     樣式注入
     ══════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('town-overlay-style')) return;
    var css = `
/* ══════════ 明顯化的標籤（公會 / 名人）══════════ */
.town-tab-btn[data-ttab="guild"],
.town-tab-btn[data-ttab="celeb"] {
  position: relative;
  font-weight: bold;
  font-size: 0.92rem;
  letter-spacing: .5px;
  padding: 7px 17px;
  border-width: 2px;
  transition: transform .15s, filter .15s;
}
.town-tab-btn[data-ttab="guild"]::after,
.town-tab-btn[data-ttab="celeb"]::after {
  content: '⧉';
  margin-left: 7px;
  font-size: .82em;
  opacity: .75;
}
.town-tab-btn[data-ttab="guild"]:hover,
.town-tab-btn[data-ttab="celeb"]:hover { transform: translateY(-2px); filter: brightness(1.3); }

.town-tab-btn[data-ttab="guild"] {
  border-color: #fbbf24; color: #fbbf24;
  background: linear-gradient(180deg, rgba(251,191,36,.20), rgba(251,191,36,.04));
  animation: townTabPulseGold 2.6s ease-in-out infinite;
}
.town-tab-btn[data-ttab="celeb"] {
  border-color: #a78bfa; color: #c4b5fd;
  background: linear-gradient(180deg, rgba(167,139,250,.20), rgba(167,139,250,.04));
  animation: townTabPulseViolet 2.6s ease-in-out infinite;
}
@keyframes townTabPulseGold {
  0%,100% { box-shadow: 0 0 9px rgba(251,191,36,.22); }
  50%     { box-shadow: 0 0 20px rgba(251,191,36,.55); }
}
@keyframes townTabPulseViolet {
  0%,100% { box-shadow: 0 0 9px rgba(167,139,250,.22); }
  50%     { box-shadow: 0 0 20px rgba(167,139,250,.55); }
}
.town-tab-btn[data-ttab="guild"].active,
.town-tab-btn[data-ttab="celeb"].active {
  background: rgba(251,191,36,.28); color: #fff; border-color: #fff;
}
.town-tab-btn[data-ttab="celeb"].active { background: rgba(167,139,250,.3); }

.town-tab-badge {
  display: inline-block; margin-left: 6px;
  background: #ef4444; color: #fff; border-radius: 9px;
  font-size: .66rem; padding: 0 6px; min-width: 17px; text-align: center;
  line-height: 17px; font-weight: bold; vertical-align: 1px;
}

/* ══════════ 彈出視窗 ══════════ */
.town-overlay-mask {
  position: fixed; inset: 0; z-index: 9500;
  background: rgba(2, 6, 12, .72);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.town-overlay-mask.hidden { display: none !important; }

.town-overlay-modal {
  width: 66.67vw; height: 66.67vh;
  min-width: 680px; min-height: 460px;
  max-width: 96vw; max-height: 92vh;
  display: flex; flex-direction: column;
  background: #0f141c;
  border: 2px solid #c89d54;
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0,0,0,.75), inset 0 0 0 1px rgba(200,157,84,.25);
  overflow: hidden;
  animation: townModalIn .18s ease-out;
}
@keyframes townModalIn {
  from { opacity: 0; transform: scale(.96) translateY(10px); }
  to   { opacity: 1; transform: none; }
}
.town-overlay-modal.full { width: 96vw; height: 92vh; }
.town-overlay-modal.theme-guild { border-color: #fbbf24; }
.town-overlay-modal.theme-celeb { border-color: #a78bfa; }

.town-ov-head {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  background: linear-gradient(90deg, #1b2432, #2a2136);
  border-bottom: 1px solid #2e3b4e;
}
.town-overlay-modal.theme-guild .town-ov-head { border-bottom-color: #fbbf24; }
.town-overlay-modal.theme-celeb .town-ov-head { border-bottom-color: #a78bfa; }
.town-ov-title { font-size: 1.08rem; font-weight: bold; color: #c89d54; }
.town-overlay-modal.theme-guild .town-ov-title { color: #fbbf24; }
.town-overlay-modal.theme-celeb .town-ov-title { color: #c4b5fd; }
.town-ov-sub { font-size: .74rem; color: #94a3b8; }
.town-ov-headbtns { margin-left: auto; display: flex; gap: 8px; }

.town-ov-body { flex: 1 1 auto; overflow-y: auto; padding: 12px 14px; }
.town-ov-body .town-tabpanel { padding-bottom: 0; }

.town-ov-foot {
  padding: 7px 14px; font-size: .74rem; color: #94a3b8;
  background: #131b26; border-top: 1px solid #2e3b4e;
  display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
}

@media (max-width: 900px) {
  .town-overlay-modal { width: 94vw; height: 88vh; min-width: 0; min-height: 0; }
}
`;
    var st = document.createElement('style');
    st.id = 'town-overlay-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════
     建立 modal DOM（全部用 createElement，方便保存參照）
     ══════════════════════════════════════════════════════ */
  function mkBtn(id, text, cls) {
    var b = document.createElement('button');
    b.setAttribute('id', id);
    b.className = cls || 'sys-btn';
    b.textContent = text;
    return b;
  }

  function buildModal(ui) {
    if (ui._ovEls) return;
    if (!document.body) return;

    var mask = document.createElement('div');
    mask.id = MASK_ID;
    mask.className = 'town-overlay-mask';
    mask.classList.add('hidden');

    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'town-overlay-modal';

    var head = document.createElement('div');
    head.className = 'town-ov-head';
    var title = document.createElement('span');
    title.className = 'town-ov-title';
    var sub = document.createElement('span');
    sub.className = 'town-ov-sub';
    var btns = document.createElement('span');
    btns.className = 'town-ov-headbtns';
    var bRefresh = mkBtn('town-ov-refresh', '🔄 重新整理');
    var bFull = mkBtn('town-ov-full', '⛶ 全螢幕');
    var bClose = mkBtn('town-ov-close', '✕ 關閉', 'sys-btn danger');
    btns.appendChild(bRefresh);
    btns.appendChild(bFull);
    btns.appendChild(bClose);
    head.appendChild(title);
    head.appendChild(sub);
    head.appendChild(btns);

    var body = document.createElement('div');
    body.className = 'town-ov-body';

    var foot = document.createElement('div');
    foot.className = 'town-ov-foot';
    var hint = document.createElement('span');
    hint.className = 'town-ov-hint';
    var foot2 = document.createElement('span');
    foot2.className = 'muted';
    foot2.textContent = '按 Esc 或點視窗外的暗色區域可關閉';
    foot.appendChild(hint);
    foot.appendChild(foot2);

    modal.appendChild(head);
    modal.appendChild(body);
    modal.appendChild(foot);
    mask.appendChild(modal);
    document.body.appendChild(mask);

    ui._ovEls = { mask: mask, modal: modal, body: body, title: title, sub: sub, hint: hint };

    bClose.addEventListener('click', function () { ui.closeTownModal(); });
    bFull.addEventListener('click', function () { ui.toggleTownModalFull(); });
    bRefresh.addEventListener('click', function () { ui._ovRenderPanel(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) ui.closeTownModal(); });
  }

  /* ══════════════════════════════════════════════════════
     標籤徽章
     ══════════════════════════════════════════════════════ */
  proto._ovBadge = function (name, n, tip) {
    var root = this.el && this.el.root;
    if (!root || !root.querySelector) return;
    var btn = null;
    var list = root.querySelectorAll ? root.querySelectorAll('.town-tab-btn') : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute('data-ttab') === name) { btn = list[i]; break; }
    }
    if (!btn) return;
    var b = btn.querySelector ? btn.querySelector('.town-tab-badge') : null;

    if (n > 0) {
      if (!b) {
        b = document.createElement('span');
        b.className = 'town-tab-badge';
        btn.appendChild(b);
      }
      var txt = String(n);
      if (b.textContent !== txt) b.textContent = txt;
      if (tip && btn.setAttribute) btn.setAttribute('title', tip);
    } else if (b) {
      if (b.parentNode && b.parentNode.removeChild) b.parentNode.removeChild(b);
    }
  };

  proto._ovUpdateBadges = function () {
    var TS = this.town;
    if (!TS) return;

    var g = 0;
    try { if (typeof TS.guildAdventurers === 'function') g = TS.guildAdventurers().length; } catch (e) { /* 忽略 */ }
    this._ovBadge('guild', g, '冒險者公會（成員 ' + g + ' 人）');

    var c = 0;
    try { if (typeof TS.celebEnsure === 'function') c = TS.celebEnsure().visitors.length; } catch (e) { /* 忽略 */ }
    this._ovBadge('celeb', c, '名人遊歷（來訪中 ' + c + ' 位）');
  };

  /* ══════════════════════════════════════════════════════
     開 / 關 視窗
     ══════════════════════════════════════════════════════ */
  proto.openTownModal = function (key) {
    var P = PANELS[key];
    if (!P) return false;
    if (!this._ovEls) return false;
    if (!this.el || !this.el.panels) return false;

    var panel = this.el.panels[key];
    if (!panel) {
      if (this.log) this.log('⚠️ 「' + P.title + '」模組未載入。', 'system');
      return false;
    }

    // 已開著別的面板 → 先關掉
    if (this._ovKey && this._ovKey !== key) this.closeTownModal(true);

    // 首次搬移時記錄原位置
    if (!panel._ovHome) panel._ovHome = panel.parentNode;

    var els = this._ovEls;
    els.body.appendChild(panel);       // ← appendChild 會把節點「搬移」過來
    panel.classList.remove('hidden');

    els.modal.classList.remove('theme-guild', 'theme-celeb');
    els.modal.classList.add('theme-' + P.theme);
    els.title.textContent = P.title;
    els.sub.textContent = P.sub;
    els.hint.textContent = P.hint || '';

    els.mask.classList.remove('hidden');
    this._ovKey = key;

    this._ovRenderPanel();
    this._ovHighlight(key);
    return true;
  };

  proto.closeTownModal = function (silent) {
    var key = this._ovKey;
    if (!key) return false;

    var panel = (this.el && this.el.panels) ? this.el.panels[key] : null;
    if (panel) {
      if (panel._ovHome && panel._ovHome.appendChild) panel._ovHome.appendChild(panel);
      panel.classList.add('hidden');
    }
    if (this._ovEls) {
      if (this._ovEls.body) this._ovEls.body.scrollTop = 0;
      this._ovEls.mask.classList.add('hidden');
      this._ovEls.modal.classList.remove('full');
    }
    this._ovKey = null;
    if (!silent) this._ovHighlight(this.tab || 'build');
    return true;
  };

  proto.toggleTownModalFull = function () {
    if (!this._ovEls) return;
    this._ovEls.modal.classList.toggle('full');
  };

  /** 把底部標籤列的高亮切到指定名稱 */
  proto._ovHighlight = function (name) {
    var root = this.el && this.el.root;
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.town-tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-ttab') === name);
    });
  };

  /** 重繪目前開啟的面板（保留捲動位置） */
  proto._ovRenderPanel = function () {
    var key = this._ovKey;
    if (!key || !this._ovEls) return;
    var body = this._ovEls.body;
    var st = body ? (body.scrollTop || 0) : 0;
    try {
      if (key === 'guild' && typeof this.renderGuildPanel === 'function') this.renderGuildPanel();
      else if (key === 'celeb' && typeof this.renderCelebPanel === 'function') this.renderCelebPanel();
    } catch (e) {
      console.error('[uiTownOverlays] 面板渲染失敗（' + key + '）：', e);
    }
    if (body) body.scrollTop = st;
  };

  /* ══════════════════════════════════════════════════════
     掛載：_buildDom / switchTab / render / close
     ══════════════════════════════════════════════════════ */
  var _buildDom = proto._buildDom;
  proto._buildDom = function () {
    _buildDom.call(this);
    injectStyles();
    buildModal(this);
    try { this._ovUpdateBadges(); } catch (e) { /* 忽略 */ }
  };

  var _switchTab = proto.switchTab;
  proto.switchTab = function (name) {
    // ⭐ 公會 / 名人 → 不切底部面板，改開彈出視窗
    if (PANELS[name]) { this.openTownModal(name); return; }
    // 點其他標籤 → 若視窗開著先關掉
    if (this._ovKey) this.closeTownModal(true);
    _switchTab.call(this, name);
  };

  var _render = proto.render;
  proto.render = function () {
    _render.call(this);
    this._ovUpdateBadges();
    if (this._ovKey) this._ovRenderPanel();
  };

  var _renderTownTab = proto.renderTownTab;
  proto.renderTownTab = function () {
    _renderTownTab.call(this);
    this._ovUpdateBadges();
    if (this._ovKey) this._ovRenderPanel();
  };

  // ⭐ 關閉時：若視窗開著，先關視窗（這樣 Esc / 返回江湖 會先關窗再離鎮）
  var _close = proto.close;
  proto.close = function () {
    if (this._ovKey) { this.closeTownModal(); return; }
    _close.call(this);
  };

  /* ══════════════════════════════════════════════════════
     對外匯出
     ══════════════════════════════════════════════════════ */
  window.HY.UITownOverlays = {
    version: '1.0',
    modalId: MODAL_ID,
    maskId: MASK_ID,
    panels: Object.keys(PANELS),
    ratio: '66.67% x 66.67%'
  };
})();