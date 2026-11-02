// js/linkBus.js (v2)
// ⭐ 統一連動匯流排（全遊戲通用）
//    ① EffectBus   效果註冊與聚合（任何系統都能貢獻加成）
//    ② SystemRegistry 系統註冊表（native / external / hybrid）
//    ③ HookBus     事件鉤子（onTick / onBattleStart / onLoot / onLevelUp …）
//    ④ AutoDiscovery 自動探索（關鍵字評分，不再靠猜路徑）
//    ⑤ AutoWatch   持續監看新模組 → 自動咬合（未來內容零設定接入）
//
// 【v2 修正】
//    (1) 對外 API 補上 hookCount / hookList / hasSystem / count / ready
//        （v1 的 hookCount 是內部函式卻未暴露 → linkSystems.js 呼叫時 TypeError）
//    (2) effect() 支援冪等：提供 e.id 時改為「就地更新」而非新增
//    (3) register() 支援重複註冊：先清掉該系統的舊效果與舊鉤子，避免疊加
//        （效果 id 自動生成為 sysId_eN，確保兩次註冊不會變成兩份加成）
//    (4) 新增 HY.Link.on() 簡寫：on(hookName, fn) 等同 hook(hookName, fn, 0, 'user')
//
// 給任何模組使用（含未來新增）：
//   window.HY.XXX = {...};
//   window.HY.XXX.HY_LINK = { id, name, icon, caps, effects, hooks };
//
// Console：
//   HY.Link.audit()               // 全部系統與綁定狀態
//   HY.Link.discover(true)        // 強制重新探索
//   HY.Link.collect('friend', {}) // 聚合好友範圍效果
//   HY.Link.systems()             // 已註冊系統清單
//   HY.Link.effectsOf('pet')      // 某系統貢獻的效果
//   HY.Link.hookCount()           // 鉤子總數
//   HY.Link.hookList()            // 各鉤子的處理器數
//
// ⚠️ 載入順序：必須排在「所有系統檔」之前（僅次於 gameConfig 5 支）
window.HY = window.HY || {};

