// js/loadOrder.js (v88)
// ⭐ v88：擴充標籤排版修正（1 支新檔）
//        + uiTabFix.js（修正擴充按鈕的「寬條／順序錯亂／高度不齊」）
//          必須排在「所有會插按鈕的 UI 檔」之後、main.js 之前
// ⭐ v87：行囊大修（uiBagOverhaul.js）
// ⭐ v86：樂透守門改版 ＋ 隊伍面板清理
//        + lotteryNoTicketFix.js（沒有購買彩券時不彈開獎視窗）
//        + partyPanelCleanup.js（移除隊伍面板下方「主控心法／隨行護法／隨行靈獸」三列）
//        - lotteryBridge.js 已移除（class 方法 non-enumerable，舊版無效）
// ⭐ v85：離線收益 ＋ 樂透守門 ＋ 連動標籤搬家 ＋ 總統名人
// ⭐ v80：系統橋接與連動整合（systemBridge.js）
// ⭐ v79：統一連動匯流排（linkBus / linkContent / linkSystems）
// ⭐ v78：跨系統連動（friendLinkData / friendLinkSystem / uiFriend6）
// ⭐ v77：好友面板補強（uiFriend5）
// ⭐ v76：資源統一 ＋ 遊戲字體系統
// ⭐ v75：好友系統 v4
// ⭐ v74：好友系統 v3
// ⭐ v73：好友系統 v2
// ⭐ v72：江湖好友系統
// ⭐ v71：名人深造與社交
// ⭐ v70：小鎮彈出視窗化
// ⭐ v69：名人遊歷小鎮
// ⭐ v68：冒險者深造
// ⭐ v67：冒險者公會
// ⭐ v66：我的小鎮 v2.2
// ⭐ v65：我的小鎮 v2
// ⭐ v64：接入「我的小鎮」
// ⭐ v62：接入大樂透
// ⭐ v61：gameConfig 拆分為 5 支子檔
window.HY_LOAD_CONFIG = {
  version: '88',
  basePath: './js/',
  abortOnMissing: true,

  files: [
    // ⭐ gameConfig 5 支（必須連續排在最前）
    'gameConfig.js',
    'gameConfigSpeed.js',
    'gameConfigApply.js',
    'gameConfigApply2.js',
    'gameConfigBoot.js',

    // ⭐ 統一連動匯流排（必須在「所有系統檔」之前）
    'linkBus.js',
    'linkContent.js',
    'linkSystems.js',
    'systemBridge.js',

    // ── 資料層 ──
    'uiConfigData.js',
    'elementData.js',
    'formationData.js',
    'mapData.js',
    'sectData.js',
    'externalArtsData.js',
    'xinfaData.js',
    'qinggongData.js',
    'masteryData.js',
    'meridianData.js',
    'spiritRootData.js',
    'equipmentData.js',
    'companionData.js',
    'petData.js',
    'partyData.js',
    'affixData.js',
    'poeCraftData.js',
    'guildData.js',
    'townData.js',
    'friendData.js',
    'friendData2.js',
    'friendData3.js',
    'friendData4.js',
    'friendLinkData.js',
    'lotteryCelebData.js',
    'lotteryCelebData2.js',
    'lotteryCelebData3.js',
    'lotteryCelebData4.js',

    // ── 核心系統層 ──
    'saveSystem.js',
    'characterSystem.js',
    'rosterSystem.js',
    'partySystem.js',
    'martialSystem.js',
    'inventorySystem.js',
    'equipmentSystem.js',
    'poeCraftSystem.js',
    'blackMarketSystem.js',
    'petSystem.js',
    'companionSystem.js',
    'affixSystem.js',
    'guildCoreSystem.js',
    'guildBuildingSystem.js',
    'guildSkillBeastSystem.js',
    'guildRealmEventSystem.js',
    'sectFeatureSystem.js',
    // ⭐ 我的小鎮核心（順序不可調換）
    'townSystem.js',
    'townExtra.js',
    'townGuildSystem.js',
    'townGuildAdvance.js',
    'townCelebSystem.js',
    'townCelebAdvance.js',
    // ⭐ 好友系統（順序不可調換）
    'friendSystem.js',
    'friendCelebSystem.js',
    'friendHostileSystem.js',
    'friendPartySystem.js',
    'friendEventSystem.js',
    'friendSocialSystem.js',
    'friendHomeSystem.js',
    'friendAuctionSystem.js',
    'friendWorldBossSystem.js',
    'friendExtraSystem.js',
    'friendLinkSystem.js',
    'friendRankSystem.js',
    'friendUnifySystem.js',
    'offlineBridge.js',

    // ── 戰鬥 ──
    'combatAutoTactics.js',
    'combatPlayerTurn.js',
    'combatEnemyTurn.js',
    'combatCore.js',
    'timeTravelSystem.js',

    // ── UI 層（順序不可調換）──
    'uiCharacterParty.js',
    'uiCombatExplore.js',
    'uiMartialSect.js',
    'uiEquipMarket.js',
    'uiBagOverhaul.js',
    'uiCompanionPet.js',
    'uiLogPanels.js',
    'uiGuild.js',
    'uiTown.js',
    'uiTownGuild.js',
    'uiTownGuildAdvance.js',
    'uiTownCeleb.js',
    'uiTownCelebAdvance.js',
    'uiTownOverlays.js',
    'uiFriend.js',
    'uiFriend2.js',
    'uiFriend3.js',
    'uiFriend4.js',
    'uiFriend5.js',
    'uiFriend6.js',
    'fontSystem.js',
    'uiFontPanel.js',
    'partyPanelCleanup.js',
    'uiTabFix.js',                // ← v88 新增（擴充標籤排版修正；必須最後）
    'main.js',

    // ── 後置系統 ──
    'dexteritySpeedSystem.js',
    'combatAtbSystem.js',
    'uiDexAtb.js',
    'spiritRootSystem.js',
    'uiSpiritRoot.js',
    'enemyFormationSystem.js',
    'salvageExpeditionSystem.js',
    'uiSalvageExpedition.js',
    'uiInventorySorter.js',
    'offlineIdleSystem.js',
    'levelExpSystem.js',
    'elementSystem.js',
    'responsiveLayoutSystem.js',
    'cheatPanel.js',
    'gambleSystem.js',
    'lotterySystem.js',
    'uiLottery.js',
    'lotteryNoTicketFix.js'
  ],

  globals: {
    'gameConfig.js': 'HY.GameConfig',
    'gameConfigSpeed.js': 'HY.GameConfig.__speedLoaded',
    'gameConfigApply.js': 'HY.GameConfig.__applyLoaded',
    'gameConfigApply2.js': 'HY.GameConfig.__apply2Loaded',
    'gameConfigBoot.js': 'HY.GameConfig.__bootLoaded',

    'linkBus.js': 'HY.Link',
    'linkContent.js': 'HY.LinkContent',
    'linkSystems.js': 'HY.LinkAPI',
    'systemBridge.js': 'HY.SystemBridge',

    'uiConfigData.js': 'HY.Data.CONFIG',
    'elementData.js': 'HY.Data.ELEMENTS',
    'formationData.js': 'HY.Data.XIANXIA_FORMATIONS',
    'mapData.js': 'HY.Data.MAPS',
    'sectData.js': 'HY.Data.SECTS',
    'externalArtsData.js': 'HY.Data.MARTIAL_ARTS',
    'xinfaData.js': 'HY.Data.XINFA',
    'qinggongData.js': 'HY.Data.QINGGONG',
    'masteryData.js': 'HY.Data.MASTERY',
    'meridianData.js': 'HY.Data.MERIDIANS',
    'spiritRootData.js': 'HY.Data.SPIRIT_ROOTS',
    'equipmentData.js': 'HY.Data.ITEMS',
    'companionData.js': 'HY.Data.COMPANIONS',
    'petData.js': 'HY.Data.PETS',
    'partyData.js': 'HY.Data.PRESET_NAMES',
    'affixData.js': 'HY.Data.MONSTER_AFFIXES',
    'poeCraftData.js': 'HY.Data.CURRENCIES',
    'guildData.js': 'HY.Data.GUILD_BUILDINGS',
    'townData.js': 'HY.Data.TOWN',
    'friendData.js': 'HY.Data.TOWN.FRIEND',
    'friendData2.js': 'HY.FriendData2',
    'friendData3.js': 'HY.FriendData3',
    'friendData4.js': 'HY.FriendData4',
    'friendLinkData.js': 'HY.FriendLinkData',
    'lotteryCelebData.js': 'HY.Data.LOTTERY_CELEBS',
    'lotteryCelebData2.js': 'HY.Data.LOTTERY_CELEBS_V2',
    'lotteryCelebData3.js': 'HY.Data.LOTTERY_CELEBS_V3',
    'lotteryCelebData4.js': 'HY.CelebPresidents',

    'saveSystem.js': 'HY.SaveSystem',
    'characterSystem.js': 'HY.CharacterSystem',
    'rosterSystem.js': 'HY.RosterSystem',
    'partySystem.js': 'HY.PartySystem',
    'martialSystem.js': 'HY.MartialSystem',
    'inventorySystem.js': 'HY.InventorySystem',
    'equipmentSystem.js': 'HY.EquipmentSystem',
    'poeCraftSystem.js': 'HY.PoeCraftSystem',
    'blackMarketSystem.js': 'HY.BlackMarketSystem',
    'petSystem.js': 'HY.PetSystem',
    'companionSystem.js': 'HY.CompanionSystem',
    'affixSystem.js': 'HY.AffixSystem',
    'guildCoreSystem.js': 'HY.GuildCoreSystem',
    'guildBuildingSystem.js': 'HY.GuildBuildingSystem',
    'guildSkillBeastSystem.js': 'HY.GuildSkillBeastSystem',
    'guildRealmEventSystem.js': 'HY.GuildRealmEventSystem',
    'sectFeatureSystem.js': 'HY.SectFeatureSystem',
    'townSystem.js': 'HY.TownSystem',
    'townExtra.js': 'HY.TownExtra',
    'townGuildSystem.js': 'HY.TownGuild',
    'townGuildAdvance.js': 'HY.TownGuildAdv',
    'townCelebSystem.js': 'HY.TownCeleb',
    'townCelebAdvance.js': 'HY.TownCelebAdv',
    'friendSystem.js': 'HY.FriendSystem',
    'friendCelebSystem.js': 'HY.FriendCeleb',
    'friendHostileSystem.js': 'HY.FriendHostile',
    'friendPartySystem.js': 'HY.FriendParty',
    'friendEventSystem.js': 'HY.FriendEvent',
    'friendSocialSystem.js': 'HY.FriendSocial',
    'friendHomeSystem.js': 'HY.FriendHome',
    'friendAuctionSystem.js': 'HY.FriendAuction',
    'friendWorldBossSystem.js': 'HY.FriendWorldBoss',
    'friendExtraSystem.js': 'HY.FriendExtra',
    'friendLinkSystem.js': 'HY.FriendLink',
    'friendRankSystem.js': 'HY.FriendRank',
    'friendUnifySystem.js': 'HY.FriendUnify',
    'offlineBridge.js': 'HY.OfflineBridge',

    'combatAutoTactics.js': 'HY.CombatAutoTactics',
    'combatPlayerTurn.js': 'HY.CombatPlayerTurn',
    'combatEnemyTurn.js': 'HY.CombatEnemyTurn',
    'combatCore.js': 'HY.CombatCore',
    'timeTravelSystem.js': 'HY.TimeTravelSystem',

    'uiCharacterParty.js': 'HY.UICharacterParty',
    'uiCombatExplore.js': 'HY.UICombatExplore',
    'uiMartialSect.js': 'HY.UIMartialSect',
    'uiEquipMarket.js': 'HY.UIEquipMarket',
    'uiBagOverhaul.js': 'HY.BagOverhaul',
    'uiCompanionPet.js': 'HY.UICompanionPet',
    'uiLogPanels.js': 'HY.UILogPanels',
    'uiGuild.js': 'HY.UIGuild',
    'uiTown.js': 'HY.UITown',
    'uiTownGuild.js': 'HY.UITownGuild',
    'uiTownGuildAdvance.js': 'HY.UITownGuildAdv',
    'uiTownCeleb.js': 'HY.UITownCeleb',
    'uiTownCelebAdvance.js': 'HY.UITownCelebAdv',
    'uiTownOverlays.js': 'HY.UITownOverlays',
    'uiFriend.js': 'HY.UIFriend',
    'uiFriend2.js': 'HY.UIFriend2',
    'uiFriend3.js': 'HY.UIFriend3',
    'uiFriend4.js': 'HY.UIFriend4',
    'uiFriend5.js': 'HY.UIFriend5',
    'uiFriend6.js': 'HY.UIFriend6',
    'fontSystem.js': 'HY.FontSys',
    'uiFontPanel.js': 'HY.UIFont',
    'partyPanelCleanup.js': 'HY.PartyPanelCleanup',
    'uiTabFix.js': 'HY.TabFix',                    // ← v88 新增

    'dexteritySpeedSystem.js': 'HY.DexteritySpeedSystem',
    'combatAtbSystem.js': 'HY.CombatAtbSystem',
    'uiDexAtb.js': 'HY.UIDexAtb',
    'spiritRootSystem.js': 'HY.SpiritRootSystem',
    'uiSpiritRoot.js': 'HY.UISpiritRoot',
    'enemyFormationSystem.js': 'HY.EnemyFormationSystem',
    'salvageExpeditionSystem.js': 'HY.SalvageExpeditionSystem',
    'uiSalvageExpedition.js': 'HY.UISalvageExpedition',
    'uiInventorySorter.js': 'HY.UIInventorySorter',
    'offlineIdleSystem.js': 'HY.OfflineIdleSystem',
    'levelExpSystem.js': 'HY.LevelExpSystem',
    'elementSystem.js': 'HY.ElementSystem',
    'responsiveLayoutSystem.js': 'HY.ResponsiveLayoutSystem',
    'cheatPanel.js': 'HY.CheatPanel',
    'gambleSystem.js': 'HY.GambleSystem',
    'lotterySystem.js': 'HY.LotterySystem',
    'uiLottery.js': 'HY.UILottery',
    'lotteryNoTicketFix.js': 'HY.LotteryNoTicketFix'
  }
};