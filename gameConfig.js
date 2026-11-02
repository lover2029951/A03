// js/gameConfig.js  (v3.3 · 1/5)
// ═══════════════════════════════════════════════════════════════════════
//  黃易群俠傳 Web ｜ 遊戲總調節檔 — 【資料本體】
//
//  ⚠️ 本檔必須是 loadOrder.files 的第一支。
//  ⚠️ 本檔只放「設定資料」，不含邏輯。邏輯在另外 4 支子檔：
//       gameConfigSpeed.js    ← 速度引擎
//       gameConfigApply.js    ← 套用器 A
//       gameConfigApply2.js   ← 套用器 B + API
//       gameConfigBoot.js     ← 啟動編排
//
//  【標記說明】
//    ⚡ 即時生效   改完立即套用（作弊面板自動處理）
//    ✖ 未接線     程式碼沒有讀取點，改了沒有效果
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var CFG = {

        version: 'v3.3',

        // ═══════════════════════════════════════════════════════════════
        // ① ⚡ 遊戲速度
        // ═══════════════════════════════════════════════════════════════
        speed: {
            enabled: true,          // 是否啟用速度控制
            global: 1.0,            // 總開關倍率（1.0=原速 / 2.0=兩倍 / 5.0=五倍）
            intervalScale: 1.0,     // 重複計時器額外倍率（ATB、探險、徵收、存檔）
            timeoutScale: 1.0,      // 單次延遲額外倍率（連刷等待）
            bootGuardMs: 800,       // 開機保護期（此期間 setTimeout 不縮放）
            enableHotkeys: true,    // [ 減速 ] 加速 \ 重置
            hotkeyStep: 0.5,        // 快捷鍵加減幅度
            minMult: 0.1,           // 倍率下限
            maxMult: 20             // 倍率上限
        },

        // ═══════════════════════════════════════════════════════════════
        // ② 💰 收益倍率（全部即時生效）
        // ═══════════════════════════════════════════════════════════════
        multipliers: {
            expGain: 1.0,                    // 經驗獲得倍率
            spGain: 1.0,                     // 武點獲得倍率
            goldGain: 1.0,                   // 紋銀獲得倍率
            equipDropRate: 1.0,              // 裝備掉落倍率（小數用機率判定）
            currencyDropRate: 1.0,           // PoE 通貨掉落倍率

            playerAtk:     1.0,              // 玩家攻擊力
            playerDef:     1.0,              // 玩家防禦力
            playerMaxHp:   1.0,              // 玩家氣血上限
            playerMaxMp:   1.0,              // 玩家內力上限
            playerAtkSpd:  1.0,              // 玩家出手攻速（影響 ATB）
            playerCrit:    1.0,              // 玩家會心爆擊率
            playerCritRes: 1.0,              // 玩家暴擊抵抗

            enemyAtk:     1.0,               // 敵人攻擊力
            enemyDef:     1.0,               // 敵人防禦力
            enemyMaxHp:   1.0,               // 敵人氣血上限（會等比例換算現有血量）
            enemyAtkSpd:  1.0,               // 敵人出手攻速
            enemyCrit:    1.0,               // 敵人會心爆擊率
            enemyCritRes: 1.0                // 敵人暴擊抵抗
        },

        // ═══════════════════════════════════════════════════════════════
        // ③ ⚔️ 戰鬥核心
        // ═══════════════════════════════════════════════════════════════
        combat: {
            enemyCritResScale: 0.4,          // ✖ 未接線：敵人暴抗軟化係數
            rewardExpDivisor:  5,            // ⚡ 經驗除數（越小給越多）
            rewardSpDivisor:   10,           // ⚡ 武點除數
            rewardGoldDivisor: 10,           // ⚡ 紋銀除數

            enemyMpBase: 80,                 // ✖ 敵人內力基礎值
            enemyMpLvCoef: 25,               // ✖ 敵人內力等級係數
            enemyMpAtkCoef: 0.15,            // ✖ 敵人內力攻擊係數
            enemyMpRegenRatio: 0.04,         // ✖ 敵人內力回復比例

            playerHitCap: 95,                // ✖ 玩家命中上限 %
            playerHitFloorBase: 25,          // ✖ 玩家命中保底 %
            playerHitFloorWithRT: 35,        // ✖ 玩家命中保底（必中祝福）%
            playerHitFloorWithRTCap: 75,     // ✖ 必中祝福保底上限 %
            playerCritCap: 88,               // ✖ 玩家暴擊上限 %
            playerCritFloor: 1,              // ✖ 玩家暴擊保底 %

            enemyHitCap: 95,                 // ✖ 敵人命中上限 %
            enemyHitFloor: 20,               // ✖ 敵人命中保底 %
            enemyCritCap: 75,                // ✖ 敵人暴擊上限 %
            enemyCritFloor: 5,               // ✖ 敵人暴擊保底 %
            enemyCritMult: 1.55,             // ✖ 敵人暴擊傷害倍率

            playerDefFactor: 0.6,            // ✖ 玩家攻擊破防係數
            enemyDefFactorNormal: 0.7,       // ✖ 敵普攻破防係數
            enemyDefFactorPierce: 0.4,       // ✖ 敵破甲破防係數（越低越痛）
            aoeDamageMult: 0.85,             // ✖ 群攻傷害係數
            damageVarianceMin: 0.95,         // ✖ 傷害浮動下限
            damageVarianceMax: 1.05,         // ✖ 傷害浮動上限
            minDamage: 5,                    // ✖ 玩家最低傷害

            pillCooldownMs: 2000,            // ⚡ 自動服藥冷卻（ms）
            pillMinEffectPct: 2,             // ✖ 藥效提示門檻 %

            atbTickMs: 100,                  // ⚡ ATB 檢查頻率（ms）
            atbPlayerGainCoef: 0.055,        // ⚡ 玩家集氣係數
            atbEnemyGainCoef: 0.052,         // ⚡ 敵人集氣係數
            atbPlayerInitMax: 35,            // ⚡ 玩家開場集氣上限
            atbPlayerInitDexCoef: 0.25,      // ⚡ 玩家開場集氣 dex 係數
            atbEnemyInitMax: 30,             // ⚡ 敵人開場集氣上限
            atbEnemyInitBase: 10,            // ⚡ 敵人開場集氣基礎
            atbEnemyInitRand: 15,            // ⚡ 敵人開場集氣隨機量


        },

        // ═══════════════════════════════════════════════════════════════
        // ④ 📈 成長曲線
        // ═══════════════════════════════════════════════════════════════
        growth: {
            maxLevel: 300,                   // ⚡ 等級上限
            rewardRate: 0.085,               // ⚡ 戰利品折算率
            pointsPerLevel: 5,               // ✖ 每級潛能點

            levelExpBaseCoef: 40,            // ✖ 升級經驗：基礎係數
            levelExpPow: 1.8,                // ✖ 升級經驗：次方
            levelExpLinearCoef: 60,          // ✖ 升級經驗：線性係數
            levelExpTierBase: 1.55,          // ✖ 大境界倍率
            levelExpTierSize: 30,            // ✖ 大境界級距
            levelExpMin: 80,                 // ✖ 升級經驗下限

            levelGapThreshold: 5,            // ✖ 等級差懲罰門檻
            levelGapPenaltyMult: 0.30,       // ✖ 等級差經驗倍率

            costConHpPerPoint: 15,           // ✖ 加體魄回血
            costIntMpPerPoint: 8,            // ✖ 加內息回內

            baseHp: 100, hpPerCon: 15, hpPerLv: 35,
            baseMp: 50,  mpPerInt: 8,  mpPerLv: 15,
            atkStrCoef: 2.5, atkIntCoef: 1.0, atkLvCoef: 4,
            defConCoef: 1.5, defAgiCoef: 0.6, defLvCoef: 2,
            hitBase: 85, hitAgiCoef: 0.35, hitIntCoef: 0.2, hitLvCoef: 0.25,
            evaBase: 5, evaAgiCoef: 0.25,
            critBase: 5, critAgiCoef: 0.3,
            critResConCoef: 0.25, critResIntCoef: 0.2, critResLvCoef: 0.15,
            evaCap: 85,
            critCap: 90
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑤ ☯️ 武學體系
        // ═══════════════════════════════════════════════════════════════
        martial: {
            martialDiv: 4,                   // ✖ 武學屬性除數（降低 300%）
            masteryDiv: 5,                   // ✖ 專精屬性除數（降低 400%）
            spCostMult: 20,                  // ✖ 武點消耗倍率
            skillCostPow: 1.4,               // ✖ 技能成本曲線底數
            meridianCostPow: 1.65,           // ✖ 經脈成本曲線底數
            meridianSuccessRate: 0.10,       // ⚡ 經脈衝脈成功率

            skillReqLvStep: 2,               // ✖ 技能需求等級遞增
            xinfaReqLvStep: 2,               // ✖ 心法需求等級遞增
            qinggongReqLvStep: 2,            // ✖ 身法需求等級遞增
            masteryReqLvStep: 2,             // ✖ 專精需求等級遞增
            meridianReqLvStep: 3,            // ✖ 經脈需求等級遞增

            activeXinfaMult: 1.3,            // ✖ 主運心法加成倍率
            activeQinggongMult: 1.3,         // ✖ 常駐身法加成倍率
            allBonusMult: 1.0                // ⚡ 武學數值全域倍率（可重複套用）
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑥ 🌈 八大元素（相剋環：金→木→土→水→火→冰→風→雷→金）
        // ═══════════════════════════════════════════════════════════════
        element: {
            counterMult: 1.35,               // ⚡ 剋制倍率（+35%）
            resistedMult: 0.80,              // ⚡ 被剋倍率（-20%）
            neutralMult: 1.00,               // ⚡ 中性倍率

            defFactor: 0.65,                 // ⚡ 元素抗性減傷係數
            minElemDamage: 1,                // ⚡ 單元素最低傷害

            enemyElemAtkRatio: 0.10,         // ⚡ 敵人元素攻擊係數
            enemyElemDefRatio: 0.06,         // ⚡ 敵人元素抗性係數

            maxElemDamagePctOfMaxHp: 0.25,   // ⚡ 元素傷害上限 %

            // 基礎元素攻防公式（均分至八元素）
            flatAtkBase: 20,                 // ⚡ 基礎值
            flatAtkIntCoef: 2.2,             // ⚡ 每點內息
            flatAtkStrCoef: 1.0,             // ⚡ 每點力道
            flatAtkLvCoef: 3.0,              // ⚡ 每級等級
            flatDefBase: 15,                 // ⚡ 基礎值
            flatDefConCoef: 1.6,             // ⚡ 每點體魄
            flatDefIntCoef: 1.2,             // ⚡ 每點內息
            flatDefLvCoef: 2.0,              // ⚡ 每級等級

            // ✦ 補償係數（1.0 = 不補償；1.5 = 中度；4.0 = 接近舊版）
            flatAtkMult: 1.5
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑦ 🌿 八大靈根
        // ═══════════════════════════════════════════════════════════════
        spiritRoot: {
            rootBonusMult: 1.0,              // ⚡ 靈根數值全域倍率
            upgradeCostBase: 80,             // ⚡ 武點淬鍊：基礎值
            upgradeCostPow: 1.4,             // ⚡ 武點淬鍊：曲線底數
            stoneCostBase: 1000,             // ✖ 靈石淬鍊：基礎值
            stoneCostPow: 1.45,              // ✖ 靈石淬鍊：曲線底數
            rerollCostGold: 500,             // ⚡ 洗髓易根成本（兩）
            triggerChance: 0.30              // ⚡ 神通觸發率（fallback）
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑧ 🌀 修仙陣法
        // ═══════════════════════════════════════════════════════════════
        formation: {
            bonusMult: 1.0,                  // ⚡ 陣法數值全域倍率
            allowReroll: true,               // ✖ 允許重骰陣法種子
            rerollCostGold: 0,               // ✖ 重骰成本（兩）
            enemyUseFormation: true,         // ✖ 敵人使用陣法
            enemyT5MinCount: 5,              // ✖ 上品陣法需求人數
            enemyT4MinCount: 4               // ✖ 中品陣法需求人數
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑨ 🎁 掉落與裝備
        // ═══════════════════════════════════════════════════════════════
        loot: {
            maxBagSize: 60,                  // ⚡ 行囊容量上限（滿袋自動典當最弱）
            equipDivisor: 6,                 // ✖ 裝備掉落除數（越小掉越多）
            currencyChanceRare: 2.75,        // ✖ 通貨掉率：稀有怪 %
            currencyChanceMagic: 1.4,        // ✖ 通貨掉率：魔法怪 %
            currencyChanceNormal: 0.6,       // ✖ 通貨掉率：普通怪 %
            uniqueRollThreshold: 97,         // ✖ 傳奇門檻
            rareRollThreshold: 82,           // ✖ 稀有門檻
            magicRollThreshold: 52,          // ✖ 魔法門檻
            rareBonusRoll: 15,               // ✖ 稀有怪加成
            affixTierWeights: [35, 28, 20, 12, 5],   // ✖ 詞綴階級權重

            combatDropsPills: false,         // ⚡ 戰鬥掉丹藥
            guildBuildingsDropPills: true,   // ⚡ 幫會建築產丹藥
            expeditionDropsPills: true       // ⚡ 探險掉丹藥
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑩ 👹 怪物詞綴
        // ═══════════════════════════════════════════════════════════════
        affix: {
            triggerChancePct: 35,            // ⚡ 詞綴附帶機率 %（上限 35）
            rarity: {
                normal: { statMult: 1.00, rewardMult: 1.0 },   // ⚡ 普通
                magic:  { statMult: 1.30, rewardMult: 1.5 },   // ⚡ 魔法
                rare:   { statMult: 1.75, rewardMult: 2.5 }    // ⚡ 稀有
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑪ 🏯 幫會
        // ═══════════════════════════════════════════════════════════════
        guild: {
            baseGuildExp: 60000,             // ⚡ 幫會升級基礎經驗
            guildExpPow: 1.55,               // ✖ 幫會升級曲線底數
            recruitFirstCost: 10000,         // ⚡ 首位幫眾成本（兩）
            recruitStep: 100000,             // ⚡ 每多一位遞增（兩）
            upgradeCostMult: 5,              // ✖ 祝福/改命升級倍率
            craftHerbCost: 30,               // ✖ 煉丹房：靈草消耗/人
            craftOreCost: 30,                // ✖ 鍛造閣：玄鐵消耗/人
            buildingUpgradePow: 1.55,        // ✖ 建築擴建曲線底數
            beastFeedPow: 1.35,              // ✖ 神獸餵養曲線底數
            mainBeastMult: 1.25,             // ✖ 主神獸加成倍率
            towerFloorPower: 850,            // ⚡ 鎮妖塔每層戰力
            towerOrbEveryFloors: 5,          // ✖ 每 N 層必掉通貨
            guildEventCost: 1000,            // ⚡ 手動事件成本（資金）
            autoEventChance: 0.25,           // ⚡ 自動事件機率
            autoEventGivesRewards: false,    // ⚡ 自動事件給資源（false = 純氛圍）
            harvestMult: 1.0                 // ✖ 徵收生產倍率
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑫ 🤝 群俠／🐉 靈獸
        // ═══════════════════════════════════════════════════════════════
        companionPet: {
            companionGrowth: 0.15,           // ✖ 群俠每階光環成長
            petGrowth: 0.16,                 // ✖ 靈獸每級光環成長
            allBonusMult: 1.0,               // ⚡ 全域數值倍率
            companionUpgradePow: 1.45,       // ✖ 群俠升階曲線底數
            petFeedGoldPow: 1.35,            // ✖ 靈獸餵養金曲線底數
            petFeedSpPow: 1.40               // ✖ 靈獸餵養點曲線底數
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑬ 🧘 離線掛機（此區段全部未接線）
        // ═══════════════════════════════════════════════════════════════
        offline: {
            maxOfflineSeconds: 86400,        // ✖ 單次離線累積上限（秒）
            minTriggerSeconds: 60,           // ✖ 離線判定門檻（秒）
            maxCurrencyMult: 20,             // ✖ 通貨放大上限（倍）
            maxEquipDrops: 10,               // ✖ 裝備發放上限（件）
            maxGuildCycles: 40,              // ✖ 幫會模擬上限（輪）
            maxExpCycles: 20,                // ✖ 探險模擬上限（輪）
            checkIntervalMs: 10000           // ✖ 離線檢查頻率（ms）
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑭ 🖥️ 介面與其他
        // ═══════════════════════════════════════════════════════════════
        ui: {
            maxLogEntries: 50,               // ✖ 日誌最多保留筆數
            autoSaveIntervalMs: 30000,       // ⚡ 自動存檔間隔（ms）
            guildHarvestIntervalMs: 15000,   // ⚡ 幫會徵收間隔（ms）
            expeditionDurationSec: 180,      // ✖ 探險週期（秒）
            autoRepeatDelayMs: 1000,         // ✖ 自動連刷等待（ms）
            autoBattleIntervalMs: 1000       // ✖ 自動戰鬥間隔（ms）
        },

        // ═══════════════════════════════════════════════════════════════
        // ⑮ 🏆 戰鬥戰力顯示
        // ═══════════════════════════════════════════════════════════════
        //  公式：Power = ⌊ scale × ( atk·wa + def·wd + maxHp·wh + maxMp·wm
        //                        + hit·whi + eva·wev + crit·wc + critRes·wcr ) ⌋
        //  我方與敵方共用同一份公式。不影響戰鬥數值，僅改變顯示。
        // ═══════════════════════════════════════════════════════════════
        power: {
            scale: 4.0,                      // ⚡ 全域倍率（4.0 讓 Lv.1 約 2200）
            atkWeight:     5.0,              // ⚡ 攻擊權重
            defWeight:     3.0,              // ⚡ 防禦權重
            hpWeight:      0.2,              // ⚡ 氣血權重（後期數字大，壓低）
            mpWeight:      0.1,              // ⚡ 內力權重
            hitWeight:     2.0,              // ⚡ 命中權重
            evaWeight:     2.0,              // ⚡ 閃避權重
            critWeight:    3.0,              // ⚡ 會心權重
            critResWeight: 3.0,              // ⚡ 暴抗權重
            minValue: 1,                     // ⚡ 最低戰力
            showInBattlePanel: true          // ⚡ 戰鬥面板顯示戰力
        }
    };

    // ── 區段清單（供 resetToDefaults / 作弊面板用）──
    CFG.SECTION_KEYS = ['speed', 'multipliers', 'combat', 'growth', 'martial',
        'element', 'spiritRoot', 'formation', 'loot', 'affix',
        'guild', 'companionPet', 'offline', 'ui', 'power'];

    // ── 預設值快照（載入時立即捕獲）──
    (function captureDefaults() {
        CFG.__defaults = {};
        CFG.SECTION_KEYS.forEach(function (sec) {
            if (CFG[sec]) CFG.__defaults[sec] = JSON.parse(JSON.stringify(CFG[sec]));
        });
    })();

    // ── 深度就地賦值（不替換物件參考，確保其他模組持有的參考仍有效）──
    CFG.__deepAssignInPlace = function (target, source) {
        Object.keys(source).forEach(function (k) {
            var sv = source[k];
            if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
                if (!target[k] || typeof target[k] !== 'object') target[k] = {};
                CFG.__deepAssignInPlace(target[k], sv);
            } else if (Array.isArray(sv)) {
                target[k] = sv.slice();
            } else {
                target[k] = sv;
            }
        });
    };

    window.HY.GameConfig = CFG;
    console.log('[GameConfig 1/5] ✓ 設定資料已定義（' + CFG.version + '，' +
        CFG.SECTION_KEYS.length + ' 個區段）');
})();