// js/friendAuctionSystem.js (v1)
// ⭐ 好友系統 v3：委託拍賣行
//    • 你把行囊裡的裝備委託好友代售 → 數期後售出，好友抽成
//    • 好感越高抽成越低；名人星級／社會階層影響售價與速度
//    • 好友也會掛售自己打到的戰利品，你可直接買下
//    • 流標：好友等級不足時可能賣不掉，裝備退回
// ⚠️ 載入順序：friendHomeSystem.js 之後
window.HY = window.HY || {};

(function () {
  var T = window.HY.Data && window.HY.Data.TOWN;
  if (!T) { console.error('[friendAuctionSystem] 找不到 HY.Data.TOWN'); return; }
  var proto = window.HY.TownSystem && window.HY.TownSystem.prototype;
  if (!proto) { console.error('[friendAuctionSystem] 找不到 HY.TownSystem'); return; }

  var F = T.FRIEND = T.FRIEND || {};
  var C3 = F.CONFIG3 || {};

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function uid(p) { return (p || 'auc') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ══════════ 狀態 ══════════ */
  proto.fr3AucDefault = function () {
    return { consign: [], listings: [], sold: 0, stalled: 0, bought: 0, goldEarned: 0, commissionPaid: 0, nextList: 0, auto: true };
  };
  proto.fr3AucState = function () {
    var S = this.friendState();
    if (!S.auction || typeof S.auction !== 'object') S.auction = this.fr3AucDefault();
    var A = S.auction, d = this.fr3AucDefault(), k;
    for (k in d) { if (A[k] === undefined) A[k] = d[k]; }
    if (!Array.isArray(A.consign)) A.consign = [];
    if (!Array.isArray(A.listings)) A.listings = [];
    return A;
  };

  /* ══════════ 售價／抽成 ══════════ */
  proto.fr3AucPrice = function (item, f) {
    if (!item) return 0;
    var power = this.friendItemPower(item);
    var reqLv = num(item.reqLv, 1);
    var base = power * num(C3.AUCTION_PRICE_POWER, 0.55) + reqLv * 40;
    var mul = num(f && f.tier && f.tier.mul, 1);
    var soc = f ? f.society : null;
    var socMul = (soc === 'modern' || soc === 'royal') ? 1.15 : (soc === 'literati' ? 1.08 : 1.0);
    var lvMul = 1 + Math.min(0.35, num(f && f.lv, 1) * 0.002);
    return Math.max(50, Math.round(base * (0.85 + mul * 0.15) * socMul * lvMul));
  };

  proto.fr3AucCommissionRate = function (f) {
    var base = num(C3.AUCTION_COMMISSION, 0.20);
    var favor = num(f && f.favor, 0) / 100;
    var disc = favor * num(C3.AUCTION_FAVOR_DISCOUNT, 0.12);
    var socDisc = (f && f.society === 'literati') ? 0.03 : 0;
    return clamp(base - disc - socDisc, 0.02, base);
  };

  proto.fr3AucTicks = function (item, f) {
    var t = rndInt(num(C3.AUCTION_TICKS[0], 6), num(C3.AUCTION_TICKS[1], 14));
    t -= Math.floor(num(f && f.lv, 1) / 40);              // 高等好友賣得快
    if (f && f.society === 'modern') t -= 2;
    return Math.max(2, t);
  };

  /* ══════════ 玩家委託 ══════════ */
  proto.fr3AucPlayerBag = function () {
    var root = this.charSys.rootState;
    var bag = Array.isArray(root.equipBag) ? root.equipBag : [];
    var self = this, out = [];
    bag.forEach(function (it, i) {
      if (!it || typeof it !== 'object') return;
      if (!self.friendItemSlot(it)) return;
      out.push({ idx: i, name: self.friendItemLabel(it), reqLv: num(it.reqLv, 1), power: self.friendItemPower(it) });
    });
    return out;
  };

  proto.fr3AucConsign = function (bagIdx, fid) {
    var A = this.fr3AucState();
    var f = this.friendById(fid);
    if (!f) { this.log('⚠️ 找不到代售的好友。', 'system'); return false; }
    if (f.retired) { this.log('⚠️ 【' + f.name + '】已退隱，不便代售。', 'system'); return false; }
    if (A.consign.length >= num(C3.AUCTION_SLOTS, 5)) { this.log('⚠️ 同時最多 ' + num(C3.AUCTION_SLOTS, 5) + ' 件代售。', 'system'); return false; }

    var root = this.charSys.rootState;
    var bag = Array.isArray(root.equipBag) ? root.equipBag : [];
    var idx = (typeof bagIdx === 'number') ? bagIdx : parseInt(bagIdx, 10);
    var item = bag[idx];
    if (!item) { this.log('⚠️ 找不到該裝備。', 'system'); return false; }

    bag.splice(idx, 1);
    var price = this.fr3AucPrice(item, f);
    var rate = this.fr3AucCommissionRate(f);
    A.consign.push({
      id: uid('cs'), item: item, itemName: this.friendItemLabel(item),
      sellerId: fid, sellerName: f.name, sellerIcon: f.icon,
      price: price, rate: rate,
      left: this.fr3AucTicks(item, f), total: 0,
      at: Date.now()
    });
    var rec = A.consign[A.consign.length - 1];
    rec.total = rec.left;
    this.friendLog('🏛️ 你委託【' + f.name + '】代售【' + rec.itemName + '】（定價 ' + price.toLocaleString() +
      ' 兩，抽成 ' + Math.round(rate * 100) + '%，約 ' + rec.left + ' 期）', 'wealth');
    this.requestRender();
    return true;
  };

  proto.fr3AucCancel = function (id) {
    var A = this.fr3AucState();
    var c = null;
    A.consign.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return false;
    if (this.fr2PushToPlayerBag(c.item)) {
      A.consign = A.consign.filter(function (x) { return x.id !== id; });
      this.friendLog('↩️ 你取回了【' + c.itemName + '】的委託。', 'time');
      this.requestRender();
      return true;
    }
    this.log('🎒 行囊已滿，無法取回。', 'system');
    return false;
  };

  /* ══════════ 每期推進：售出 / 流標 ══════════ */
  proto.fr3AucTick = function () {
    var A = this.fr3AucState();
    var self = this;

    A.consign.slice().forEach(function (c) {
      c.left = num(c.left, 0) - 1;
      if (c.left > 0) return;
      var f = self.friendById(c.sellerId);
      // 流標判定：好友等級相對裝備需求太低 → 提高流標率
      var stall = num(C3.AUCTION_STALL_CHANCE, 0.15);
      if (f && num(f.lv, 1) < num(c.item && c.item.reqLv, 1)) stall += 0.25;
      if (!f) stall += 0.3;

      if (Math.random() < stall) {
        A.stalled = num(A.stalled, 0) + 1;
        if (self.fr2PushToPlayerBag(c.item)) {
          A.consign = A.consign.filter(function (x) { return x.id !== c.id; });
          self.friendLog('📉 【' + c.itemName + '】流標了（' + (f ? f.name : '代售人') + '未能找到買主），已退回你的行囊。', 'system');
        }
        return;
      }

      var rate = num(c.rate, 0.2);
      var commission = Math.round(num(c.price, 0) * rate);
      var net = Math.max(0, num(c.price, 0) - commission);
      self.charSys.rootState.gold = num(self.charSys.rootState.gold, 0) + net;
      A.sold = num(A.sold, 0) + 1;
      A.goldEarned = num(A.goldEarned, 0) + net;
      A.commissionPaid = num(A.commissionPaid, 0) + commission;

      if (f) {
        f.favor = Math.min(100, num(f.favor, 0) + 2);
        self.friendGainExp(f, Math.round(num(f.maxExp, 100) * num(C3.AUCTION_EXP_MUL, 0.05)));
        f.sold = num(f.sold, 0) + 1;
      }
      A.consign = A.consign.filter(function (x) { return x.id !== c.id; });
      self.friendLog('💰 【' + c.itemName + '】售出！售價 ' + num(c.price, 0).toLocaleString() +
        ' 兩，抽成 ' + commission.toLocaleString() + '（' + Math.round(rate * 100) + '%），實得 ' + net.toLocaleString() + ' 兩。', 'wealth');
      if (typeof self.fr2MailPush === 'function') {
        self.fr2MailPush({
          from: c.sellerId, tpl: 'm_greet', name: c.sellerName,
          body: '【' + c.itemName + '】已替你賣出，貨款隨信附上。',
          attach: [{ kind: 'gold', amount: Math.round(net * 0.1) }]
        });
      }
    });

    // 好友掛售自己的戰利品
    if (A.auto) {
      var S = self.friendState();
      var iv = 12;
      if (!A.nextList) A.nextList = num(S.ticks, 0) + iv;
      if (num(S.ticks, 0) >= A.nextList) {
        A.nextList = num(S.ticks, 0) + iv;
        if (A.listings.length < num(C3.AUCTION_LIST_MAX, 4)) self.fr3AucFriendList();
      }
    }
    // 舊掛售下架
    A.listings = A.listings.filter(function (l) { return num(l.left, 0) > 0; });
    A.listings.forEach(function (l) { l.left = num(l.left, 0) - 1; });
  };

  proto.fr3AucFriendList = function () {
    var A = this.fr3AucState();
    var self = this;
    var pool = this.friendAll().filter(function (f) { return !f.retired && (f.bag || []).length > 0; });
    if (!pool.length) return false;
    var f = pick(pool);
    var idx = rndInt(0, f.bag.length - 1);
    var item = f.bag[idx];
    if (!item) return false;
    f.bag.splice(idx, 1);
    var price = Math.round(this.fr3AucPrice(item, f) * (1.1 + Math.random() * 0.3));   // 掛售價略高
    A.listings.push({
      id: uid('ls'), item: item, itemName: this.friendItemLabel(item),
      sellerId: f.id, sellerName: f.name, sellerIcon: f.icon,
      price: price, left: rndInt(8, 20), at: Date.now()
    });
    this.friendLog('🏛️ 【' + f.name + '】在拍賣行掛售【' + this.friendItemLabel(item) + '】（' +
      price.toLocaleString() + ' 兩）', 'loot');
    void self;
    return true;
  };

  proto.fr3AucBuy = function (listId) {
    var A = this.fr3AucState();
    var l = null;
    A.listings.forEach(function (x) { if (x.id === listId) l = x; });
    if (!l) return false;
    if (num(this.charSys.rootState.gold, 0) < num(l.price, 0)) { this.log('⚠️ 銀兩不足（需 ' + num(l.price, 0).toLocaleString() + ' 兩）。', 'system'); return false; }
    if (!this.fr2PushToPlayerBag(l.item)) { this.log('🎒 行囊已滿。', 'system'); return false; }
    this.charSys.rootState.gold = num(this.charSys.rootState.gold, 0) - num(l.price, 0);
    A.listings = A.listings.filter(function (x) { return x.id !== l.id; });
    A.bought = num(A.bought, 0) + 1;
    var f = this.friendById(l.sellerId);
    if (f) {
      f.favor = Math.min(100, num(f.favor, 0) + 3);
      f.sold = num(f.sold, 0) + 1;
      this.friendGainExp(f, Math.round(num(f.maxExp, 100) * 0.03));
    }
    this.friendLog('🛒 你買下了【' + l.sellerName + '】的【' + l.itemName + '】（' + num(l.price, 0).toLocaleString() + ' 兩）', 'wealth');
    this.requestRender();
    return true;
  };

  proto.fr3AucRefresh = function () {
    var A = this.fr3AucState();
    var n = 0;
    while (A.listings.length < num(C3.AUCTION_LIST_MAX, 4) && n < 6) { if (!this.fr3AucFriendList()) break; n += 1; }
    this.requestRender();
    return n;
  };

  /* ══════════ 啟動 ══════════ */
  proto.fr3AucBootOnce = function () {
    if (this._fr3AucBooted) return;
    this._fr3AucBooted = true;
    try {
      var A = this.fr3AucState();
      if (!A.listings.length) { for (var i = 0; i < 3; i++) this.fr3AucFriendList(); }
    } catch (e) { /* 忽略 */ }
    console.log('[friendAuction] ✓ 委託拍賣行已啟動');
  };

  var _ensureState = proto.ensureState;
  proto.ensureState = function () {
    var t = _ensureState.call(this);
    try { this.fr3AucBootOnce(); } catch (e) { /* 忽略 */ }
    return t;
  };

  /* ══════════ 報告 ══════════ */
  proto.fr3AucReport = function () {
    var A = this.fr3AucState();
    var self = this;

    var sellers = this.friendAll().filter(function (f) { return !f.retired; }).map(function (f) {
      return {
        id: f.id, name: f.name, icon: f.icon, lv: num(f.lv, 1), tier: f.tier,
        socName: f.socName, socIcon: f.socIcon, favor: num(f.favor, 0),
        rate: self.fr3AucCommissionRate(f),
        sold: num(f.sold, 0)
      };
    }).sort(function (a, b) { return a.rate - b.rate; });

    return {
      consign: A.consign.map(function (c) {
        return {
          id: c.id, itemName: c.itemName, sellerId: c.sellerId, sellerName: c.sellerName, sellerIcon: c.sellerIcon,
          price: num(c.price, 0), rate: num(c.rate, 0), commission: Math.round(num(c.price, 0) * num(c.rate, 0)),
          net: Math.round(num(c.price, 0) * (1 - num(c.rate, 0))),
          left: num(c.left, 0), total: num(c.total, 1),
          pct: Math.round((1 - num(c.left, 0) / Math.max(1, num(c.total, 1))) * 100)
        };
      }),
      listings: A.listings.map(function (l) {
        return {
          id: l.id, itemName: l.itemName, sellerId: l.sellerId, sellerName: l.sellerName, sellerIcon: l.sellerIcon,
          price: num(l.price, 0), left: num(l.left, 0),
          power: self.friendItemPower(l.item), reqLv: num(l.item && l.item.reqLv, 1),
          canAfford: num(self.charSys.rootState.gold, 0) >= num(l.price, 0)
        };
      }),
      bag: this.fr3AucPlayerBag(),
      sellers: sellers,
      stats: {
        sold: num(A.sold, 0), stalled: num(A.stalled, 0), bought: num(A.bought, 0),
        goldEarned: num(A.goldEarned, 0), commissionPaid: num(A.commissionPaid, 0)
      },
      slots: num(C3.AUCTION_SLOTS, 5),
      baseRate: num(C3.AUCTION_COMMISSION, 0.20),
      myGold: num(this.charSys.rootState.gold, 0)
    };
  };

  window.HY.FriendAuction = { version: '1.0' };
  console.log('[friendAuction] ✓ 已載入（委託代售／掛售／流標）');
})();