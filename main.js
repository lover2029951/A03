// js/main.js (v32)
// GameApp：系統實例化、初始化、事件綁定、定時器
//
// v32：接入「我的小鎮」
//   ⭐ 建構子新增 townSys / uiTown
//   ⭐ ensureAllSharedState() 納入 townSys.ensureState()
//   ⭐ renderAll() 末尾呼叫 uiTown.renderTownTab()
// v31 修正（配合作弊面板）：
//   ⭐ 計時器改為可重建：startTimers() / 供 onConfigReapplied 呼叫
//   → autoSaveIntervalMs、guildHarvestIntervalMs 可即時調整
//   ⭐ 幫會自動事件讀 guild.autoEventGivesRewards
//   ⭐ v30：自動存檔靜默、bindCfg 無效輸入保留原值
window.HY = window.HY || {};

(function () {
  class GameApp {
    constructor() {
      this.logger = new window.HY.Logger('game-log', 'loot-log', 'wealth-log');
      if (window.HY.UILogPanels) {
        this.logPanelsUI = new window.HY.UILogPanels(this.logger);
      }

      this.charSys = new window.HY.CharacterSystem(this.logger);
      this.rosterSys = new window.HY.RosterSystem(this.charSys, this.logger);
      this.partySys = new window.HY.PartySystem(this.charSys, this.rosterSys, this.logger);

      this.martialSys = new window.HY.MartialSystem(this.charSys, this.logger);
      this.inventorySys = new window.HY.InventorySystem(this.charSys, this.logger);
      this.equipSys = new window.HY.EquipmentSystem(this.charSys, this.inventorySys, this.logger);
      this.poeSys = new window.HY.PoeCraftSystem(this.charSys, this.logger);
      this.marketSys = new window.HY.BlackMarketSystem(this.charSys, this.inventorySys, this.logger);
      this.petSys = new window.HY.PetSystem(this.charSys, this.logger);
      this.companionSys = new window.HY.CompanionSystem(this.charSys, this.logger);
      this.affixSys = new window.HY.AffixSystem(this.charSys, this.logger);

      this.guildCore = new window.HY.GuildCoreSystem(this.charSys, this.logger);
      this.guildBuilding = new window.HY.GuildBuildingSystem(this.charSys, this.guildCore, this.inventorySys, this.logger);
      this.guildSkillBeast = new window.HY.GuildSkillBeastSystem(this.charSys, this.guildCore, this.logger);
      this.guildRealmEvent = new window.HY.GuildRealmEventSystem(this.charSys, this.guildCore, this.logger);

      this.uiCharParty = new window.HY.UICharacterParty(this);
      this.uiCombatExplore = new window.HY.UICombatExplore(this);
      this.uiMartialSect = new window.HY.UIMartialSect(this);
      this.uiEquipMarket = new window.HY.UIEquipMarket(this);
      this.uiCompPet = new window.HY.UICompanionPet(this);
      this.uiGuild = new window.HY.UIGuild(this);

      // ⭐ 我的小鎮
      this.townSys = new window.HY.TownSystem(
        this.charSys,
        this.inventorySys,
        this.logger,
        () => this.renderAll()
      );
      this.uiTown = new window.HY.UITown(this);

      this.combatSys = new window.HY.CombatSystem(
        this.charSys,
        this.martialSys,
        this.inventorySys,
        this.companionSys,
        this.logger,
        () => this.renderAll()
      );
      this.timeSys = new window.HY.TimeTravelSystem(this.charSys, this.combatSys, this.logger);
      this.saveSys = new window.HY.SaveSystem(this.charSys, this.logger);

      // ⭐ v31：計時器把手
      this._timers = { guild: null, save: null };
    }

    // ⭐ GameConfig 重套後由 gameConfig 呼叫
    onConfigReapplied() {
      this.startTimers();
      if (this.atbSys && typeof this.atbSys.refreshFromConfig === 'function') {
        this.atbSys.refreshFromConfig();
      }
    }

    ensureAllSharedState() {
      this.rosterSys.ensureState();
      this.partySys.ensureState();
      this.equipSys.ensureState();
      this.poeSys.ensureState();
      this.marketSys.ensureState();
      this.petSys.ensureState();
      this.companionSys.ensureState();
      this.martialSys.ensureState();
      this.guildCore.ensureState();
      this.townSys.ensureState();

      var root = this.charSys.rootState;
      if (root.spiritStones === undefined) root.spiritStones = 20;
      if (!root.petExpeditions) root.petExpeditions = {};
      if (!Array.isArray(root.equipBag)) root.equipBag = [];
      (root.roster || []).forEach(function (c) {
        if (!c.activeBuffs) c.activeBuffs = {};
      });
    }

    // ⭐ v31：可重複呼叫的計時器啟動
    startTimers() {
      var G = window.HY && window.HY.GameConfig;
      var cfgData = (window.HY.Data && window.HY.Data.CONFIG) || {};

      var harvestMs = (G && G.ui && typeof G.ui.guildHarvestIntervalMs === 'number')
        ? G.ui.guildHarvestIntervalMs : 15000;
      var autoSaveMs = (G && G.ui && typeof G.ui.autoSaveIntervalMs === 'number')
        ? G.ui.autoSaveIntervalMs
        : (cfgData.AUTO_SAVE_INTERVAL || 30000);

      if (this._timers.guild) clearInterval(this._timers.guild);
      this._timers.guild = setInterval(() => {
        if (this.guildBuilding.harvestAllBuildings(false)) {
          var chance = (G && G.guild && typeof G.guild.autoEventChance === 'number')
            ? G.guild.autoEventChance : 0.25;
          if (Math.random() < chance) {
            // ⭐ 依設定決定是否給資源
            var giveRewards = !!(G && G.guild && G.guild.autoEventGivesRewards);
            if (giveRewards) {
              this.guildRealmEvent.triggerRandomGuildEvent();      // 全額獎勵
            } else {
              this.guildRealmEvent.triggerRandomGuildEvent(true);  // 純氛圍
            }
          }
          this.renderAll();
        }
      }, harvestMs);

      if (this._timers.save) clearInterval(this._timers.save);
      this._timers.save = setInterval(() => this.saveSys.save(true), autoSaveMs);
    }

    init() {
      const cfgData = (window.HY.Data && window.HY.Data.CONFIG) || {};
      const hasSave = this.saveSys.load();

      this.ensureAllSharedState();

      if (!hasSave) {
        this.logger.add(cfgData.WELCOME_MSG || '⚡ 歡迎來到《黃易群俠傳 Web》！', 'time');
      }

      this.bindStaticEvents();
      this.renderAll();
      this.startTimers();
    }

    renderAll() {
      this.charSys.syncActivePointer();
      this.equipSys.ensureState();
      this.poeSys.ensureState();
      this.martialSys.ensureState();
      this.guildCore.ensureState();

      this.uiCharParty.renderCharacterPanel();
      this.uiCharParty.renderPartyAndRosterTab();
      this.uiCombatExplore.renderAutoTacticsSelects();
      this.uiCombatExplore.renderExploreAndCombat();
      this.uiMartialSect.renderMartialTab();
      this.uiMartialSect.renderSectTab();
      this.uiEquipMarket.renderInventoryTab();
      this.uiEquipMarket.renderBlackMarketTab();
      this.uiCompPet.renderCompanionTab();
      this.uiCompPet.renderPetTab();
      this.uiGuild.renderGuildTab(); // 內部會自行判斷分頁是否可見
      if (this.uiTown) this.uiTown.renderTownTab();
    }

    bindStaticEvents() {
      const cfgData = (window.HY.Data && window.HY.Data.CONFIG) || {};

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          const targetTab = document.getElementById(btn.dataset.tab);
          if (targetTab) targetTab.classList.add('active');

          if (btn.dataset.tab === 'tab-guild' && this.uiGuild) {
            this.uiGuild.renderGuildTab(true);
          }
        });
      });

      document.querySelectorAll('.sub-martial-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.sub-martial-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.sub-martial-panel').forEach(p => p.classList.add('hidden'));
          btn.classList.add('active');
          const targetSub = document.getElementById(btn.dataset.sub);
          if (targetSub) targetSub.classList.remove('hidden');
        });
      });

      // 外功門派分類（fallback；levelExpSystem 會把它換成動態版本）
      document.querySelectorAll('.m-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.m-cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.martialSys.categoryFilter = btn.dataset.mcat;
          this.uiMartialSect.renderMartialTab();
        });
      });

      const btnSellAllEq = document.getElementById('btn-sell-all-equip');
      if (btnSellAllEq) {
        btnSellAllEq.addEventListener('click', () => {
          if (this.inventorySys.sellAllUnwornEquip()) this.renderAll();
        });
      }

      const autoCfg = this.combatSys.autoConfig;
      const bindCfg = (id, key, isNum) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', (e) => {
          if (isNum) {
            var parsed = parseInt(e.target.value, 10);
            if (isNaN(parsed)) return; // 無效輸入保留原值
            autoCfg[key] = parsed;
          } else {
            autoCfg[key] = e.target.value;
          }
          this.logger.add('⚙️ 內掛戰術設定已更新！', 'time');
        });
      };
      bindCfg('cfg-hp-pct', 'hpThreshold', true);
      bindCfg('cfg-hp-item', 'hpItemId', false);
      bindCfg('cfg-mp-pct', 'mpThreshold', true);
      bindCfg('cfg-mp-item', 'mpItemId', false);
      bindCfg('cfg-emerg-pct', 'lowHpSkillRule', true);
      bindCfg('cfg-emerg-skill', 'emergencySkillId', false);
      bindCfg('cfg-aoe-skill', 'aoeSkillId', false);
      bindCfg('cfg-primary-skill', 'primarySkillId', false);

      const btnCreateChar = document.getElementById('btn-create-char');
      if (btnCreateChar) {
        btnCreateChar.addEventListener('click', () => {
          const inp = document.getElementById('inp-new-char-name');
          if (this.rosterSys.createNewCharacter(inp ? inp.value : '')) {
            if (inp) inp.value = '';
            this.renderAll();
          }
        });
      }
      const btnDeployAll = document.getElementById('btn-deploy-all');
      if (btnDeployAll) {
        btnDeployAll.addEventListener('click', () => {
          if (this.partySys.deployAll()) this.renderAll();
        });
      }

      const btnRefresh = document.getElementById('btn-refresh-market');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          if (this.marketSys.refreshSpecialDeals()) this.renderAll();
        });
      }
      const btnMystery = document.getElementById('btn-mystery-box');
      if (btnMystery) {
        btnMystery.addEventListener('click', () => {
          if (this.marketSys.openMysteryBox()) this.renderAll();
        });
      }

      document.querySelectorAll('.point-btns button').forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.charSys.allocatePoint(btn.dataset.stat)) this.renderAll();
        });
      });

      const btnAuto = document.getElementById('btn-toggle-auto');
      if (btnAuto) {
        btnAuto.addEventListener('click', () => {
          this.combatSys.toggleAutoBattle();
        });
      }
      const chkRepeat = document.getElementById('chk-auto-repeat');
      if (chkRepeat) {
        chkRepeat.addEventListener('change', (e) => {
          this.combatSys.autoRepeat = e.target.checked;
          if (this.combatSys.autoRepeat) {
            this.logger.add('🔄 已勾選「戰勝自動連刷」（需配合開啟自動戰鬥）。', 'time');
          }
        });
      }
      const btnHeal = document.getElementById('btn-heal-pill');
      if (btnHeal) {
        btnHeal.addEventListener('click', () => {
          if (this.inventorySys.useOrEquipItem('pill_hp')) this.renderAll();
        });
      }
      const btnFlee = document.getElementById('btn-flee');
      if (btnFlee) {
        btnFlee.addEventListener('click', () => {
          this.combatSys.flee();
        });
      }

      const btnSave = document.getElementById('btn-save');
      if (btnSave) {
        btnSave.addEventListener('click', () => this.saveSys.save());
      }

      const btnReset = document.getElementById('btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (confirm(cfgData.RESET_CONFIRM_MSG || '確定要重啟時空嗎？')) {
            this.combatSys.toggleAutoBattle(false);
            this.combatSys.clearBattleState();
            this.saveSys.reset();

            this.ensureAllSharedState();

            this.marketSys.generateSpecialDeals();
            this.poeSys.selectedTargetUid = null;

            (this.charSys.rootState.roster || []).forEach(function (c) { c.atb = 0; });
            (this.combatSys.enemies || []).forEach(function (e) { e.atb = 0; });

            this.renderAll();
            this.logger.add('🔄 時空重啟完成，所有角色、裝備、靈石與丹藥狀態均已重置。', 'time');
          }
        });
      }
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    const game = new GameApp();
    window.HY.game = game;
    game.init();
  });
})();