(function () {
  var LS_BIND = 'hy_link_bind_v1';
  var LS_OFF = 'hy_link_off_v1';

  /* ══════════════════════════════════════════════════════
     內部狀態
     ══════════════════════════════════════════════════════ */
  var systems = {};        // id -> { id, name, icon, caps, obj, source, boundPath, score, desc, effects:[], hookNames:[] }
  var effects = {};        // eid -> { eid, sys, scope, target, value, mul, cond, label, priority, tags }
  var hooks = {};          // name -> [{ sys, fn, priority }]
  var bindCache = {};      // 手動綁定覆寫（localStorage）
  var offList = {};        // 停用清單（localStorage）
  var _eidSeq = 0;
  var _watchTimer = null;
  var _log = [];

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function isObj(v) { return v && typeof v === 'object'; }
  function uid(p) { return (p || 'e') + (++_eidSeq).toString(36); }
  function log(msg, kind) {
    _log.unshift({ t: Date.now(), msg: msg, kind: kind || 'info' });
    if (_log.length > 200) _log.pop();
    if (kind === 'error') console.error('[Link] ' + msg);
  }

  /* ══════════════════════════════════════════════════════
     ① 效果匯流排
     ══════════════════════════════════════════════════════ */

  /**
   * 註冊效果（提供 id 時為冪等更新）
   * @param {object} e { id?, sys, scope, target, value, mul?, cond?, label?, priority?, tags? }
   *   scope: 'friend' | 'player' | 'team' | 'town' | 'global' | 'enemy'
   *   target: 'atkPct' | 'defPct' | 'hpPct' | 'expMul' | 'goldMul' | 'dropMul'
   *          | 'atbMul' | 'critAdd' | 'evaAdd' | 'spMul' | 'flat:atk' …
   */
  function effect(e) {
    if (!e || !e.sys) { log('effect 缺少 sys', 'error'); return null; }
    var eid = e.id || uid('e_');

    // ★ v2：若 eid 已存在 → 就地更新（不重複累加）
    var existed = !!effects[eid];
    var rec = {
      eid: eid,
      sys: e.sys,
      scope: e.scope || 'global',
      target: e.target || 'atkPct',
      value: num(e.value, 0),
      mul: (e.mul === undefined ? null : num(e.mul, 1)),
      cond: (typeof e.cond === 'function') ? e.cond : null,
      label: e.label || '',
      priority: num(e.priority, 0),
      tags: e.tags || [],
      disabled: !!e.disabled
    };
    effects[eid] = rec;

    var s = systems[e.sys];
    if (s && s.effects.indexOf(eid) === -1) s.effects.push(eid);
    if (existed) log('效果更新：' + eid + '（' + e.sys + '）', 'info');
    return eid;
  }

  function removeEffect(eid) {
    if (!effects[eid]) return false;
    var sys = effects[eid].sys;
    delete effects[eid];
    var s = systems[sys];
    if (s) s.effects = s.effects.filter(function (x) { return x !== eid; });
    return true;
  }

  function clearEffectsOf(sysId) {
    var n = 0;
    Object.keys(effects).forEach(function (k) {
      if (effects[k].sys === sysId) { delete effects[k]; n += 1; }
    });
    if (systems[sysId]) systems[sysId].effects = [];
    return n;
  }

  /**
   * 聚合效果
   * @param {string} scope
   * @param {object} ctx 條件上下文（傳給 cond）
   * @param {string[]} [tags] 只取含這些 tag 的效果（可選）
   * @returns {object} { atkPct, defPct, ..., sources:[{sys,label,value,target}] }
   */
  function collect(scope, ctx, tags) {
    var out = { sources: [] };
    var list = Object.keys(effects).map(function (k) { return effects[k]; })
      .filter(function (e) {
        if (e.disabled) return false;
        if (scope && scope !== '*' && e.scope !== scope) return false;
        if (tags && tags.length) {
          var hit = false;
          tags.forEach(function (t) { if (e.tags.indexOf(t) !== -1) hit = true; });
          if (!hit) return false;
        }
        if (e.cond) {
          try { if (!e.cond(ctx || {})) return false; }
          catch (err) { return false; }
        }
        return true;
      })
      .sort(function (a, b) { return b.priority - a.priority; });

    list.forEach(function (e) {
      var t = e.target;
      if (e.mul !== null && e.mul !== undefined) {
        out[t] = num(out[t], 1) * e.mul;
      } else {
        out[t] = num(out[t], 0) + e.value;
      }
      out.sources.push({
        sys: e.sys, label: e.label || e.target, target: t,
        value: e.value, mul: e.mul, eid: e.eid
      });
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════
     ② 系統註冊表
     ══════════════════════════════════════════════════════ */

  /**
   * 註冊系統（可重複呼叫，不會疊加效果／鉤子）
   * @param {object} d { id, name, icon, desc, obj?, source?, caps?, effects?, hooks? }
   */
  function register(d) {
    if (!d || !d.id) { log('register 缺少 id', 'error'); return null; }
    var isNew = !systems[d.id];
    var s = systems[d.id] || (systems[d.id] = {
      id: d.id, name: d.id, icon: '🧩', desc: '',
      caps: [], obj: null, source: 'native', boundPath: '', score: 0,
      effects: [], hookNames: [], registeredAt: Date.now()
    });
    if (d.name) s.name = d.name;
    if (d.icon) s.icon = d.icon;
    if (d.desc) s.desc = d.desc;
    if (d.obj) s.obj = d.obj;
    if (d.source) s.source = d.source;
    if (d.caps) s.caps = d.caps.slice();

    /* ★ v2：先清掉舊的效果與鉤子，避免重複註冊疊加 */
    if (!isNew) {
      clearEffectsOf(d.id);
      Object.keys(hooks).forEach(function (name) {
        hooks[name] = hooks[name].filter(function (h) { return h.sys !== d.id; });
      });
      s.hookNames = [];
    }

    // 註冊效果（id 自動生成為 sysId_eN → 冪等）
    if (d.effects && d.effects.length) {
      d.effects.forEach(function (e, i) {
        var e2 = {};
        Object.keys(e).forEach(function (k) { e2[k] = e[k]; });
        e2.sys = d.id;
        if (!e2.id) e2.id = d.id + '_e' + i;
        effect(e2);
      });
    }
    // 註冊鉤子
    if (d.hooks) {
      Object.keys(d.hooks).forEach(function (name) {
        hook(name, d.hooks[name], 0, d.id);
        if (s.hookNames.indexOf(name) === -1) s.hookNames.push(name);
      });
    }
    return s;
  }

  function unregister(id) {
    var s = systems[id];
    if (!s) return false;
    clearEffectsOf(id);
    Object.keys(hooks).forEach(function (name) {
      hooks[name] = hooks[name].filter(function (h) { return h.sys !== id; });
    });
    delete systems[id];
    return true;
  }

  function get(id) {
    var s = systems[id];
    return s ? s.obj : null;
  }
  function sysInfo(id) { return systems[id] || null; }
  function hasSystem(id) { return !!systems[id]; }
  function sysList() {
    return Object.keys(systems).map(function (k) { return systems[k]; });
  }
  function sysCount() { return Object.keys(systems).length; }

  /* ══════════════════════════════════════════════════════
     ③ 事件鉤子
     ══════════════════════════════════════════════════════ */
  var HOOK_NAMES = [
    'onTick',          // 每期
    'onHour',          // 每 60 期
    'onBattleStart',   // 戰鬥開始
    'onBattleEnd',     // 戰鬥結束
    'onDamage',        // 造成傷害
    'onLoot',          // 掉落
    'onLevelUp',       // 升級
    'onRecruit',       // 招募
    'onRetire',        // 退隱
    'onFriendJoin',    // 加入好友
    'onFriendLeave',   // 離開好友
    'onTownUp',        // 小鎮升級
    'onGold',          // 金錢變動
    'onDay',           // 每 24 期
    'onDiscover'       // 探索到新系統
  ];

  function hook(name, fn, priority, sysId) {
    if (!name || typeof fn !== 'function') return false;
    if (!hooks[name]) hooks[name] = [];
    hooks[name].push({ sys: sysId || 'anonymous', fn: fn, priority: num(priority, 0) });
    hooks[name].sort(function (a, b) { return b.priority - a.priority; });
    return true;
  }
  function unhook(name, fn) {
    if (!hooks[name]) return false;
    var n = hooks[name].length;
    hooks[name] = hooks[name].filter(function (h) { return h.fn !== fn; });
    return hooks[name].length !== n;
  }
  function fire(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var list = hooks[name] || [];
    var results = [];
    for (var i = 0; i < list.length; i++) {
      try { results.push(list[i].fn.apply(null, args)); }
      catch (e) { console.error('[Link] hook ' + name + ' 執行失敗（' + list[i].sys + '）：', e); }
    }
    return results;
  }
  function hookNames() { return Object.keys(hooks); }
  /** ★ v2：補上對外暴露 */
  function hookCount() {
    var n = 0;
    Object.keys(hooks).forEach(function (k) { n += hooks[k].length; });
    return n;
  }
  /** ★ v2：各鉤子的處理器數 */
  function hookList() {
    var out = {};
    Object.keys(hooks).forEach(function (k) { out[k] = hooks[k].length; });
    return out;
  }
  /** ★ v2：列出某鉤子的處理器來源 */
  function hookDetail(name) {
    return (hooks[name] || []).map(function (h) {
      return { sys: h.sys, priority: h.priority };
    });
  }

  /* ══════════════════════════════════════════════════════
     ④ 自動探索（關鍵字評分）
     ══════════════════════════════════════════════════════ */

  /** 每個系統的探索關鍵字（比對物件鍵名與類別名） */
  var KEYWORDS = {
    pet:          ['pet', 'beast', 'summon', '寵物'],
    companion:    ['companion', 'follower', '同伴', '隨從'],
    formation:    ['formation', '陣法', '陣'],
    spirit:       ['spiritroot', 'spirit', '靈根'],
    element:      ['element', '五行', '屬性'],
    affix:        ['affix', '詞綴', '綴'],
    guild:        ['guild', '公會'],
    sect:         ['sect', '門派', 'feature'],
    market:       ['blackmarket', 'market', '黑市', '市集'],
    craft:        ['poe', 'craft', '工藝', 'crafting'],
    salvage:      ['salvage', '打撈', '遠征'],
    mastery:      ['mastery', '精通'],
    atb:          ['atb', 'dexterity', 'dex', 'speed', '速度'],
    enemyfm:      ['enemyformation', 'enemyform', '敵陣'],
    timetravel:   ['timetravel', 'time', '時光', '穿越'],
    gamble:       ['gamble', 'bet', '賭'],
    lottery:      ['lottery', '樂透', '抽獎'],
    roster:       ['roster', '名冊', '角色表'],
    offline:      ['offline', 'idle', '離線', '掛機'],
    level:        ['levelexp', 'level', 'exp', '等級', '經驗'],
    town:         ['town', '小鎮'],
    friend:       ['friend', '好友'],
    combat:       ['combat', 'battle', '戰鬥'],
    equip:        ['equip', 'equipment', '裝備'],
    inventory:    ['inventory', 'inv', '行囊', '背包'],
    martial:      ['martial', 'skill', 'sect', '武學', '招式'],
    save:         ['save', '存檔'],
    char:         ['character', 'char', '角色'],
    party:        ['party', '隊伍'],
    poe:          ['poe', 'currency', '通貨'],
    cheat:        ['cheat', '作弊'],
    response:     ['responsive', 'layout', '適應'],
    font:         ['font', '字體']
  };

  /** 對單一鍵名評分 */
  function scoreKey(key, obj) {
    var k = String(key).toLowerCase();
    var best = 0, hit = null;
    Object.keys(KEYWORDS).forEach(function (sysId) {
      KEYWORDS[sysId].forEach(function (w) {
        var w2 = String(w).toLowerCase();
        if (k === w2) { if (3 > best) { best = 3; hit = sysId; } }
        else if (k.indexOf(w2) !== -1) { if (2 > best) { best = 2; hit = sysId; } }
      });
    });
    // 有實例方法者加分
    if (best > 0 && isObj(obj)) {
      var fns = 0;
      Object.keys(obj).forEach(function (m) { if (typeof obj[m] === 'function') fns += 1; });
      if (fns >= 3) best += 1;
    }
    return { score: best, sys: hit };
  }

  /** 掃描容器 */
  function scanContainer(container, path, out) {
    if (!isObj(container)) return;
    var keys;
    try { keys = Object.keys(container); } catch (e) { return; }
    keys.forEach(function (k) {
      var v = container[k];
      if (v === null || v === undefined) return;
      if (typeof v === 'function') return;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return;
      var p = path + '.' + k;
      var sc = scoreKey(k, v);
      if (sc.score >= 2 && sc.sys) {
        out.push({
          path: p, key: k, sys: sc.sys, score: sc.score, obj: v,
          isArray: Array.isArray(v),
          len: Array.isArray(v) ? v.length : (isObj(v) ? Object.keys(v).length : 0)
        });
      }
      // 遞迴（限制深度避免爆）
      var depth = p.split('.').length;
      if (depth < 5 && isObj(v) && !Array.isArray(v)) {
        scanContainer(v, p, out);
      }
    });
  }

  /** 執行探索 */
  function discover(force) {
    var out = [];
    scanContainer(window.HY, 'HY', out);
    if (window.HY.game) scanContainer(window.HY.game, 'HY.game', out);
    if (window.app && window.app !== window.HY) scanContainer(window.app, 'app', out);

    // 依 sys 分組，取分數最高
    var best = {};
    out.forEach(function (c) {
      var cur = best[c.sys];
      if (!cur || c.score > cur.score || (c.score === cur.score && c.len > cur.len)) {
        best[c.sys] = c;
      }
    });

    // 套用綁定（外部系統優先）
    var boundCount = 0;
    Object.keys(best).forEach(function (sysId) {
      var c = best[sysId];
      var s = systems[sysId];
      if (!s) return;
      if (offList[sysId]) return;
      if (s.source === 'native' && s.score >= c.score) return;
      if (s.obj === c.obj && !force) return;

      s.obj = c.obj;
      s.boundPath = c.path;
      s.score = c.score;
      s.source = (s.source === 'native') ? 'hybrid' : 'external';
      boundCount += 1;
      fire('onDiscover', s);
      log('探索綁定：' + sysId + ' ← ' + c.path + '（分數 ' + c.score + '）', 'discover');
    });

    return { scanned: out.length, bound: boundCount, candidates: out };
  }

  /* ══════════════════════════════════════════════════════
     ⑤ 持續監看（新模組自動咬合）
     ══════════════════════════════════════════════════════ */
  function watchNewModules() {
    if (!isObj(window.HY)) return 0;
    var n = 0;
    Object.keys(window.HY).forEach(function (k) {
      var v = window.HY[k];
      if (!isObj(v)) return;
      var d = v.HY_LINK;
      if (!d || !d.id) return;
      if (systems[d.id] && systems[d.id].__autoRegistered) return;
      var d2 = {};
      Object.keys(d).forEach(function (kk) { d2[kk] = d[kk]; });
      d2.obj = d2.obj || v;
      d2.source = d2.source || 'native';
      var s = register(d2);
      if (s) { s.__autoRegistered = true; s.__autoPath = 'HY.' + k; n += 1; }
      log('自動咬合：HY.' + k + ' → ' + d.id, 'auto');
    });
    return n;
  }

  function startWatch(intervalMs) {
    if (_watchTimer) return;
    var ms = num(intervalMs, 1500);
    var runs = 0;
    _watchTimer = setInterval(function () {
      runs += 1;
      var n = watchNewModules();
      if (n > 0) discover(false);
      if (runs >= 60) { clearInterval(_watchTimer); _watchTimer = null; }
    }, ms);
    watchNewModules();
  }
  function stopWatch() {
    if (_watchTimer) { clearInterval(_watchTimer); _watchTimer = null; }
  }

  /* ══════════════════════════════════════════════════════
     ⑥ 綁定覆寫 / 停用（localStorage）
     ══════════════════════════════════════════════════════ */
  function loadPrefs() {
    try {
      var a = localStorage.getItem(LS_BIND);
      if (a) bindCache = JSON.parse(a) || {};
      var b = localStorage.getItem(LS_OFF);
      if (b) offList = JSON.parse(b) || {};
    } catch (e) { bindCache = {}; offList = {}; }
  }
  function savePrefs() {
    try { localStorage.setItem(LS_BIND, JSON.stringify(bindCache)); } catch (e) { /* 忽略 */ }
    try { localStorage.setItem(LS_OFF, JSON.stringify(offList)); } catch (e) { /* 忽略 */ }
  }

  function setBinding(sysId, path) {
    if (!sysId) return false;
    if (!path) delete bindCache[sysId];
    else bindCache[sysId] = String(path);
    savePrefs();
    var s = systems[sysId];
    if (s && path) {
      var v = resolvePath(path);
      if (v !== undefined) { s.obj = v; s.boundPath = path; s.source = 'external'; }
    }
    return true;
  }
  function setOff(sysId, off) {
    if (!sysId) return false;
    if (off) offList[sysId] = 1; else delete offList[sysId];
    savePrefs();
    var s = systems[sysId];
    if (s) s.disabled = !!off;
    Object.keys(effects).forEach(function (k) {
      if (effects[k].sys === sysId) effects[k].disabled = !!off;
    });
    return true;
  }
  function isOff(sysId) { return !!offList[sysId]; }

  function resolvePath(p) {
    try {
      var parts = String(p).split('.'), o = window;
      for (var i = 0; i < parts.length; i++) {
        if (o === null || o === undefined) return undefined;
        o = o[parts[i]];
      }
      return o;
    } catch (e) { return undefined; }
  }

  /* ══════════════════════════════════════════════════════
     ⑦ 稽核
     ══════════════════════════════════════════════════════ */
  function audit() {
    return sysList().map(function (s) {
      return {
        id: s.id, name: s.name, icon: s.icon, desc: s.desc,
        source: s.source,
        boundPath: s.boundPath,
        score: s.score,
        objReady: !!s.obj,
        effectCount: s.effects.length,
        hookNames: s.hookNames.slice(),
        caps: s.caps.slice(),
        disabled: !!s.disabled
      };
    }).sort(function (a, b) { return a.id.localeCompare(b.id); });
  }

  function summary() {
    var A = audit();
    var bySrc = { native: 0, external: 0, hybrid: 0 };
    A.forEach(function (x) { bySrc[x.source] = num(bySrc[x.source], 0) + 1; });
    return {
      total: A.length,
      native: bySrc.native, external: bySrc.external, hybrid: bySrc.hybrid,
      effects: Object.keys(effects).length,
      hooks: hookCount(),
      hookNames: hookNames(),
      hookList: hookList(),
      log: _log.slice(0, 40)
    };
  }

  function effectsOf(sysId) {
    return Object.keys(effects).map(function (k) { return effects[k]; })
      .filter(function (e) { return e.sys === sysId; });
  }

  /* ══════════════════════════════════════════════════════
     ⑧ 對外 API（★ v2 補齊）
     ══════════════════════════════════════════════════════ */
  window.HY.Link = {
    version: '2.0',
    ready: true,

    // 系統
    register: register,
    unregister: unregister,
    get: get,
    sysInfo: sysInfo,
    hasSystem: hasSystem,
    systems: sysList,
    count: sysCount,

    // 效果
    effect: effect,
    removeEffect: removeEffect,
    clearEffectsOf: clearEffectsOf,
    collect: collect,
    effectsOf: effectsOf,
    effectCount: function () { return Object.keys(effects).length; },

    // 鉤子（★ hookCount / hookList / hookDetail 已補上）
    hook: hook,
    on: function (name, fn) { return hook(name, fn, 0, 'user'); },
    unhook: unhook,
    fire: fire,
    hookNames: hookNames,
    hookCount: hookCount,
    hookList: hookList,
    hookDetail: hookDetail,
    HOOK_NAMES: HOOK_NAMES,

    // 探索
    discover: discover,
    watch: startWatch,
    stopWatch: stopWatch,
    watchOnce: watchNewModules,
    keywords: KEYWORDS,

    // 偏好
    setBinding: setBinding,
    setOff: setOff,
    isOff: isOff,
    bindings: function () { return JSON.parse(JSON.stringify(bindCache)); },
    offList: function () { return JSON.parse(JSON.stringify(offList)); },
    resolve: resolvePath,

    // 稽核
    audit: audit,
    summary: summary,
    log: function () { return _log.slice(); }
  };

  /* ══════════════════════════════════════════════════════
     ⑨ 啟動
     ══════════════════════════════════════════════════════ */
  loadPrefs();
  startWatch(1200);

  function late() { discover(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late);
  else setTimeout(late, 0);
  window.addEventListener('load', function () { setTimeout(late, 300); });

  console.log('[Link] ✓ 統一連動匯流排已啟動（' + HOOK_NAMES.length + ' 種鉤子｜自動監看中）');
})();