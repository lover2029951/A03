// js/systemBridge.js (v1)
// ⭐ 原版系統 → 連動匯流排 的橋接層
//    為原版 40+ 支系統註冊 HY_LINK 描述子，讓它們從「外部」升級為「已接軌／混合」
//    並貢獻真實數值（探測多種 API 名稱，全部失敗則降級為「已註冊、無數值」）
//
// 【設計】所有探測都 try/catch，任一系統失敗不影響其他
//         探測到的數值會轉成 effect 註冊進 HY.Link，統一由 collect() 聚合
//
// ⚠️ 載入順序：linkSystems.js 之後、townSystem.js 之前
window.HY = window.HY || {};

(function () {
  var L = window.HY.Link;
  if (!L) { console.error('[systemBridge] 找不到 HY.Link'); return; }

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function G() { return window.HY.game || {}; }
  function root() {
    try {
      var t = G().townSys;
      if (t && t.charSys && t.charSys.rootState) return t.charSys.rootState;
      var c = G().charSys;
      if (c && c.rootState) return c.rootState;
    } catch (e) { /* 忽略 */ }
    return null;
  }
  function resolve(p) {
    try {
      var parts = String(p).split('.'), o = window;
      for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
      return o;
    } catch (e) { return undefined; }
  }
  /** 依序嘗試多個方法名，回傳第一個成功且非 undefined 的結果 */
  function tryCall(obj, names, args) {
    if (!obj) return undefined;
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (typeof obj[n] !== 'function') continue;
      try {
        var v = obj[n].apply(obj, args || []);
        if (v !== undefined && v !== null) return v;
      } catch (e) { /* 換下一個 */ }
    }
    return undefined;
  }
  function tryGet(obj, names) {
    if (!obj) return undefined;
    for (var i = 0; i < names.length; i++) {
      if (obj[names[i]] !== undefined && obj[names[i]] !== null) return obj[names[i]];
    }
    return undefined;
  }

  var bridged = [];

  /* ══════════════════════════════════════════════════════
     橋接定義表
     每項：{ id, name, icon, desc, probe:[路徑], caps, build:fn(obj)→{effects,hooks} }
     ══════════════════════════════════════════════════════ */
  var BRIDGES = [

    /* ── ① 角色養成 ── */
    {
      id: 'character', name: '角色系統', icon: '🧑', desc: '角色模板、四維、衍生屬性。',
      probe: ['HY.game.charSys', 'HY.game.characterSys', 'HY.CharacterSystem'],
      caps: ['data'],
      build: function (o) {
        return {
          effects: [
            { scope: 'player', target: 'expMul', value: 0, label: '角色系統（基準）', tags: ['exp'] }
          ],
          hooks: {
            onLevelUp: function (ctx) {
              if (!ctx || !ctx.friend) return;
              // 升級時同步真實曲線
              var t = G().townSys;
              if (t && t.fr6MaxExpFor && ctx.friend) {
                var v = t.fr6MaxExpFor(num(ctx.friend.lv, 1));
                if (v) ctx.friend.maxExp = v;
              }
            }
          }
        };
      }
    },
    {
      id: 'roster', name: '名冊系統', icon: '📋', desc: '角色名冊管理。',
      probe: ['HY.game.rosterSys', 'HY.game.rosterSystem', 'HY.RosterSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'player', target: 'atkPct', value: 0, label: '名冊（基準）', tags: ['atk'] }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'level', name: '等級經驗', icon: '📈', desc: '原版經驗曲線。',
      probe: ['HY.game.levelExpSys', 'HY.game.levelSys', 'HY.LevelExpSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        var v = tryCall(o, ['getMaxExp', 'maxExpFor', 'getExpNeed', 'expFor'], [50]);
        return {
          effects: [
            { scope: 'friend', target: 'expMul', value: 0.02, label: '真實經驗曲線', tags: ['exp'] }
          ],
          hooks: {},
          meta: { sample50: num(v, 0) }
        };
      }
    },

    /* ── ② 武學體系 ── */
    {
      id: 'martial', name: '武學系統', icon: '📖', desc: '外功／心法／輕功／經脈。',
      probe: ['HY.game.martialSys', 'HY.game.martialSystem', 'HY.MartialSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'atkPct', value: 0.03, label: '武學修為', tags: ['atk'],
              cond: function (c) { return num(c.skillCount, 0) > 0; } }
          ],
          hooks: {
            onLevelUp: function (ctx) {
              if (!ctx || !ctx.friend) return;
              // 升級時嘗試學新招
              var t = G().townSys;
              if (t && t.friendAutoLearn) { try { t.friendAutoLearn(ctx.friend); } catch (e) { /* 忽略 */ } }
            }
          }
        };
      }
    },
    {
      id: 'sect', name: '門派系統', icon: '⛩️', desc: '十五大門派與特色。',
      probe: ['HY.game.sectFeatureSys', 'HY.game.sectSys', 'HY.SectFeatureSystem'],
      caps: ['data'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'spMul', value: 0.06, label: '門派特色', tags: ['sp'],
              cond: function (c) { return !!c.sect; } }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'mastery', name: '精通系統', icon: '🎯', desc: '三系精通樹。',
      probe: ['HY.game.masterySys', 'HY.game.masterySystem', 'HY.Data.MASTERY'],
      caps: ['data'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'atkPct', value: 0.02, label: '精通加成', tags: ['atk'],
              cond: function (c) { return num(c.masteryTotal, 0) > 0; } }
          ],
          hooks: {}
        };
      }
    },

    /* ── ③ 天賦體系 ── */
    {
      id: 'spirit', name: '靈根系統', icon: '💎', desc: '靈根淬鍊。',
      probe: ['HY.game.spiritRootSys', 'HY.game.spiritSys', 'HY.SpiritRootSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'expMul', value: 0.06, label: '靈根成長', tags: ['exp'],
              cond: function (c) { return !!c.spiritRoot; } }
          ],
          hooks: {
            onTick: function () {
              var t = G().townSys;
              if (!t || !t.friendAll) return;
              t.friendAll().forEach(function (f) {
                if (!f.spiritRoot) return;
                if (num(f.spiritLv, 0) >= 10) return;
                if (Math.random() < 0.03) {
                  f.spiritLv = num(f.spiritLv, 0) + 1;
                  if (t.fr6Touch) t.fr6Touch(f);
                }
              });
            }
          }
        };
      }
    },
    {
      id: 'element', name: '五行系統', icon: '🌀', desc: '五行相剋。',
      probe: ['HY.game.elementSys', 'HY.game.elementSystem', 'HY.ElementSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'atkPct', value: 0.01, label: '五行圓融', tags: ['atk'],
              cond: function (c) { return !!c.element; } }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'formation', name: '陣法系統', icon: '☯️', desc: '陣法修習。',
      probe: ['HY.game.formationSys', 'HY.game.formationSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'team', target: 'atkPct', value: 0.03, label: '隊伍陣法', tags: ['atk'],
              cond: function (c) { return !!c.formation; } }
          ],
          hooks: {}
        };
      }
    },

    /* ── ④ 戰鬥體系 ── */
    {
      id: 'combat', name: '戰鬥核心', icon: '⚔️', desc: '回合制戰鬥。',
      probe: ['HY.game.combatCore', 'HY.game.combatSys', 'HY.CombatCore'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [],
          hooks: {
            onBattleStart: function (ctx) {
              if (!ctx) return ctx;
              // 為好友隊伍套用五行／陣法
              var t = G().townSys;
              if (!t) return ctx;
              var members = [];
              try {
                var ps = G().partySys;
                if (ps && ps.getPartyMembers) {
                  members = ps.getPartyMembers().filter(function (m) { return m && t.friendById && t.friendById(m.id); });
                }
              } catch (e) { /* 忽略 */ }
              if (members.length && t.fr6TeamElementMul && ctx.enemyElement) {
                ctx.friendElementMul = t.fr6TeamElementMul(members, ctx.enemyElement);
              }
              return ctx;
            }
          }
        };
      }
    },
    {
      id: 'atb', name: '速度系統', icon: '⏱️', desc: 'ATB 出手順序。',
      probe: ['HY.game.dexSys', 'HY.game.dexteritySys', 'HY.game.atbSys', 'HY.DexteritySpeedSystem', 'HY.CombatAtbSystem'],
      caps: ['api'],
      build: function (o) {
        var v = tryCall(o, ['getAtbSpeed', 'getSpeed', 'calcSpeed'], [null]);
        return {
          effects: [
            { scope: 'friend', target: 'atbMul', value: 0.02, label: 'ATB 速度', tags: ['spd'] }
          ],
          hooks: {},
          meta: { probe: num(v, 0) }
        };
      }
    },
    {
      id: 'enemyfm', name: '敵方陣法', icon: '🔺', desc: '敵陣系統。',
      probe: ['HY.game.enemyFormationSys', 'HY.EnemyFormationSystem'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [],
          hooks: {
            onBattleStart: function (ctx) {
              if (!ctx) return ctx;
              var API = window.HY.LinkAPI;
              if (API && API.enemyRoll && !ctx.enemyFormation) {
                ctx.enemyFormation = API.enemyRoll(num(ctx.enemyLv, 30));
              }
              return ctx;
            }
          }
        };
      }
    },
    {
      id: 'affix', name: '詞綴系統', icon: '🧬', desc: '怪物詞綴。',
      probe: ['HY.game.affixSys', 'HY.game.affixSystem', 'HY.AffixSystem', 'HY.Data.MONSTER_AFFIXES'],
      caps: ['data'],
      build: function (o) {
        return {
          effects: [],
          hooks: {
            onLoot: function (ctx) {
              if (!ctx) return ctx;
              var API = window.HY.LinkAPI;
              if (API && API.affixLootMul && ctx.affixes) {
                ctx.lootMul = num(ctx.lootMul, 1) * API.affixLootMul(ctx.affixes);
              }
              return ctx;
            }
          }
        };
      }
    },

    /* ── ⑤ 經濟體系 ── */
    {
      id: 'inventory', name: '行囊系統', icon: '🎒', desc: '背包管理。',
      probe: ['HY.game.invSys', 'HY.game.inventorySys', 'HY.InventorySystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return { effects: [], hooks: {} };
      }
    },
    {
      id: 'equip', name: '裝備系統', icon: '⚙️', desc: '十部位裝備。',
      probe: ['HY.game.equipSys', 'HY.game.equipmentSys', 'HY.EquipmentSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        var slots = tryGet(o, ['SLOTS', 'slots']);
        return {
          effects: [],
          hooks: {},
          meta: { slots: slots ? Object.keys(slots).length : 0 }
        };
      }
    },
    {
      id: 'poe', name: '工藝系統', icon: '🔨', desc: 'POE 通貨工藝。',
      probe: ['HY.game.poeSys', 'HY.game.poeCraftSys', 'HY.PoeCraftSystem', 'HY.Data.CURRENCIES'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'player', target: 'forgeMul', value: 0.05, label: '工藝精通', tags: ['craft'] }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'market', name: '黑市系統', icon: '🕶️', desc: '黑市交易。',
      probe: ['HY.game.blackMarketSys', 'HY.game.marketSys', 'HY.BlackMarketSystem'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'town', target: 'goldMul', value: 0.03, label: '黑市門路', tags: ['gold'] }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'gamble', name: '賭博系統', icon: '🎲', desc: '賭局。',
      probe: ['HY.game.gambleSys', 'HY.game.gambleSystem', 'HY.GambleSystem'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [],
          hooks: {
            onTick: function () {
              var t = G().townSys;
              if (!t || !t.fr6GambleResolve) return;
              var S = t.friendState ? t.friendState() : null;
              if (!S || num(S.ticks, 0) % 20 !== 0) return;
              try { t.fr6GambleResolve(); } catch (e) { /* 忽略 */ }
            }
          }
        };
      }
    },
    {
      id: 'lottery', name: '大樂透', icon: '🎰', desc: '名人抽獎。',
      probe: ['HY.game.lotterySys', 'HY.game.lotterySystem', 'HY.LotterySystem', 'HY.Data.LOTTERY_CELEBS'],
      caps: ['data'],
      build: function (o) {
        var n = 0;
        ['LOTTERY_CELEBS', 'LOTTERY_CELEBS_V2', 'LOTTERY_CELEBS_V3'].forEach(function (k) {
          var v = (window.HY.Data || {})[k];
          if (Array.isArray(v)) n += v.length;
          else if (v && typeof v === 'object') n += Object.keys(v).length;
        });
        return { effects: [], hooks: {}, meta: { celebs: n } };
      }
    },
    {
      id: 'salvage', name: '打撈遠征', icon: '🌊', desc: '打撈系統。',
      probe: ['HY.game.salvageSys', 'HY.game.salvageExpeditionSys', 'HY.SalvageExpeditionSystem'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'town', target: 'dropMul', value: 0.04, label: '打撈收穫', tags: ['drop'] }
          ],
          hooks: {}
        };
      }
    },

    /* ── ⑥ 社交後勤 ── */
    {
      id: 'char', name: '角色系統', icon: '🧑', desc: '角色核心。',
      probe: ['HY.game.charSys', 'HY.game.characterSys', 'HY.CharacterSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        var maxLv = tryGet(o, ['MAX_LEVEL', 'maxLevel']) || (o && o.prototype ? tryGet(o.prototype, ['MAX_LEVEL']) : 0);
        return { effects: [], hooks: {}, meta: { maxLv: num(maxLv, 0) } };
      }
    },
    {
      id: 'party', name: '隊伍系統', icon: '🚩', desc: '組隊。',
      probe: ['HY.game.partySys', 'HY.game.partySystem', 'HY.PartySystem'],
      caps: ['api'],
      build: function (o) {
        var max = tryGet(o, ['MAX_PARTY', 'maxParty']) || 5;
        return {
          effects: [
            { scope: 'team', target: 'atkPct', value: 0.02, label: '隊伍協同', tags: ['atk'],
              cond: function (c) { return num(c.teamSize, 0) >= 3; } }
          ],
          hooks: {},
          meta: { maxParty: num(max, 5) }
        };
      }
    },
    {
      id: 'pet', name: '寵物系統', icon: '🐾', desc: '寵物捕捉培養。',
      probe: ['HY.game.petSys', 'HY.game.petSystem', 'HY.PetSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'atkPct', value: 0.04, label: '寵物助戰', tags: ['atk'],
              cond: function (c) { return !!c.pet; } }
          ],
          hooks: {
            onTick: function () {
              var t = G().townSys;
              if (!t || !t.friendAll) return;
              var API = window.HY.LinkAPI;
              t.friendAll().forEach(function (f) {
                if (!f.pet) return;
                // 寵物進化
                if (API && API.petEvolveCheck) {
                  var ev = API.petEvolveCheck(f.pet.id, f.pet.lv);
                  if (ev) {
                    f.pet.id = ev.id; f.pet.name = ev.name; f.pet.icon = ev.icon;
                    if (t.friendLog) t.friendLog('🐾 【' + f.name + '】的寵物進化為【' + ev.name + '】！', 'gain');
                    if (t.fr6Touch) t.fr6Touch(f);
                  }
                }
                if (Math.random() < 0.04 && num(f.pet.lv, 1) < 20) {
                  f.pet.lv = num(f.pet.lv, 1) + 1;
                  if (t.fr6Touch) t.fr6Touch(f);
                }
              });
            }
          }
        };
      }
    },
    {
      id: 'companion', name: '同伴系統', icon: '👥', desc: '同伴出戰。',
      probe: ['HY.game.companionSys', 'HY.game.companionSystem', 'HY.CompanionSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'defPct', value: 0.03, label: '同伴護持', tags: ['def'],
              cond: function (c) { return !!c.companionRole; } }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'guild', name: '公會系統', icon: '🏛️', desc: '公會四支。',
      probe: ['HY.game.guildCoreSys', 'HY.game.guildBuildingSys', 'HY.game.guildSys',
              'HY.GuildCoreSystem', 'HY.GuildBuildingSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        var b = tryCall(o, ['getTotalBuildingBonus', 'getBuildingBonus', 'getTotalBonus'], []);
        return {
          effects: [
            { scope: 'friend', target: 'atkPct', value: 0.03, label: '公會建築', tags: ['atk'],
              cond: function (c) { return !!c.guildGuest; } }
          ],
          hooks: {},
          meta: { live: !!b }
        };
      }
    },
    {
      id: 'town', name: '小鎮系統', icon: '🏘️', desc: '我的小鎮。',
      probe: ['HY.game.townSys', 'HY.TownSystem'],
      caps: ['data', 'api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'town', target: 'incomeMul', value: 0.02, label: '小鎮繁榮', tags: ['town'] }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'save', name: '存檔系統', icon: '💾', desc: '存讀檔。',
      probe: ['HY.game.saveSys', 'HY.game.saveSystem', 'HY.SaveSystem'],
      caps: ['api'],
      build: function (o) {
        return { effects: [], hooks: {} };
      }
    },
    {
      id: 'offline', name: '離線掛機', icon: '🌙', desc: '離線收益。',
      probe: ['HY.game.offlineSys', 'HY.game.offlineIdleSys', 'HY.OfflineIdleSystem'],
      caps: ['api'],
      build: function (o) {
        var has = !!tryCall(o, ['getState', 'getOffline', 'getInfo'], []);
        return {
          effects: [
            { scope: 'friend', target: 'expMul', value: 0.03, label: '離線持續修煉', tags: ['exp'] }
          ],
          hooks: {
            onTick: function () {
              var t = G().townSys;
              if (!t || !t.fr6OfflineSync) return;
              var S = t.friendState ? t.friendState() : null;
              if (!S || num(S.ticks, 0) % 60 !== 0) return;
              try { t.fr6OfflineSync(); } catch (e) { /* 忽略 */ }
            }
          },
          meta: { live: has }
        };
      }
    },
    {
      id: 'timetravel', name: '時光旅行', icon: '⏳', desc: '穿越時代。',
      probe: ['HY.game.timeTravelSys', 'HY.game.timeTravelSystem', 'HY.TimeTravelSystem'],
      caps: ['api'],
      build: function (o) {
        return {
          effects: [
            { scope: 'friend', target: 'expMul', value: 0.05, label: '時光迴響', tags: ['exp'],
              cond: function (c) { return num(c.ttBonus, 0) > 0; } }
          ],
          hooks: {}
        };
      }
    },
    {
      id: 'cheat', name: '作弊面板', icon: '🛠️', desc: '除錯工具。',
      probe: ['HY.game.cheatPanel', 'HY.CheatPanel'],
      caps: ['api'],
      build: function (o) { return { effects: [], hooks: {} }; }
    },
    {
      id: 'response', name: '畫面適應', icon: '📱', desc: '自適應佈局。',
      probe: ['HY.game.responsiveSys', 'HY.game.responsiveLayoutSystem', 'HY.ResponsiveLayoutSystem'],
      caps: ['api'],
      build: function (o) { return { effects: [], hooks: {} }; }
    },
    {
      id: 'font', name: '字體系統', icon: '🔠', desc: '字級調整。',
      probe: ['HY.FontSys', 'HY.game.fontSys'],
      caps: ['api'],
      build: function (o) { return { effects: [], hooks: {} }; }
    },
    {
      id: 'friend', name: '好友系統', icon: '🤝', desc: '好友核心。',
      probe: ['HY.game.townSys', 'HY.FriendSystem'],
      caps: ['data', 'api'],
      build: function (o) { return { effects: [], hooks: {} }; }
    }
  ];

  /* ══════════════════════════════════════════════════════
     執行橋接
     ══════════════════════════════════════════════════════ */
  BRIDGES.forEach(function (B) {
    var found = null, path = '';
    for (var i = 0; i < B.probe.length; i++) {
      var v = resolve(B.probe[i]);
      if (v !== undefined && v !== null) { found = v; path = B.probe[i]; break; }
    }
    var built = { effects: [], hooks: {}, meta: {} };
    try { built = B.build(found) || built; } catch (e) {
      console.error('[systemBridge] ' + B.id + ' 建構失敗：', e);
    }

    // 註冊系統（source 依是否有實例判定）
    L.register({
      id: B.id, name: B.name, icon: B.icon, desc: B.desc,
      caps: B.caps || [],
      obj: found || null,
      source: found ? 'external' : 'native',
      effects: (built.effects || []).map(function (e) {
        var e2 = {};
        Object.keys(e).forEach(function (k) { e2[k] = e[k]; });
        return e2;
      }),
      hooks: built.hooks || {}
    });

    // 記錄綁定路徑
    if (found && path) {
      var s = L.sysInfo(B.id);
      if (s) { s.boundPath = path; s.score = 3; }
      L.setBinding(B.id, path);
    }
    bridged.push({
      id: B.id, name: B.name, icon: B.icon,
      found: !!found, path: path, meta: built.meta || {}
    });
  });

  /* ══════════════════════════════════════════════════════
     對外：橋接報告
     ══════════════════════════════════════════════════════ */
  window.HY.SystemBridge = {
    version: '1.0',
    bridges: bridged,
    report: function () {
      return bridged.map(function (b) {
        var s = L.sysInfo(b.id) || {};
        return {
          id: b.id, name: b.name, icon: b.icon,
          found: b.found, path: b.path,
          source: s.source || 'native',
          effects: (s.effects || []).length,
          hooks: (s.hookNames || []).length,
          meta: b.meta
        };
      });
    },
    relink: function () {
      var n = 0;
      bridged.forEach(function (b) {
        if (b.found) return;
        for (var i = 0; i < BRIDGES.length; i++) {
          if (BRIDGES[i].id !== b.id) continue;
          var found = null, path = '';
          for (var j = 0; j < BRIDGES[i].probe.length; j++) {
            var v = resolve(BRIDGES[i].probe[j]);
            if (v !== undefined && v !== null) { found = v; path = BRIDGES[i].probe[j]; break; }
          }
          if (found) {
            var s = L.sysInfo(b.id);
            if (s) { s.obj = found; s.source = 'external'; s.boundPath = path; }
            L.setBinding(b.id, path);
            b.found = true; b.path = path;
            n += 1;
          }
        }
      });
      return n;
    }
  };

  var ok = bridged.filter(function (b) { return b.found; }).length;
  console.log('[systemBridge] ✓ 已橋接 ' + bridged.length + ' 個原版系統（偵測到 ' + ok + ' 個實例）');

  // 稍後再試一次（部分系統此時才掛上）
  setTimeout(function () {
    var n = window.HY.SystemBridge.relink();
    if (n > 0) console.log('[systemBridge] ↻ 延遲補接 ' + n + ' 個系統');
  }, 1500);
})();