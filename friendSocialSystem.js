// js/friendSocialSystem.js (v1)
// ⭐ 好友系統 v2：社交層（羈絆關係網／稱號成就／書信）
// ⚠️ 載入順序：friendEventSystem.js 之後、friendRankSystem.js 之前
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendSocialSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendSocialSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C2 = F.CONFIG2 || {};
  var BT = F.BOND_TYPES || [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || 'bd') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ══════════════════════════════════════════════════════
     羈絆
     ══════════════════════════════════════════════════════ */
  proto.fr2BondDefault = function () { return { list: [], broken: 0 }; };
  proto.fr2BondState = function () {
    var S = this.friendState();
    if (!S.bonds || typeof S.bonds !== 'object') S.bonds = this.fr2BondDefault();
    var B = S.bonds, d = this.fr2BondDefault(), k;
    for (k in d) { if (B[k] === undefined) B[k] = d[k]; }
    if (!Array.isArray(B.list)) B.list = [];
    return B;
  };

  proto.fr2BondType = function (id) {
    for (var i = 0; i < BT.length; i++) if (BT[i].id === id) return BT[i];
    return null;
  };

  proto.fr2BondList = function () { return this.fr2BondState().list; };

  proto.fr2BondBetween = function (a, b) {
    var L = this.fr2BondList();
    for (var i = 0; i < L.length; i++) {
      var x = L[i];
      if ((x.a === a && x.b === b) || (x.a === b && x.b === a)) return x;
    }
    return null;
  };

  proto.fr2BondCountOf = function (fid) {
    var L = this.fr2BondList(), n = 0;
    for (var i = 0; i < L.length; i++) if (L[i].a === fid || L[i].b === fid) n += 1;
    return n;
  };

  proto.fr2BondCountIn = function (ids) {
    if (!ids || !ids.length) return 0;
    var L = this.fr2BondList(), n = 0;
    for (var i = 0; i < L.length; i++) {
      if (ids.indexOf(L[i].a) !== -1 && ids.indexOf(L[i].b) !== -1) n += 1;
    }
    return n;
  };

  proto.fr2FavorOf = function (id) {
    if (id === 'player') return 100;
    var f = this.friendById(id);
    return f ? num(f.favor, 0) : 0;
  };

  proto.fr2NameOf = function (id) {
    if (id === 'player') return '你';
    var f = this.friendById(id);
    return f ? f.name : '?';
  };

  proto.fr2BondCanMake = function (type, a, b) {
    var bt = this.fr2BondType(type);
    if (!bt) return { ok: false, msg: '未知的羈絆類型' };
    if (a === b) return { ok: false, msg: '不能與自己結成羈絆' };
    if (this.fr2BondBetween(a, b)) return { ok: false, msg: '兩人已有羈絆' };
    var fa = this.fr2FavorOf(a), fb = this.fr2FavorOf(b);
    if (fa < bt.minFavor || fb < bt.minFavor) {
      return { ok: false, msg: '雙方好感需達 ' + bt.minFavor + '（目前 ' + fa + ' / ' + fb + '）' };
    }
    if (this.fr2BondCountOf(a) >= num(bt.maxPer, 2) || this.fr2BondCountOf(b) >= num(bt.maxPer, 2)) {
      return { ok: false, msg: '羈絆數量已達上限（每種 ' + bt.maxPer + ' 段）' };
    }
    if (a !== 'player' && b !== 'player' && !this.friendById(a) || !this.friendById(b)) {
      if (!(a === 'player' || b === 'player')) return { ok: false, msg: '找不到對象' };
    }
    return { ok: true };
  };

  proto.fr2BondMake = function (type, a, b, silent) {
    var chk = this.fr2BondCanMake(type, a, b);
    if (!chk.ok) { if (!silent) this.log('⚠️ 無法結成羈絆：' + chk.msg, 'system'); return false; }
    var B = this.fr2BondState();
    var bt = this.fr2BondType(type);
    var bond = {
      id: uid('bd'), type: type, a: a, b: b, lv: 1, exp: 0,
      since: Date.now(), days: 0
    };
    B.list.push(bond);
    this.friendLog(bt.icon + ' 【' + this.fr2NameOf(a) + '】與【' + this.fr2NameOf(b) + '】結成「' + bt.name + '」！', 'gain');
    return true;
  };

  proto.fr2BondBreak = function (bondId) {
    var B = this.fr2BondState();
    var self = this;
    var bd = null;
    B.list.forEach(function (x) { if (x.id === bondId) bd = x; });
    if (!bd) return false;
    var pen = num(C2.BOND_BREAK_FAVOR, -20);
    [bd.a, bd.b].forEach(function (id) {
      if (id === 'player') return;
      var f = self.friendById(id);
      if (f) f.favor = Math.max(0, num(f.favor, 0) + pen);
    });
    B.list = B.list.filter(function (x) { return x.id !== bondId; });
    B.broken = num(B.broken, 0) + 1;
    this.friendLog('💔 【' + this.fr2NameOf(bd.a) + '】與【' + this.fr2NameOf(bd.b) + '】的羈絆已斷（好感 ' + pen + '）。', 'system');
    return true;
  };

  proto.fr2BondTick = function () {
    var B = this.fr2BondState();
    var self = this;

    // 羈絆升級
    B.list.forEach(function (bd) {
      bd.days = num(bd.days, 0) + 1;
      if (num(bd.lv, 1) >= num(C2.BOND_LV_MAX, 5)) return;
      if (Math.random() >= num(C2.BOND_LV_UP_CHANCE, 0.10)) return;
      bd.lv = num(bd.lv, 1) + 1;
      [bd.a, bd.b].forEach(function (id) {
        if (id === 'player') return;
        var f = self.friendById(id);
        if (f) f.favor = Math.min(100, num(f.favor, 0) + num(C2.BOND_LV_UP_FAVOR, 2));
      });
      var bt = self.fr2BondType(bd.type);
      self.friendLog((bt ? bt.icon : '💞') + ' 【' + self.fr2NameOf(bd.a) + '】與【' + self.fr2NameOf(bd.b) +
        '】的羈絆提升至 Lv.' + bd.lv + '。', 'gain');
    });

    // 好友之間自動結交
    var list = this.friendAll().filter(function (f) { return !f.retired; });
    if (list.length < 2) return;
    if (Math.random() >= num(C2.BOND_AUTO_CHANCE, 0.045)) return;
    var a = pick(list), b = pick(list);
    if (!a || !b || a.id === b.id) return;
    if (this.fr2BondBetween(a.id, b.id)) return;
    if (num(a.favor, 0) < num(C2.BOND_MUTUAL_FAVOR, 45) || num(b.favor, 0) < num(C2.BOND_MUTUAL_FAVOR, 45)) return;
    var type = Math.random() < 0.7 ? 'sworn' : 'master';
    var bt2 = this.fr2BondType(type);
    if (this.fr2BondCountOf(a.id) >= num(bt2.maxPer, 2) || this.fr2BondCountOf(b.id) >= num(bt2.maxPer, 2)) return;
    this.fr2BondMake(type, a.id, b.id, true);
  };

  /** 某好友（或玩家）身上的羈絆加成 */
  proto.fr2BondBonusOf = function (id) {
    var L = this.fr2BondList();
    var out = { atkPct: 0, defPct: 0, hpPct: 0, list: [] };
    for (var i = 0; i < L.length; i++) {
      var bd = L[i];
      if (bd.a !== id && bd.b !== id) continue;
      var bt = this.fr2BondType(bd.type);
      if (!bt) continue;
      var lv = num(bd.lv, 1);
      var bn = bt.bonus || {};
      out.atkPct += num(bn.atkPct, 0) + num(bn.perLv, 0) * (lv - 1);
      out.defPct += num(bn.defPct, 0) + num(bn.perLv, 0) * (lv - 1);
      out.hpPct += num(bn.hpPct, 0) + num(bn.perLv, 0) * (lv - 1);
      out.list.push({ type: bd.type, name: bt.name, icon: bt.icon, lv: lv, partner: this.fr2NameOf(bd.a === id ? bd.b : bd.a) });
    }
    var cap = num(C2.TITLE_BONUS_CAP, 0.6);
    out.atkPct = Math.min(cap, out.atkPct);
    out.defPct = Math.min(cap, out.defPct);
    out.hpPct = Math.min(cap, out.hpPct);
    return out;
  };

  /* ══════════════════════════════════════════════════════
     稱號
     ══════════════════════════════════════════════════════ */
  proto.fr2TitleDefault = function () { return { granted: 0, lastAt: 0 }; };
  proto.fr2TitleState = function () {
    var S = this.friendState();
    if (!S.titles || typeof S.titles !== 'object') S.titles = this.fr2TitleDefault();
    if (S.titles.granted === undefined) S.titles.granted = 0;
    if (S.titles.lastAt === undefined) S.titles.lastAt = 0;
    return S.titles;
  };

  proto.fr2TitleMet = function (f, t) {
    var c = t.cond || {};
    if (c.hasBond) {
      var L = this.fr2BondList(), hit = false;
      for (var i = 0; i < L.length; i++) if (L[i].type === c.hasBond && (L[i].a === f.id || L[i].b === f.id)) hit = true;
      if (!hit) return false;
    }
    if (c.bondCount !== undefined && this.fr2BondCountOf(f.id) < c.bondCount) return false;
    if (c.meridianCount !== undefined) {
      var m = 0;
      Object.keys(f.meridians || {}).forEach(function (k) { if (num(f.meridians[k], 0) > 0) m += 1; });
      if (m < c.meridianCount) return false;
    }
    var keys = ['lv', 'kills', 'clears', 'goldEarned', 'drops', 'levelUps', 'spEarned', 'equips',
      'sectJoins', 'tourneyWins', 'activeTicks', 'skillsLearned', 'rescues'];
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      if (c[k] === undefined) continue;
      if (num(f[k], 0) < num(c[k], 0)) return false;
    }
    return true;
  };

  proto.fr2GrantTitle = function (f, id) {
    if (!f) return false;
    if (!Array.isArray(f.titles)) f.titles = [];
    if (f.titles.indexOf(id) !== -1) return false;
    f.titles.push(id);
    this.fr2TitleState().granted = num(this.fr2TitleState().granted, 0) + 1;
    var def = null;
    (F.TITLES || []).forEach(function (t) { if (t.id === id) def = t; });
    if (def) this.friendLog('🎖️ 【' + f.name + '】獲得稱號「' + def.icon + def.name + '」！', 'gain');
    return true;
  };

  proto.fr2TitleTick = function () {
    var S = this.friendState();
    var iv = num(C2.TITLE_INTERVAL, 5);
    if (!S.titleAt || num(S.ticks, 0) >= S.titleAt) {
      S.titleAt = num(S.ticks, 0) + iv;
      var self = this;
      this.friendAll().forEach(function (f) {
        (F.TITLES || []).forEach(function (t) {
          if (!t.cond || !Object.keys(t.cond).length) return;   // 僅授予型跳過
          if (self.fr2TitleMet(f, t)) self.fr2GrantTitle(f, t.id);
        });
      });
    }
  };

  proto.fr2TitleBonusOf = function (f) {
    var out = { atkPct: 0, defPct: 0, hpPct: 0, fame: 0, list: [] };
    var ids = (f && f.titles) || [];
    for (var i = 0; i < ids.length; i++) {
      var def = null;
      (F.TITLES || []).forEach(function (t) { if (t.id === ids[i]) def = t; });
      if (!def) continue;
      var b = def.bonus || {};
      out.atkPct += num(b.atkPct, 0);
      out.defPct += num(b.defPct, 0);
      out.hpPct += num(b.hpPct, 0);
      out.fame += num(b.fame, 0);
      out.list.push(def);
    }
    var cap = num(C2.TITLE_BONUS_CAP, 0.6);
    out.atkPct = Math.min(cap, out.atkPct);
    out.defPct = Math.min(cap, out.defPct);
    out.hpPct = Math.min(cap, out.hpPct);
    return out;
  };

  /* ══════════════════════════════════════════════════════
     書信
     ══════════════════════════════════════════════════════ */
  proto.fr2MailDefault = function () { return { list: [], sent: 0, nextAt: 0, claimed: 0 }; };
  proto.fr2MailState = function () {
    var S = this.friendState();
    if (!S.mail || typeof S.mail !== 'object') S.mail = this.fr2MailDefault();
    var M = S.mail, d = this.fr2MailDefault(), k;
    for (k in d) { if (M[k] === undefined) M[k] = d[k]; }
    if (!Array.isArray(M.list)) M.list = [];
    return M;
  };

  proto.fr2MailPush = function (o) {
    o = o || {};
    var M = this.fr2MailState();
    var tpl = null;
    (F.MAIL_TEMPLATES || []).forEach(function (t) { if (t.id === o.tpl) tpl = t; });
    var from = o.from || null;
    var name = o.name || (from ? (this.friendById(from) || {}).name : '江湖好友') || '江湖好友';
    var subject = o.subject || (tpl ? String(tpl.subject).replace(/\{name\}/g, name) : (name + '的來信'));
    var body = o.body || (tpl ? String(tpl.body).replace(/\{name\}/g, name) : '');
    var m = {
      id: uid('mail'), fromId: from, fromName: name, subject: subject, body: body,
      attach: o.attach || [], read: false, at: Date.now()
    };
    M.list.unshift(m);
    M.list = M.list.slice(0, num(C2.MAIL_MAX, 40));
    M.sent = num(M.sent, 0) + 1;
    return m;
  };

  proto.fr2MailTick = function () {
    var M = this.fr2MailState();
    var S = this.friendState();
    var self = this;
    var iv = num(C2.MAIL_INTERVAL, 18);
    if (!M.nextAt) M.nextAt = num(S.ticks, 0) + iv;
    if (num(S.ticks, 0) < M.nextAt) return;
    M.nextAt = num(S.ticks, 0) + iv;

    var pool = this.friendAll().filter(function (f) { return !f.retired; });
    if (!pool.length) return;
    var f = pick(pool);
    var attach = [];
    if (Math.random() < num(C2.MAIL_GIFT_CHANCE, 0.55)) {
      var kind = Math.random();
      if (kind < 0.5) attach.push({ kind: 'gold', amount: Math.round(400 + num(f.lv, 1) * 80) });
      else {
        var eq = this.friendRollEquip(Math.max(1, this.fr2PlayerLv()));
        if (eq) attach.push({ kind: 'equip', item: eq });
        else attach.push({ kind: 'gold', amount: 600 });
      }
    }
    this.fr2MailPush({ from: f.id, tpl: pick(['m_greet', 'm_loot', 'm_invite', 'm_report']), attach: attach });
  };

  proto.fr2MailClaim = function (mailId) {
    var M = this.fr2MailState();
    var self = this;
    var m = null;
    M.list.forEach(function (x) { if (x.id === mailId) m = x; });
    if (!m) return false;
    var got = [];
    (m.attach || []).forEach(function (a) {
      if (a.kind === 'gold') {
        self.charSys.rootState.gold = num(self.charSys.rootState.gold, 0) + num(a.amount, 0);
        got.push(num(a.amount, 0).toLocaleString() + ' 兩紋銀');
      } else if (a.kind === 'equip' && a.item) {
        if (self.fr2PushToPlayerBag(a.item)) got.push(self.friendItemLabel(a.item));
      } else if (a.kind === 'item' && a.itemId) {
        try {
          if (self.invSys && typeof self.invSys.addItem === 'function') self.invSys.addItem(a.itemId, num(a.count, 1));
          else {
            var root = self.charSys.rootState;
            root.inventory = root.inventory || {};
            root.inventory[a.itemId] = (root.inventory[a.itemId] || 0) + num(a.count, 1);
          }
          got.push(((((window.HY.Data || {}).ITEMS || {})[a.itemId] || {}).name || a.itemId));
        } catch (e) { /* 忽略 */ }
      }
    });
    m.read = true;
    m.attach = [];
    m.claimedAt = Date.now();
    M.claimed = num(M.claimed, 0) + 1;
    if (got.length) this.friendLog('✉️ 領取【' + m.fromName + '】的來信附件：' + got.join('、'), 'loot');
    return true;
  };

  proto.fr2MailClaimAll = function () {
    var M = this.fr2MailState();
    var self = this, n = 0;
    M.list.slice().forEach(function (m) {
      if (m.attach && m.attach.length) { if (self.fr2MailClaim(m.id)) n += 1; }
    });
    if (n === 0) this.log('✉️ 沒有可領取的附件。', 'system');
    else this.friendLog('✉️ 一鍵領取完成，共處理 ' + n + ' 封信件。', 'loot');
    return n;
  };

  proto.fr2MailReply = function (mailId) {
    var M = this.fr2MailState();
    var m = null;
    M.list.forEach(function (x) { if (x.id === mailId) m = x; });
    if (!m) return false;
    if (m.replied) { this.log('✉️ 你已回過這封信了。', 'system'); return false; }
    m.replied = true;
    var f = this.friendById(m.fromId);
    if (f) {
      f.favor = Math.min(100, num(f.favor, 0) + num(C2.MAIL_REPLY_FAVOR, 3));
      this.friendLog('✉️ 你回了一封信給【' + m.fromName + '】，好感 +' + num(C2.MAIL_REPLY_FAVOR, 3) + '。', 'time');
    }
    return true;
  };

  proto.fr2MailDelete = function (mailId) {
    var M = this.fr2MailState();
    var m = null;
    M.list.forEach(function (x) { if (x.id === mailId) m = x; });
    if (!m) return false;
    if (m.attach && m.attach.length) { this.log('⚠️ 信件還有未領取的附件，請先領取。', 'system'); return false; }
    M.list = M.list.filter(function (x) { return x.id !== mailId; });
    return true;
  };

  proto.fr2MailUnread = function () {
    var M = this.fr2MailState(), n = 0;
    M.list.forEach(function (m) { if (!m.read || (m.attach && m.attach.length)) n += 1; });
    return n;
  };

  /* ══════════════════════════════════════════════════════
     把羈絆／稱號加成灌進好友的衍生屬性（含戰鬥）
     ══════════════════════════════════════════════════════ */
  proto.fr2InstallFriendBonus = function () {
    var CS = window.HY.CharacterSystem;
    if (!CS || !CS.prototype || CS.prototype.__fr2FriendBonus) return;
    CS.prototype.__fr2FriendBonus = true;
    var orig = CS.prototype.getDerivedStatsForChar;
    CS.prototype.getDerivedStatsForChar = function (c) {
      var d = orig.call(this, c);
      try {
        var town = window.HY.game && window.HY.game.townSys;
        if (!town || typeof town.fr2BondBonusOf !== 'function') return d;
        if (!c || !c.id) return d;
        // 只處理「好友」（不在玩家 roster 內、且能在好友名單找到）
        if (this.rootState && Array.isArray(this.rootState.roster) && this.rootState.roster.indexOf(c) !== -1) return d;
        if (typeof town.friendById !== 'function' || !town.friendById(c.id)) return d;
        var b = town.fr2BondBonusOf(c.id);
        var t = town.fr2TitleBonusOf(c);
        var atk = num(b.atkPct, 0) + num(t.atkPct, 0);
        var def = num(b.defPct, 0) + num(t.defPct, 0);
        var hp = num(b.hpPct, 0) + num(t.hpPct, 0);
        if (d.atk) d.atk = Math.floor(d.atk * (1 + atk));
        if (d.def) d.def = Math.floor(d.def * (1 + def));
        if (d.maxHp) d.maxHp = Math.floor(d.maxHp * (1 + hp));
        if (typeof this.getPowerScore === 'function') d.powerScore = this.getPowerScore(d);
      } catch (e) { /* 忽略 */ }
      return d;
    };
    console.log('[friendSocial] ✓ 羈絆／稱號加成已掛載（含戰鬥數值）');
  };

  /* ══════════════════════════════════════════════════════
     報告
     ══════════════════════════════════════════════════════ */
  proto.fr2BondReport = function () {
    var B = this.fr2BondState();
    var self = this;
    var list = B.list.map(function (bd) {
      var bt = self.fr2BondType(bd.type) || { name: bd.type, icon: '💞', color: '#94a3b8' };
      var fa = self.friendById(bd.a), fb = self.friendById(bd.b);
      return {
        id: bd.id, type: bd.type, typeName: bt.name, icon: bt.icon, color: bt.color,
        lv: num(bd.lv, 1), lvMax: num(C2.BOND_LV_MAX, 5), days: num(bd.days, 0),
        a: bd.a, b: bd.b, aName: self.fr2NameOf(bd.a), bName: self.fr2NameOf(bd.b),
        aIcon: bd.a === 'player' ? '🧑‍🎤' : ((fa && fa.icon) || '🧑'),
        bIcon: bd.b === 'player' ? '🧑‍🎤' : ((fb && fb.icon) || '🧑'),
        aLv: bd.a === 'player' ? self.fr2PlayerLv() : num(fa && fa.lv, 1),
        bLv: bd.b === 'player' ? self.fr2PlayerLv() : num(fb && fb.lv, 1),
        desc: bt.desc
      };
    });
    // 可締結的候選
    var cands = [];
    this.friendAll().forEach(function (f) {
      if (f.retired) return;
      (F.BOND_TYPES || []).forEach(function (bt) {
        var chk = self.fr2BondCanMake(bt.id, 'player', f.id);
        if (chk.ok) cands.push({ type: bt.id, typeName: bt.name, icon: bt.icon, color: bt.color, id: f.id, name: f.name, favor: num(f.favor, 0) });
      });
    });
    return {
      list: list, candidates: cands, broken: num(B.broken, 0),
      playerBonus: this.fr2BondBonusOf('player'),
      types: F.BOND_TYPES || [], maxPerFriend: num(C2.BOND_MAX_PER_FRIEND, 4)
    };
  };

  proto.fr2TitleReport = function () {
    var self = this;
    var defs = F.TITLES || [];
    var list = this.friendAll().map(function (f) {
      var tb = self.fr2TitleBonusOf(f);
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1),
        titles: (f.titles || []).map(function (id) {
          var def = null;
          defs.forEach(function (t) { if (t.id === id) def = t; });
          return def ? { id: def.id, name: def.name, icon: def.icon, rank: def.rank, desc: def.desc } : { id: id, name: id, icon: '🎖️', rank: 1, desc: '' };
        }),
        bonus: { atkPct: tb.atkPct, defPct: tb.defPct, hpPct: tb.hpPct, fame: tb.fame }
      };
    });
    return {
      list: list, defs: defs, granted: num(this.fr2TitleState().granted, 0),
      total: list.reduce(function (s, x) { return s + x.titles.length; }, 0)
    };
  };

  proto.fr2MailReport = function () {
    var M = this.fr2MailState();
    var self = this;
    var list = M.list.map(function (m) {
      return {
        id: m.id, fromName: m.fromName, fromId: m.fromId, subject: m.subject, body: m.body,
        attach: (m.attach || []).map(function (a) {
          if (a.kind === 'gold') return { kind: 'gold', label: num(a.amount, 0).toLocaleString() + ' 兩紋銀' };
          if (a.kind === 'equip') return { kind: 'equip', label: self.friendItemLabel(a.item) };
          if (a.kind === 'item') return { kind: 'item', label: (a.itemId || '物品') + ' ×' + num(a.count, 1) };
          return { kind: a.kind, label: '?' };
        }),
        read: !!m.read, replied: !!m.replied, at: m.at,
        hasAttach: !!(m.attach && m.attach.length)
      };
    });
    return { list: list, unread: this.fr2MailUnread(), sent: num(M.sent, 0), claimed: num(M.claimed, 0), max: num(C2.MAIL_MAX, 40) };
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr2SocialBootOnce = function () {
    if (this._fr2SocialBooted) return;
    this._fr2SocialBooted = true;
    try { this.fr2InstallFriendBonus(); } catch (e) { console.error('[friendSocial] 加成掛載失敗：', e); }
    console.log('[friendSocial] ✓ 羈絆／稱號／書信系統已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr2SocialBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  window.HY.FriendSocial = { version: '1.0', bondTypes: BT.length, titles: (F.TITLES || []).length };
  console.log('[friendSocial] ✓ 已載入（羈絆／稱號／書信）');
})();