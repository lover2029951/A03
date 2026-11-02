// js/cheatPanel.js  (v3)
// 🛠️ 作弊面板：把 gameConfig.js 的全部可調參數做成可即時編輯的 UI
//
// v3：加入自我診斷（佔位函式 + 載入成功訊息 + 執行期 try/catch）
// v2：5 種難度模式；修正 v1 的 `digital` 未定義變數
//
// ⚠️ 本檔約 960~1000 行、約 65 KB。
//    若你的檔案明顯少於 900 行 → 複製貼上時被截斷了，請重新完整貼上。
//    截斷會造成 SyntaxError，整個檔案不會執行，bootLoader 就會回報
//    「cheatPanel.js 已載入但未定義 → 預期 window.HY.CheatPanel」。
window.HY = window.HY || {};

// ── 佔位函式：先讓 bootLoader 的 checkGlobal 過關 ──
//    若本檔後半段因故失敗，這個佔位會保留，並在開啟面板時提示真因。
window.HY.CheatPanel = window.HY.CheatPanel || function () {
    console.error('[CheatPanel] ⚠️ 真正的類別尚未定義完成。' +
        '請在 Console 檢查最上方的 SyntaxError / ReferenceError，' +
        '並用 fetch 診斷指令確認 cheatPanel.js 是否被截斷。');
};

(function () {
    try {

    // ══════════════════════════════════════════════════════════════════
    //  ① 難度模式定義
    //     params 內的路徑會寫入 GameConfig；
    //     未列出的參數（speed.global、element.flatAtkMult 等）不受影響。
    // ══════════════════════════════════════════════════════════════════
    var DIFFICULTY_PRESETS = {
        casual: {
            id: 'casual',
            name: '🌱 休閒',
            short: '輕鬆體驗',
            color: '#4ade80',
            summary: '敵×0.7 收×3.0',
            desc: '玩家強勢、敵人弱化、收益三倍、詞綴機率砍半。適合想專心跑劇情與收集的玩家。',
            params: {
                'multipliers.playerAtk':     1.6,
                'multipliers.playerDef':     1.6,
                'multipliers.playerMaxHp':   1.6,
                'multipliers.playerMaxMp':   1.5,
                'multipliers.playerCrit':    1.4,
                'multipliers.playerCritRes': 1.5,
                'multipliers.playerAtkSpd':  1.15,
                'multipliers.enemyAtk':     0.65,
                'multipliers.enemyDef':     0.65,
                'multipliers.enemyMaxHp':   0.70,
                'multipliers.enemyAtkSpd':  0.85,
                'multipliers.enemyCrit':    0.60,
                'multipliers.enemyCritRes': 0.60,
                'multipliers.expGain':          3.0,
                'multipliers.spGain':           3.0,
                'multipliers.goldGain':         3.0,
                'multipliers.equipDropRate':    2.0,
                'multipliers.currencyDropRate': 2.0,
                'combat.atbPlayerGainCoef': 0.065,
                'combat.atbEnemyGainCoef':  0.048,
                'combat.pillCooldownMs':    1500,
                'affix.triggerChancePct':          15,
                'affix.rarity.magic.statMult':     1.15,
                'affix.rarity.magic.rewardMult':   1.3,
                'affix.rarity.rare.statMult':      1.45,
                'affix.rarity.rare.rewardMult':    2.0,
                'loot.maxBagSize': 80
            }
        },
        normal: {
            id: 'normal',
            name: '⚔️ 普通',
            short: '原廠平衡',
            color: '#38bdf8',
            summary: '敵×1.0 收×1.0',
            desc: '完全原廠設定，標準遊戲體驗。所有參數與 gameConfig.js 內建的預設值一致。',
            params: {
                'multipliers.playerAtk':     1.0,
                'multipliers.playerDef':     1.0,
                'multipliers.playerMaxHp':   1.0,
                'multipliers.playerMaxMp':   1.0,
                'multipliers.playerCrit':    1.0,
                'multipliers.playerCritRes': 1.0,
                'multipliers.playerAtkSpd':  1.0,
                'multipliers.enemyAtk':     1.0,
                'multipliers.enemyDef':     1.0,
                'multipliers.enemyMaxHp':   1.0,
                'multipliers.enemyAtkSpd':  1.0,
                'multipliers.enemyCrit':    1.0,
                'multipliers.enemyCritRes': 1.0,
                'multipliers.expGain':          1.0,
                'multipliers.spGain':           1.0,
                'multipliers.goldGain':         1.0,
                'multipliers.equipDropRate':    1.0,
                'multipliers.currencyDropRate': 1.0,
                'combat.atbPlayerGainCoef': 0.055,
                'combat.atbEnemyGainCoef':  0.052,
                'combat.pillCooldownMs':    2000,
                'affix.triggerChancePct':          35,
                'affix.rarity.magic.statMult':     1.30,
                'affix.rarity.magic.rewardMult':   1.5,
                'affix.rarity.rare.statMult':      1.75,
                'affix.rarity.rare.rewardMult':    2.5,
                'loot.maxBagSize': 60
            }
        },
        challenge: {
            id: 'challenge',
            name: '🔥 挑戰',
            short: '需要配裝',
            color: '#fbbf24',
            summary: '敵×1.4 收×1.4',
            desc: '敵人明顯強化，需要有基本裝備與選招策略。服藥冷卻拉長，逼你用招式而非硬扛。',
            params: {
                'multipliers.playerAtk':     1.0,
                'multipliers.playerDef':     1.0,
                'multipliers.playerMaxHp':   1.0,
                'multipliers.playerMaxMp':   1.0,
                'multipliers.playerCrit':    1.0,
                'multipliers.playerCritRes': 1.0,
                'multipliers.playerAtkSpd':  1.0,
                'multipliers.enemyAtk':     1.35,
                'multipliers.enemyDef':     1.30,
                'multipliers.enemyMaxHp':   1.40,
                'multipliers.enemyAtkSpd':  1.08,
                'multipliers.enemyCrit':    1.20,
                'multipliers.enemyCritRes': 1.20,
                'multipliers.expGain':          1.4,
                'multipliers.spGain':           1.4,
                'multipliers.goldGain':         1.4,
                'multipliers.equipDropRate':    1.3,
                'multipliers.currencyDropRate': 1.3,
                'combat.atbPlayerGainCoef': 0.055,
                'combat.atbEnemyGainCoef':  0.060,
                'combat.pillCooldownMs':    2500,
                'affix.triggerChancePct':          35,
                'affix.rarity.magic.statMult':     1.45,
                'affix.rarity.magic.rewardMult':   1.6,
                'affix.rarity.rare.statMult':      2.00,
                'affix.rarity.rare.rewardMult':    2.8,
                'loot.maxBagSize': 60
            }
        },
        hell: {
            id: 'hell',
            name: '💀 地獄',
            short: '需要完整 Build',
            color: '#f87171',
            summary: '敵×2.2 收×2.0',
            desc: '敵人血量翻倍以上，玩家屬性略降。詞綴怪特別硬，沒有完整 Build 會頻繁團滅。',
            params: {
                'multipliers.playerAtk':     0.95,
                'multipliers.playerDef':     0.95,
                'multipliers.playerMaxHp':   0.95,
                'multipliers.playerMaxMp':   1.0,
                'multipliers.playerCrit':    0.95,
                'multipliers.playerCritRes': 0.95,
                'multipliers.playerAtkSpd':  1.0,
                'multipliers.enemyAtk':     2.0,
                'multipliers.enemyDef':     1.8,
                'multipliers.enemyMaxHp':   2.2,
                'multipliers.enemyAtkSpd':  1.18,
                'multipliers.enemyCrit':    1.50,
                'multipliers.enemyCritRes': 1.50,
                'multipliers.expGain':          2.0,
                'multipliers.spGain':           2.0,
                'multipliers.goldGain':         2.0,
                'multipliers.equipDropRate':    1.8,
                'multipliers.currencyDropRate': 1.8,
                'combat.atbPlayerGainCoef': 0.052,
                'combat.atbEnemyGainCoef':  0.068,
                'combat.pillCooldownMs':    3000,
                'affix.triggerChancePct':          35,
                'affix.rarity.magic.statMult':     1.60,
                'affix.rarity.magic.rewardMult':   1.8,
                'affix.rarity.rare.statMult':      2.40,
                'affix.rarity.rare.rewardMult':    3.2,
                'loot.maxBagSize': 80
            }
        },
        asura: {
            id: 'asura',
            name: '🩸 修羅',
            short: '極限挑戰',
            color: '#dc2626',
            summary: '敵×3.2 收×3.0',
            desc: '敵人全面 ×3，且集氣速度超越玩家（會被搶走回合）。只有收益足以支撐這場馬拉松。',
            params: {
                'multipliers.playerAtk':     0.90,
                'multipliers.playerDef':     0.90,
                'multipliers.playerMaxHp':   0.90,
                'multipliers.playerMaxMp':   1.0,
                'multipliers.playerCrit':    0.90,
                'multipliers.playerCritRes': 0.90,
                'multipliers.playerAtkSpd':  1.0,
                'multipliers.enemyAtk':     3.0,
                'multipliers.enemyDef':     2.5,
                'multipliers.enemyMaxHp':   3.2,
                'multipliers.enemyAtkSpd':  1.30,
                'multipliers.enemyCrit':    1.80,
                'multipliers.enemyCritRes': 1.80,
                'multipliers.expGain':          3.0,
                'multipliers.spGain':           3.0,
                'multipliers.goldGain':         3.0,
                'multipliers.equipDropRate':    2.5,
                'multipliers.currencyDropRate': 2.5,
                'combat.atbPlayerGainCoef': 0.050,
                'combat.atbEnemyGainCoef':  0.075,
                'combat.pillCooldownMs':    3000,
                'affix.triggerChancePct':          35,
                'affix.rarity.magic.statMult':     1.75,
                'affix.rarity.magic.rewardMult':   2.0,
                'affix.rarity.rare.statMult':      2.80,
                'affix.rarity.rare.rewardMult':    3.5,
                'loot.maxBagSize': 100
            }
        }
    };

    var DIFFICULTY_ORDER = ['casual', 'normal', 'challenge', 'hell', 'asura'];
    var DIFFICULTY_STORAGE_KEY = 'HY_CHEAT_DIFFICULTY_V1';

    // 難度會控制的全部參數路徑（用於「自訂」偵測）
    var DIFFICULTY_PARAM_KEYS = (function () {
        var set = {};
        DIFFICULTY_ORDER.forEach(function (id) {
            Object.keys(DIFFICULTY_PRESETS[id].params).forEach(function (p) { set[p] = true; });
        });
        return Object.keys(set);
    })();

    // ══════════════════════════════════════════════════════════════════
    //  ② 欄位標籤定義
    //     type : 'num' | 'bool' | 'arr'
    //     live : 'live'（即時） | 'reapply'（需重套） | 'dead'（未接線）
    // ══════════════════════════════════════════════════════════════════
    var SECTIONS = [
        {
            id: 'speed',
            title: '① ⚡ 遊戲速度',
            desc: '攔截全域計時器以加速遊戲。即時生效，無需重整。',
            fields: [
                { path: 'speed.enabled',       label: '啟用速度控制',      type: 'bool', live: 'live', hint: '關閉 = 完全恢復原廠速度' },
                { path: 'speed.global',        label: '⚡ 全域倍率',       type: 'num', step: 0.1, min: 0.1, max: 20, live: 'live', hint: '1.0 原速 / 2.0 兩倍 / 5.0 五倍' },
                { path: 'speed.intervalScale', label: '重複計時器倍率',    type: 'num', step: 0.1, min: 0.1, max: 10, live: 'live', hint: 'ATB、探險、徵收、存檔。實際 = global x 此值' },
                { path: 'speed.timeoutScale',  label: '單次延遲倍率',      type: 'num', step: 0.1, min: 0.1, max: 10, live: 'live', hint: '連刷等待等。實際 = global x 此值' },
                { path: 'speed.bootGuardMs',   label: '開機保護期 (ms)',   type: 'num', step: 100, min: 0, max: 5000, live: 'live', hint: '此期間 setTimeout 不縮放，保護初始化順序' },
                { path: 'speed.enableHotkeys', label: '啟用鍵盤快捷鍵',    type: 'bool', live: 'reapply', hint: '[ 減速 ] 加速 \\ 重置' },
                { path: 'speed.hotkeyStep',    label: '快捷鍵加減幅度',    type: 'num', step: 0.1, min: 0.1, max: 5, live: 'live' },
                { path: 'speed.minMult',       label: '倍率下限',          type: 'num', step: 0.1, min: 0.01, max: 5, live: 'live' },
                { path: 'speed.maxMult',       label: '倍率上限',          type: 'num', step: 1, min: 1, max: 100, live: 'live' }
            ]
        },
        {
            id: 'multipliers',
            title: '② 💰 收益倍率',
            desc: '全域收益與屬性倍率。全部為乘法（1.0 = 原廠）。🎮 表示受難度模式控制。',
            fields: [
                { path: 'multipliers.expGain',   label: '經驗獲得倍率',    type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'multipliers.spGain',    label: '武點獲得倍率',    type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'multipliers.goldGain',  label: '紋銀獲得倍率',    type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'multipliers.equipDropRate',    label: '裝備掉落倍率', type: 'num', step: 0.1, min: 0, max: 50, live: 'live', hint: '小數會用機率判定（1.5 = 50% 多掉 1 件）' },
                { path: 'multipliers.currencyDropRate', label: '通貨掉落倍率', type: 'num', step: 0.1, min: 0, max: 50, live: 'live' },
                { path: 'multipliers.playerAtk',     label: '玩家：攻擊',       type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.playerDef',     label: '玩家：防禦',       type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.playerMaxHp',   label: '玩家：氣血上限',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.playerMaxMp',   label: '玩家：內力上限',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.playerAtkSpd',  label: '玩家：出手攻速',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live', hint: '影響 ATB 集氣速度' },
                { path: 'multipliers.playerCrit',    label: '玩家：會心爆擊',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.playerCritRes', label: '玩家：暴擊抵抗',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.enemyAtk',     label: '敵人：攻擊',       type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.enemyDef',     label: '敵人：防禦',       type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.enemyMaxHp',   label: '敵人：氣血上限',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live', hint: '改動時會等比例換算現有血量' },
                { path: 'multipliers.enemyAtkSpd',  label: '敵人：出手攻速',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.enemyCrit',    label: '敵人：會心爆擊',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' },
                { path: 'multipliers.enemyCritRes', label: '敵人：暴擊抵抗',   type: 'num', step: 0.1, min: 0, max: 20, live: 'live' }
            ]
        },
        {
            id: 'combat',
            title: '③ ⚔️ 戰鬥核心',
            desc: '獎勵除數與 ATB 參數會即時生效；傷害係數目前未接線。',
            fields: [
                { path: 'combat.enemyCritResScale', label: '敵人暴抗軟化係數', type: 'num', step: 0.05, min: 0, max: 1, live: 'dead' },
                { path: 'combat.rewardExpDivisor',  label: '經驗除數',        type: 'num', step: 1, min: 1, max: 100, live: 'live', hint: '越小給越多' },
                { path: 'combat.rewardSpDivisor',   label: '武點除數',        type: 'num', step: 1, min: 1, max: 100, live: 'live' },
                { path: 'combat.rewardGoldDivisor', label: '紋銀除數',        type: 'num', step: 1, min: 1, max: 100, live: 'live' },
                { path: 'combat.enemyMpBase',      label: '敵人內力基礎值',  type: 'num', step: 10, min: 0, max: 2000, live: 'dead' },
                { path: 'combat.enemyMpLvCoef',    label: '敵人內力等級係數', type: 'num', step: 1, min: 0, max: 200, live: 'dead' },
                { path: 'combat.enemyMpAtkCoef',   label: '敵人內力攻擊係數', type: 'num', step: 0.01, min: 0, max: 5, live: 'dead' },
                { path: 'combat.enemyMpRegenRatio',label: '敵人內力回復比例', type: 'num', step: 0.01, min: 0, max: 1, live: 'dead' },
                { path: 'combat.playerHitCap',       label: '玩家命中上限 %',   type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'combat.playerHitFloorBase', label: '玩家命中保底 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.playerHitFloorWithRT',    label: '玩家命中保底(必中) %', type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.playerHitFloorWithRTCap', label: '必中祝福保底上限 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.playerCritCap',      label: '玩家暴擊上限 %',   type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'combat.playerCritFloor',    label: '玩家暴擊保底 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.enemyHitCap',      label: '敵人命中上限 %',   type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'combat.enemyHitFloor',    label: '敵人命中保底 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.enemyCritCap',     label: '敵人暴擊上限 %',   type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'combat.enemyCritFloor',   label: '敵人暴擊保底 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.enemyCritMult',    label: '敵人暴擊傷害倍率', type: 'num', step: 0.05, min: 1, max: 10, live: 'dead' },
                { path: 'combat.playerDefFactor',      label: '玩家攻擊破防係數', type: 'num', step: 0.05, min: 0, max: 2, live: 'dead' },
                { path: 'combat.enemyDefFactorNormal', label: '敵普攻破防係數',   type: 'num', step: 0.05, min: 0, max: 2, live: 'dead' },
                { path: 'combat.enemyDefFactorPierce', label: '敵破甲破防係數',   type: 'num', step: 0.05, min: 0, max: 2, live: 'dead', hint: '越低越痛' },
                { path: 'combat.aoeDamageMult',        label: '群攻傷害係數',     type: 'num', step: 0.05, min: 0, max: 2, live: 'dead' },
                { path: 'combat.damageVarianceMin',    label: '傷害浮動下限',     type: 'num', step: 0.01, min: 0, max: 2, live: 'dead' },
                { path: 'combat.damageVarianceMax',    label: '傷害浮動上限',     type: 'num', step: 0.01, min: 0, max: 2, live: 'dead' },
                { path: 'combat.minDamage',            label: '玩家最低傷害',     type: 'num', step: 1, min: 0, max: 1000, live: 'dead' },
                { path: 'combat.pillCooldownMs',  label: '自動服藥冷卻 (ms)', type: 'num', step: 100, min: 0, max: 60000, live: 'live', hint: '同一隊員兩次服藥最短間隔' },
                { path: 'combat.pillMinEffectPct',label: '藥效提示門檻 %',    type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'combat.atbTickMs',         label: 'ATB 檢查頻率 (ms)',  type: 'num', step: 10, min: 20, max: 1000, live: 'live', hint: '調低更平滑但更耗效能' },
                { path: 'combat.atbPlayerGainCoef', label: '玩家集氣係數',       type: 'num', step: 0.001, min: 0.001, max: 1, live: 'live', hint: '集氣量 = 攻速 x 此值' },
                { path: 'combat.atbEnemyGainCoef',  label: '敵人集氣係數',       type: 'num', step: 0.001, min: 0.001, max: 1, live: 'live' },
                { path: 'combat.atbPlayerInitMax',  label: '玩家開場集氣上限',   type: 'num', step: 1, min: 0, max: 100, live: 'live' },
                { path: 'combat.atbPlayerInitDexCoef', label: '玩家開場集氣 dex 係數', type: 'num', step: 0.05, min: 0, max: 5, live: 'live' },
                { path: 'combat.atbEnemyInitMax',   label: '敵人開場集氣上限',   type: 'num', step: 1, min: 0, max: 100, live: 'live' },
                { path: 'combat.atbEnemyInitBase',  label: '敵人開場集氣基礎',   type: 'num', step: 1, min: 0, max: 100, live: 'live' },
                { path: 'combat.atbEnemyInitRand',  label: '敵人開場集氣隨機量', type: 'num', step: 1, min: 0, max: 100, live: 'live' }
            ]
        },
        {
            id: 'growth',
            title: '④ 📈 成長曲線',
            desc: 'Lv 上限與折算率已接線；其餘為原廠對照值（未接線）。',
            fields: [
                { path: 'growth.maxLevel',       label: '等級上限',       type: 'num', step: 10, min: 1, max: 1000, live: 'reapply', hint: '⚠️ 超過 300 會超出地圖設計' },
                { path: 'growth.rewardRate',     label: '戰利品折算率',   type: 'num', step: 0.005, min: 0, max: 5, live: 'live', hint: '實際武點 = 原始值 x 此值' },
                { path: 'growth.pointsPerLevel', label: '每級潛能點',     type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'growth.levelExpBaseCoef',   label: '升級經驗：基礎係數', type: 'num', step: 5, min: 0, max: 1000, live: 'dead' },
                { path: 'growth.levelExpPow',        label: '升級經驗：次方',     type: 'num', step: 0.05, min: 1, max: 4, live: 'dead' },
                { path: 'growth.levelExpLinearCoef', label: '升級經驗：線性係數', type: 'num', step: 5, min: 0, max: 1000, live: 'dead' },
                { path: 'growth.levelExpTierBase',   label: '大境界倍率',         type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'growth.levelExpTierSize',   label: '大境界級距',         type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'growth.levelExpMin',        label: '升級經驗下限',       type: 'num', step: 10, min: 0, max: 10000, live: 'dead' },
                { path: 'growth.levelGapThreshold',    label: '等級差懲罰門檻', type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'growth.levelGapPenaltyMult',  label: '等級差經驗倍率', type: 'num', step: 0.05, min: 0, max: 1, live: 'dead' },
                { path: 'growth.costConHpPerPoint',    label: '加體魄回血',     type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.costIntMpPerPoint',    label: '加內息回內',     type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.baseHp',    label: '基礎氣血',       type: 'num', step: 10, min: 0, max: 10000, live: 'dead' },
                { path: 'growth.hpPerCon',  label: '每點體魄 + 氣血', type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.hpPerLv',   label: '每級 + 氣血',     type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.baseMp',    label: '基礎內力',       type: 'num', step: 10, min: 0, max: 10000, live: 'dead' },
                { path: 'growth.mpPerInt',  label: '每點內息 + 內力', type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.mpPerLv',   label: '每級 + 內力',     type: 'num', step: 1, min: 0, max: 500, live: 'dead' },
                { path: 'growth.atkStrCoef', label: '攻擊：力道係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.atkIntCoef', label: '攻擊：內息係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.atkLvCoef',  label: '攻擊：等級係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.defConCoef', label: '防禦：體魄係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.defAgiCoef', label: '防禦：身法係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.defLvCoef',  label: '防禦：等級係數', type: 'num', step: 0.1, min: 0, max: 50, live: 'dead' },
                { path: 'growth.hitBase',     label: '命中：基礎',   type: 'num', step: 1, min: 0, max: 200, live: 'dead' },
                { path: 'growth.hitAgiCoef',  label: '命中：身法係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.hitIntCoef',  label: '命中：內息係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.hitLvCoef',   label: '命中：等級係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.evaBase',     label: '閃避：基礎',   type: 'num', step: 1, min: 0, max: 200, live: 'dead' },
                { path: 'growth.evaAgiCoef',  label: '閃避：身法係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.critBase',    label: '暴擊：基礎',   type: 'num', step: 1, min: 0, max: 200, live: 'dead' },
                { path: 'growth.critAgiCoef', label: '暴擊：身法係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.critResConCoef', label: '暴抗：體魄係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.critResIntCoef', label: '暴抗：內息係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.critResLvCoef',  label: '暴抗：等級係數', type: 'num', step: 0.05, min: 0, max: 10, live: 'dead' },
                { path: 'growth.evaCap',      label: '閃避上限 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'growth.critCap',     label: '暴擊上限 %',   type: 'num', step: 1, min: 0, max: 100, live: 'dead' }
            ]
        },
        {
            id: 'martial',
            title: '⑤ ☯️ 武學體系',
            desc: '經脈成功率與全域數值倍率已接線。',
            fields: [
                { path: 'martial.martialDiv',  label: '武學屬性除數',   type: 'num', step: 0.5, min: 1, max: 50, live: 'dead' },
                { path: 'martial.masteryDiv',  label: '專精屬性除數',   type: 'num', step: 0.5, min: 1, max: 50, live: 'dead' },
                { path: 'martial.spCostMult',  label: '武點消耗倍率',   type: 'num', step: 1, min: 1, max: 200, live: 'dead' },
                { path: 'martial.skillCostPow',label: '技能成本曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'martial.meridianCostPow', label: '經脈成本曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'martial.meridianSuccessRate', label: '經脈衝脈成功率', type: 'num', step: 0.01, min: 0, max: 1, live: 'live', hint: '0.10 = 10%；失敗仍消耗武點' },
                { path: 'martial.skillReqLvStep',    label: '技能需求等級遞增', type: 'num', step: 1, min: 0, max: 20, live: 'dead' },
                { path: 'martial.xinfaReqLvStep',    label: '心法需求等級遞增', type: 'num', step: 1, min: 0, max: 20, live: 'dead' },
                { path: 'martial.qinggongReqLvStep', label: '身法需求等級遞增', type: 'num', step: 1, min: 0, max: 20, live: 'dead' },
                { path: 'martial.masteryReqLvStep',  label: '專精需求等級遞增', type: 'num', step: 1, min: 0, max: 20, live: 'dead' },
                { path: 'martial.meridianReqLvStep', label: '經脈需求等級遞增', type: 'num', step: 1, min: 0, max: 20, live: 'dead' },
                { path: 'martial.activeXinfaMult',     label: '主運心法加成倍率', type: 'num', step: 0.05, min: 1, max: 5, live: 'dead' },
                { path: 'martial.activeQinggongMult',  label: '常駐身法加成倍率', type: 'num', step: 0.05, min: 1, max: 5, live: 'dead' },
                { path: 'martial.allBonusMult',        label: '⚡ 武學數值全域倍率', type: 'num', step: 0.1, min: 0, max: 20, live: 'reapply', hint: '⚠️ 放大所有外功/心法/身法/經脈/專精數值' }
            ]
        },
        {
            id: 'element',
            title: '⑥ 🌈 八大元素',
            desc: '相剋環：金→木→土→水→火→冰→風→雷→金。全部即時生效。',
            fields: [
                { path: 'element.counterMult',  label: '剋制倍率',     type: 'num', step: 0.05, min: 0, max: 5, live: 'live', hint: '1.35 = +35%' },
                { path: 'element.resistedMult', label: '被剋倍率',     type: 'num', step: 0.05, min: 0, max: 5, live: 'live', hint: '0.80 = -20%' },
                { path: 'element.neutralMult',  label: '中性倍率',     type: 'num', step: 0.05, min: 0, max: 5, live: 'live' },
                { path: 'element.defFactor',    label: '元素抗性減傷係數', type: 'num', step: 0.05, min: 0, max: 3, live: 'live', hint: '越低越痛' },
                { path: 'element.minElemDamage',label: '單元素最低傷害', type: 'num', step: 1, min: 0, max: 1000, live: 'live' },
                { path: 'element.enemyElemAtkRatio', label: '敵人元素攻擊係數', type: 'num', step: 0.01, min: 0, max: 2, live: 'live', hint: '敵人元素攻擊 = 敵 atk x 此值' },
                { path: 'element.enemyElemDefRatio', label: '敵人元素抗性係數', type: 'num', step: 0.01, min: 0, max: 2, live: 'live' },
                { path: 'element.maxElemDamagePctOfMaxHp', label: '元素傷害上限 %', type: 'num', step: 0.05, min: 0, max: 1, live: 'live', hint: '0.25 = 最高 25% 最大氣血' },
                { path: 'element.flatAtkBase',    label: '基礎元素攻擊：基礎值',  type: 'num', step: 1, min: 0, max: 10000, live: 'live' },
                { path: 'element.flatAtkIntCoef', label: '基礎元素攻擊：內息係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatAtkStrCoef', label: '基礎元素攻擊：力道係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatAtkLvCoef',  label: '基礎元素攻擊：等級係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatDefBase',    label: '基礎元素抗性：基礎值',  type: 'num', step: 1, min: 0, max: 10000, live: 'live' },
                { path: 'element.flatDefConCoef', label: '基礎元素抗性：體魄係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatDefIntCoef', label: '基礎元素抗性：內息係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatDefLvCoef',  label: '基礎元素抗性：等級係數', type: 'num', step: 0.1, min: 0, max: 100, live: 'live' },
                { path: 'element.flatAtkMult',    label: '✦ 元素補償係數',        type: 'num', step: 0.1, min: 0, max: 10, live: 'live', hint: '1.0 不補償 / 1.5 中度 / 4.0 接近舊版' }
            ]
        },
        {
            id: 'spiritRoot',
            title: '⑦ 🌿 八大靈根',
            desc: '神通觸發機率為「資料驅動」（各靈根自帶 28% 或 30%），此處僅為 fallback。',
            fields: [
                { path: 'spiritRoot.rootBonusMult',   label: '⚡ 靈根數值全域倍率', type: 'num', step: 0.1, min: 0, max: 20, live: 'reapply' },
                { path: 'spiritRoot.upgradeCostBase', label: '武點淬鍊：基礎值',   type: 'num', step: 10, min: 0, max: 100000, live: 'live' },
                { path: 'spiritRoot.upgradeCostPow',  label: '武點淬鍊：曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'live' },
                { path: 'spiritRoot.stoneCostBase',   label: '靈石淬鍊：基礎值',   type: 'num', step: 100, min: 0, max: 1000000, live: 'dead' },
                { path: 'spiritRoot.stoneCostPow',    label: '靈石淬鍊：曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'spiritRoot.rerollCostGold',  label: '洗髓易根成本 (兩)',  type: 'num', step: 100, min: 0, max: 1000000, live: 'live', hint: '有探險系統時改用太虛洗靈丹' },
                { path: 'spiritRoot.triggerChance',   label: '神通觸發率 (fallback)', type: 'num', step: 0.01, min: 0, max: 1, live: 'live' }
            ]
        },
        {
            id: 'formation',
            title: '⑧ 🌀 修仙陣法',
            desc: '只有全域倍率已接線；其餘欄位目前程式未讀取。',
            fields: [
                { path: 'formation.bonusMult',        label: '⚡ 陣法數值全域倍率', type: 'num', step: 0.1, min: 0, max: 20, live: 'reapply' },
                { path: 'formation.allowReroll',      label: '允許重骰陣法種子',   type: 'bool', live: 'dead' },
                { path: 'formation.rerollCostGold',   label: '重骰成本 (兩)',      type: 'num', step: 10, min: 0, max: 100000, live: 'dead' },
                { path: 'formation.enemyUseFormation',label: '敵人使用陣法',       type: 'bool', live: 'dead' },
                { path: 'formation.enemyT5MinCount',  label: '上品陣法需求人數',   type: 'num', step: 1, min: 1, max: 10, live: 'dead' },
                { path: 'formation.enemyT4MinCount',  label: '中品陣法需求人數',   type: 'num', step: 1, min: 1, max: 10, live: 'dead' }
            ]
        },
        {
            id: 'loot',
            title: '⑨ 🎁 掉落與裝備',
            desc: '行囊上限與掉落政策已接線；掉落門檻目前硬寫在 poeCraftSystem。',
            fields: [
                { path: 'loot.maxBagSize',         label: '⚡ 行囊容量上限',   type: 'num', step: 5, min: 5, max: 500, live: 'live' },
                { path: 'loot.equipDivisor',       label: '裝備掉落除數',     type: 'num', step: 1, min: 1, max: 200, live: 'dead', hint: '越小掉越多' },
                { path: 'loot.currencyChanceRare', label: '通貨掉率：稀有怪 %', type: 'num', step: 0.05, min: 0, max: 100, live: 'dead' },
                { path: 'loot.currencyChanceMagic',label: '通貨掉率：魔法怪 %', type: 'num', step: 0.05, min: 0, max: 100, live: 'dead' },
                { path: 'loot.currencyChanceNormal',label:'通貨掉率：普通怪 %', type: 'num', step: 0.05, min: 0, max: 100, live: 'dead' },
                { path: 'loot.uniqueRollThreshold',label: '傳奇門檻',         type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'loot.rareRollThreshold',  label: '稀有門檻',         type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'loot.magicRollThreshold', label: '魔法門檻',         type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'loot.rareBonusRoll',      label: '稀有怪加成',       type: 'num', step: 1, min: 0, max: 100, live: 'dead' },
                { path: 'loot.affixTierWeights',   label: '詞綴階級權重',     type: 'arr', live: 'dead', hint: '格式：35,28,20,12,5（總和建議 100）' },
                { path: 'loot.combatDropsPills',        label: '戰鬥掉丹藥',   type: 'bool', live: 'live' },
                { path: 'loot.guildBuildingsDropPills', label: '幫會建築產丹藥', type: 'bool', live: 'live' },
                { path: 'loot.expeditionDropsPills',    label: '探險掉丹藥',   type: 'bool', live: 'live' }
            ]
        },
        {
            id: 'affix',
            title: '⑩ 👹 怪物詞綴',
            desc: '詞綴觸發率只支援「降低」；提高超過 35% 需改 affixSystem.js。',
            fields: [
                { path: 'affix.triggerChancePct',          label: '詞綴附帶機率 %', type: 'num', step: 1, min: 0, max: 35, live: 'live', hint: '上限 35（超過無效）' },
                { path: 'affix.rarity.normal.statMult',    label: '普通：屬性倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' },
                { path: 'affix.rarity.normal.rewardMult',  label: '普通：獎勵倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' },
                { path: 'affix.rarity.magic.statMult',     label: '魔法：屬性倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' },
                { path: 'affix.rarity.magic.rewardMult',   label: '魔法：獎勵倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' },
                { path: 'affix.rarity.rare.statMult',      label: '稀有：屬性倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' },
                { path: 'affix.rarity.rare.rewardMult',    label: '稀有：獎勵倍率', type: 'num', step: 0.05, min: 0, max: 20, live: 'live' }
            ]
        },
        {
            id: 'guild',
            title: '⑪ 🏯 幫會',
            desc: '升級基礎、招募成本、事件成本、鎮妖塔係數、自動事件皆已接線。',
            fields: [
                { path: 'guild.baseGuildExp',   label: '幫會升級基礎經驗', type: 'num', step: 1000, min: 0, max: 10000000, live: 'live' },
                { path: 'guild.guildExpPow',    label: '幫會升級曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'guild.recruitFirstCost', label: '首位幫眾成本 (兩)', type: 'num', step: 1000, min: 0, max: 100000000, live: 'live' },
                { path: 'guild.recruitStep',      label: '每多一位遞增 (兩)', type: 'num', step: 10000, min: 0, max: 100000000, live: 'live' },
                { path: 'guild.upgradeCostMult',  label: '祝福/改命升級倍率', type: 'num', step: 1, min: 1, max: 100, live: 'dead' },
                { path: 'guild.craftHerbCost',    label: '煉丹房：靈草消耗/人', type: 'num', step: 10, min: 0, max: 10000, live: 'dead' },
                { path: 'guild.craftOreCost',     label: '鍛造閣：玄鐵消耗/人', type: 'num', step: 10, min: 0, max: 10000, live: 'dead' },
                { path: 'guild.buildingUpgradePow', label: '建築擴建曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'guild.beastFeedPow',     label: '神獸餵養曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'guild.mainBeastMult',    label: '主神獸加成倍率',   type: 'num', step: 0.05, min: 1, max: 5, live: 'dead' },
                { path: 'guild.towerFloorPower',  label: '⚡ 鎮妖塔每層戰力', type: 'num', step: 50, min: 0, max: 100000, live: 'live' },
                { path: 'guild.towerOrbEveryFloors', label: '每 N 層必掉通貨', type: 'num', step: 1, min: 1, max: 50, live: 'dead' },
                { path: 'guild.guildEventCost',   label: '⚡ 手動事件成本 (資金)', type: 'num', step: 100, min: 0, max: 1000000, live: 'live' },
                { path: 'guild.autoEventChance',  label: '⚡ 自動事件機率',   type: 'num', step: 0.05, min: 0, max: 1, live: 'live', hint: '徵收後觸發的機率' },
                { path: 'guild.autoEventGivesRewards', label: '⚡ 自動事件給資源', type: 'bool', live: 'live', hint: 'false = 純氛圍；true = 全額獎勵且不扣成本' },
                { path: 'guild.harvestMult',      label: '徵收生產倍率',     type: 'num', step: 0.1, min: 0, max: 20, live: 'dead' }
            ]
        },
        {
            id: 'companionPet',
            title: '⑫ 🤝 群俠／🐉 靈獸',
            desc: '只有全域倍率已接線。',
            fields: [
                { path: 'companionPet.companionGrowth', label: '群俠每階光環成長', type: 'num', step: 0.01, min: 0, max: 5, live: 'dead', hint: '0.15 = 每階 +15%' },
                { path: 'companionPet.petGrowth',       label: '靈獸每級光環成長', type: 'num', step: 0.01, min: 0, max: 5, live: 'dead', hint: '0.16 = 每級 +16%' },
                { path: 'companionPet.allBonusMult',    label: '⚡ 全域數值倍率',  type: 'num', step: 0.1, min: 0, max: 20, live: 'reapply' },
                { path: 'companionPet.companionUpgradePow', label: '群俠升階曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'companionPet.petFeedGoldPow',  label: '靈獸餵養金曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' },
                { path: 'companionPet.petFeedSpPow',    label: '靈獸餵養點曲線底數', type: 'num', step: 0.05, min: 1, max: 3, live: 'dead' }
            ]
        },
        {
            id: 'offline',
            title: '⑬ 🧘 離線掛機',
            desc: '⚠️ 此區段全部未接線（程式內部常數）。',
            fields: [
                { path: 'offline.maxOfflineSeconds', label: '單次離線累積上限 (秒)', type: 'num', step: 3600, min: 0, max: 604800, live: 'dead' },
                { path: 'offline.minTriggerSeconds', label: '離線判定門檻 (秒)',     type: 'num', step: 10, min: 0, max: 3600, live: 'dead' },
                { path: 'offline.maxCurrencyMult',   label: '通貨放大上限 (倍)',     type: 'num', step: 1, min: 1, max: 1000, live: 'dead' },
                { path: 'offline.maxEquipDrops',     label: '裝備發放上限 (件)',     type: 'num', step: 1, min: 0, max: 200, live: 'dead' },
                { path: 'offline.maxGuildCycles',    label: '幫會模擬上限 (輪)',     type: 'num', step: 5, min: 0, max: 500, live: 'dead' },
                { path: 'offline.maxExpCycles',      label: '探險模擬上限 (輪)',     type: 'num', step: 5, min: 0, max: 500, live: 'dead' },
                { path: 'offline.checkIntervalMs',   label: '離線檢查頻率 (ms)',     type: 'num', step: 1000, min: 1000, max: 300000, live: 'dead' }
            ]
        },
        {
            id: 'ui',
            title: '⑭ 🖥️ 介面與其他',
            desc: '存檔與徵收間隔已接線（改完自動重建計時器）。',
            fields: [
                { path: 'ui.maxLogEntries',          label: '日誌最多保留筆數', type: 'num', step: 10, min: 10, max: 1000, live: 'dead' },
                { path: 'ui.autoSaveIntervalMs',     label: '⚡ 自動存檔間隔 (ms)', type: 'num', step: 1000, min: 5000, max: 600000, live: 'live' },
                { path: 'ui.guildHarvestIntervalMs', label: '⚡ 幫會徵收間隔 (ms)', type: 'num', step: 1000, min: 1000, max: 600000, live: 'live' },
                { path: 'ui.expeditionDurationSec',  label: '探險週期 (秒)',     type: 'num', step: 10, min: 10, max: 3600, live: 'dead' },
                { path: 'ui.autoRepeatDelayMs',      label: '自動連刷等待 (ms)', type: 'num', step: 100, min: 100, max: 60000, live: 'dead' },
                { path: 'ui.autoBattleIntervalMs',   label: '自動戰鬥間隔 (ms)', type: 'num', step: 100, min: 100, max: 60000, live: 'dead' }
            ]
        }
    ];

    // ══════════════════════════════════════════════════════════════════
    //  ③ 工具函式
    // ══════════════════════════════════════════════════════════════════
    function getByPath(root, path) {
        var parts = path.split('.');
        var cur = root;
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function setByPath(root, path, val) {
        var parts = path.split('.');
        var cur = root;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') return false;
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = val;
        return true;
    }

    var LIVE_LABEL = {
        live:    { text: '即時',   color: '#4ade80', bg: 'rgba(74,222,128,0.14)' },
        reapply: { text: '重套用', color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
        dead:    { text: '未接線', color: '#64748b', bg: 'rgba(100,116,139,0.14)' }
    };

    // ══════════════════════════════════════════════════════════════════
    //  ④ 作弊面板
    // ══════════════════════════════════════════════════════════════════
    class CheatPanel {
        constructor(app) {
            this.app = app;
            this.modalEl = null;
            this.bodyEl = null;
            this.diffBarEl = null;
            this._pendingReapply = null;
            this._pendingLight = null;
            this._statusTimer = null;
            this._refs = {};
            this.currentDifficulty = null;

            this.injectButton();
            this.buildModal();
        }

        injectButton() {
            var sysCtrl = document.querySelector('.system-controls');
            if (!sysCtrl || document.getElementById('btn-cheat-panel')) return;

            var btn = document.createElement('button');
            btn.id = 'btn-cheat-panel';
            btn.className = 'sys-btn';
            btn.style.borderColor = '#f472b6';
            btn.style.color = '#f9a8d4';
            btn.textContent = '🛠️ 作弊面板';

            var self = this;
            btn.addEventListener('click', function () { self.open(); });

            // 重啟鈕已移至頂部最左，故直接附加至系統控制列尾端
            sysCtrl.appendChild(btn);
        }

        buildModal() {
            if (document.getElementById('hy-cheat-modal')) return;

            var modal = document.createElement('div');
            modal.id = 'hy-cheat-modal';
            modal.className = 'hidden';
            modal.style.cssText =
                'position:fixed; inset:0; background:rgba(0,0,0,0.82); z-index:100000; ' +
                'display:none; align-items:center; justify-content:center; padding:12px;';

            modal.innerHTML =
                '<div style="background:#0f141c; border:2px solid #f472b6; border-radius:10px; ' +
                        'max-width:1040px; width:100%; max-height:92vh; display:flex; flex-direction:column; ' +
                        'box-shadow:0 0 30px rgba(244,114,182,0.25); color:#e2e8f0; ' +
                        'font-family:Microsoft JhengHei,PingFang TC,sans-serif;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                            'padding:12px 16px; border-bottom:1px solid #2e3b4e; flex-shrink:0;">' +
                        '<div>' +
                            '<h3 style="margin:0; color:#f9a8d4; font-size:1.1rem;">🛠️ 時空作弊面板 — 即時調整全遊戲參數</h3>' +
                            '<div id="cheat-version-line" style="font-size:0.76rem; color:#64748b; margin-top:3px;"></div>' +
                        '</div>' +
                        '<button id="btn-close-cheat-modal" class="action-btn" style="padding:4px 12px;">✖ 關閉</button>' +
                    '</div>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; ' +
                            'padding:10px 16px; border-bottom:1px solid #2e3b4e; background:#121822; flex-shrink:0;">' +
                        '<button id="btn-cheat-reapply" class="btn-primary" style="padding:6px 14px; font-size:0.82rem;">🔄 重新套用</button>' +
                        '<button id="btn-cheat-reset" class="action-btn" style="padding:6px 14px; font-size:0.82rem; border-color:#f59e0b; color:#fbbf24;">↩️ 還原全部預設</button>' +
                        '<button id="btn-cheat-copy" class="action-btn" style="padding:6px 14px; font-size:0.82rem; border-color:#38bdf8; color:#7dd3fc;">📋 複製 JSON</button>' +
                        '<span style="margin-left:auto; font-size:0.75rem; color:#64748b;">變更後約 0.5 秒自動套用</span>' +
                        '<span id="cheat-status" style="font-size:0.75rem; color:#4ade80; min-width:100px; text-align:right;"></span>' +
                    '</div>' +
                    '<div id="cheat-difficulty-bar" style="padding:10px 16px; background:#131a24; ' +
                            'border-bottom:1px solid #2e3b4e; flex-shrink:0;"></div>' +
                    '<div style="padding:8px 16px; background:#0d1219; border-bottom:1px solid #2e3b4e; ' +
                            'font-size:0.74rem; color:#94a3b8; display:flex; gap:14px; flex-wrap:wrap; flex-shrink:0;">' +
                        '<span><b style="color:#4ade80;">即時</b> = 改完立即生效</span>' +
                        '<span><b style="color:#fbbf24;">重套用</b> = 需按「重新套用」或等自動套用</span>' +
                        '<span><b style="color:#64748b;">未接線</b> = 程式未讀取，改了沒有效果</span>' +
                    '</div>' +
                    '<div id="cheat-modal-body" style="flex:1 1 auto; overflow-y:auto; padding:12px 16px;"></div>' +
                    '<div style="padding:10px 16px; border-top:1px solid #2e3b4e; text-align:right; flex-shrink:0;">' +
                        '<button id="btn-confirm-cheat-modal" class="btn-primary" style="padding:8px 22px;">✅ 完成</button>' +
                    '</div>' +
                '</div>';

            document.body.appendChild(modal);
            this.modalEl = modal;
            this.bodyEl = modal.querySelector('#cheat-modal-body');
            this.diffBarEl = modal.querySelector('#cheat-difficulty-bar');

            var self = this;
            var closeFn = function () { self.close(); };
            modal.querySelector('#btn-close-cheat-modal').addEventListener('click', closeFn);
            modal.querySelector('#btn-confirm-cheat-modal').addEventListener('click', closeFn);

            modal.addEventListener('click', function (e) {
                if (e.target === modal) self.close();
            });

            modal.querySelector('#btn-cheat-reapply').addEventListener('click', function () {
                window.HY.GameConfig.reapply();
                self.syncAllInputs();
                self.refreshDifficultyBar();
                self.flashStatus('✅ 已重新套用', '#4ade80');
            });

            modal.querySelector('#btn-cheat-reset').addEventListener('click', function () {
                if (!confirm('確定要將所有參數還原為預設值嗎？\n（難度模式會回到「⚔️ 普通」）')) return;
                window.HY.GameConfig.resetToDefaults();
                self.currentDifficulty = 'normal';
                try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, 'normal'); } catch (e) {}
                self.syncAllInputs();
                self.refreshDifficultyBar();
                self.flashStatus('↩️ 已還原預設', '#fbbf24');
            });

            modal.querySelector('#btn-cheat-copy').addEventListener('click', function () {
                self.copyJsonToClipboard();
            });
        }

        // ── 難度模式 ──
        renderDifficultyBar() {
            if (!this.diffBarEl) return;

            var self = this;
            var html = '';

            html +=
                '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                        'flex-wrap:wrap; gap:8px; margin-bottom:8px;">' +
                    '<div>' +
                        '<div style="color:#f9a8d4; font-weight:bold; font-size:0.9rem;">🎮 難度模式</div>' +
                        '<div style="color:#94a3b8; font-size:0.73rem; margin-top:2px;">' +
                            '一鍵套用 27 個平衡參數（不影響速度與元素補償等其他設定）' +
                        '</div>' +
                    '</div>' +
                    '<div id="cheat-diff-status" style="font-size:0.78rem; font-weight:bold;"></div>' +
                '</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">';

            DIFFICULTY_ORDER.forEach(function (id) {
                var p = DIFFICULTY_PRESETS[id];
                var isActive = (self.currentDifficulty === id);
                html +=
                    '<button class="cheat-diff-btn" data-diff="' + id + '" ' +
                        'style="cursor:pointer; text-align:left; padding:9px 11px; border-radius:6px; ' +
                        'border:2px solid ' + (isActive ? p.color : '#334155') + '; ' +
                        'background:' + (isActive ? 'rgba(' + self._hexToRgb(p.color) + ',0.15)' : '#18202c') + '; ' +
                        'transition:all 0.15s; font-family:inherit;">' +
                        '<div style="font-size:0.95rem; font-weight:bold; color:' + p.color + '; margin-bottom:2px;">' +
                            p.name + (isActive ? ' <span style="font-size:0.7rem;">✓</span>' : '') +
                        '</div>' +
                        '<div style="font-size:0.76rem; color:#cbd5e1; margin-bottom:2px;">' + p.short + '</div>' +
                        '<div style="font-size:0.72rem; color:#64748b; font-family:monospace;">' + p.summary + '</div>' +
                    '</button>';
            });

            html += '</div>';

            var curId = this.currentDifficulty;
            var curPreset = curId ? DIFFICULTY_PRESETS[curId] : null;
            var isCustom = this.detectCustomization();

            if (isCustom) {
                html +=
                    '<div style="margin-top:8px; padding:7px 10px; background:rgba(251,191,36,0.08); ' +
                            'border-left:3px solid #fbbf24; border-radius:4px; font-size:0.76rem; color:#fcd34d;">' +
                        '⚠️ 目前參數已被手動調整，<b>與任何難度模式都不完全相符</b>（標記為「🎯 自訂」）。' +
                    '</div>';
            } else if (curPreset) {
                html +=
                    '<div style="margin-top:8px; padding:7px 10px; background:rgba(74,222,128,0.06); ' +
                            'border-left:3px solid ' + curPreset.color + '; border-radius:4px; ' +
                            'font-size:0.76rem; color:#cbd5e1; line-height:1.5;">' +
                        '<b style="color:' + curPreset.color + ';">' + curPreset.name + '：</b>' +
                        curPreset.desc +
                    '</div>';
            } else {
                html +=
                    '<div style="margin-top:8px; padding:7px 10px; background:rgba(148,163,184,0.06); ' +
                            'border-left:3px solid #64748b; border-radius:4px; font-size:0.76rem; color:#94a3b8;">' +
                        '尚未選擇難度模式。點擊上方任一模式即可一鍵套用。' +
                    '</div>';
            }

            this.diffBarEl.innerHTML = html;

            this.diffBarEl.querySelectorAll('.cheat-diff-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self.applyDifficulty(btn.dataset.diff);
                });
            });

            var statusEl = this.diffBarEl.querySelector('#cheat-diff-status');
            if (statusEl) {
                if (isCustom) {
                    statusEl.innerHTML = '<span style="color:#fbbf24;">🎯 自訂</span>';
                } else if (curPreset) {
                    statusEl.innerHTML = '當前：<span style="color:' + curPreset.color + ';">' +
                        curPreset.name + '</span>';
                } else {
                    statusEl.innerHTML = '<span style="color:#64748b;">未選擇</span>';
                }
            }
        }

        refreshDifficultyBar() {
            this.renderDifficultyBar();
        }

        _hexToRgb(hex) {
            var h = String(hex || '').replace('#', '');
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            var n = parseInt(h, 16);
            if (isNaN(n)) return '148,163,184';
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
        }

        detectCustomization() {
            var CFG = window.HY.GameConfig;
            if (!CFG) return false;

            var i, j, path, cur, expected;

            if (this.currentDifficulty && DIFFICULTY_PRESETS[this.currentDifficulty]) {
                var preset = DIFFICULTY_PRESETS[this.currentDifficulty];
                for (i = 0; i < DIFFICULTY_PARAM_KEYS.length; i++) {
                    path = DIFFICULTY_PARAM_KEYS[i];
                    cur = getByPath(CFG, path);
                    expected = getByPath(preset.params, path);
                    if (expected === undefined) continue;
                    if (typeof cur === 'number' && typeof expected === 'number') {
                        if (Math.abs(cur - expected) > 1e-9) return true;
                    } else if (cur !== expected) {
                        return true;
                    }
                }
                return false;
            }

            for (var k = 0; k < DIFFICULTY_ORDER.length; k++) {
                var id = DIFFICULTY_ORDER[k];
                var p = DIFFICULTY_PRESETS[id];
                var matches = true;
                for (j = 0; j < DIFFICULTY_PARAM_KEYS.length; j++) {
                    var path2 = DIFFICULTY_PARAM_KEYS[j];
                    var exp2 = getByPath(p.params, path2);
                    if (exp2 === undefined) continue;
                    var cur2 = getByPath(CFG, path2);
                    if (typeof cur2 === 'number' && typeof exp2 === 'number') {
                        if (Math.abs(cur2 - exp2) > 1e-9) { matches = false; break; }
                    } else if (cur2 !== exp2) { matches = false; break; }
                }
                if (matches) {
                    this.currentDifficulty = id;
                    try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, id); } catch (e) {}
                    return false;
                }
            }
            return true;
        }

        applyDifficulty(id) {
            var preset = DIFFICULTY_PRESETS[id];
            var CFG = window.HY.GameConfig;
            if (!preset || !CFG) return;

            var applied = 0;
            Object.keys(preset.params).forEach(function (path) {
                if (setByPath(CFG, path, preset.params[path])) applied += 1;
            });

            this.currentDifficulty = id;
            try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, id); } catch (e) {}

            this.syncAllInputs();
            window.HY.GameConfig.reapply();
            this.renderDifficultyBar();

            this.flashStatus('🎮 已套用 ' + preset.name + '（' + applied + ' 項）', preset.color);
            console.log('[CheatPanel] 已套用難度：' + preset.name + '（' + applied + ' 個參數）');
        }

        // ── 渲染表單 ──
        renderAll() {
            if (!this.bodyEl) return;
            var CFG = window.HY.GameConfig;
            if (!CFG) {
                this.bodyEl.innerHTML = '<p style="color:#f87171;">⚠️ HY.GameConfig 尚未載入。</p>';
                return;
            }

            this._refs = {};
            var self = this;
            var html = '';

            SECTIONS.forEach(function (sec, secIdx) {
                var liveCount = sec.fields.filter(function (f) { return f.live !== 'dead'; }).length;

                html +=
                    '<details ' + (secIdx === 0 ? 'open' : '') + ' style="background:#121822; border:1px solid #2e3b4e; ' +
                            'border-radius:6px; margin-bottom:10px; overflow:hidden;">' +
                        '<summary style="cursor:pointer; padding:10px 14px; user-select:none; ' +
                                'display:flex; justify-content:space-between; align-items:center; gap:10px; ' +
                                'background:#18202c; list-style:none;">' +
                            '<div style="min-width:0;">' +
                                '<div style="color:#f9a8d4; font-weight:bold; font-size:0.95rem;">' + sec.title +
                                    ' <span style="color:#64748b; font-weight:normal; font-size:0.76rem;">' +
                                    '（' + liveCount + '/' + sec.fields.length + ' 已接線）</span></div>' +
                                '<div style="color:#94a3b8; font-size:0.75rem; margin-top:2px;">' + (sec.desc || '') + '</div>' +
                            '</div>' +
                        '</summary>' +
                        '<div style="padding:10px 14px; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:8px 14px;">';

                sec.fields.forEach(function (f) {
                    html += self.buildFieldHtml(f);
                });

                html += '</div></details>';
            });

            this.bodyEl.innerHTML = html;

            SECTIONS.forEach(function (sec) {
                sec.fields.forEach(function (f) {
                    self.bindField(f);
                });
            });

            var verEl = this.modalEl.querySelector('#cheat-version-line');
            if (verEl) {
                var totalFields = 0, totalDead = 0;
                SECTIONS.forEach(function (s) {
                    s.fields.forEach(function (f) {
                        totalFields++;
                        if (f.live === 'dead') totalDead++;
                    });
                });
                verEl.textContent = '設定檔版本 ' + (CFG.version || '?') +
                    ' ｜ 共 ' + totalFields + ' 個參數（' + (totalFields - totalDead) + ' 已接線 / ' + totalDead + ' 未接線）';
            }
        }

        buildFieldHtml(f) {
            var CFG = window.HY.GameConfig;
            var val = getByPath(CFG, f.path);
            var tag = LIVE_LABEL[f.live] || LIVE_LABEL.dead;
            var id = 'cheat-field-' + f.path.replace(/\./g, '_');
            var isDead = (f.live === 'dead');
            var isDiffParam = (DIFFICULTY_PARAM_KEYS.indexOf(f.path) !== -1);

            var inputHtml = '';
            if (f.type === 'bool') {
                inputHtml =
                    '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; ' +
                            'background:#0d1219; border:1px solid #334155; border-radius:4px; padding:5px 8px; flex:1;">' +
                        '<input type="checkbox" id="' + id + '"' + (val ? ' checked' : '') +
                            (isDead ? ' style="opacity:0.5;"' : '') + '>' +
                        '<span style="font-size:0.78rem; color:' + (val ? '#4ade80' : '#94a3b8') + ';" ' +
                            'id="' + id + '-state">' + (val ? '開啟' : '關閉') + '</span>' +
                    '</label>';
            } else if (f.type === 'arr') {
                var arrText = Array.isArray(val) ? val.join(',') : '';
                inputHtml =
                    '<input type="text" id="' + id + '" value="' + arrText + '" ' +
                        'style="width:100%; background:#0d1219; color:#fbbf24; border:1px solid #334155; ' +
                        'border-radius:4px; padding:5px 8px; font-size:0.78rem; font-family:monospace;" ' +
                        'placeholder="35,28,20,12,5">';
            } else {
                var stepAttr = (f.step !== undefined) ? (' step="' + f.step + '"') : '';
                var minAttr  = (f.min  !== undefined) ? (' min="'  + f.min  + '"') : '';
                var maxAttr  = (f.max  !== undefined) ? (' max="'  + f.max  + '"') : '';
                inputHtml =
                    '<input type="number" id="' + id + '" value="' + (val === undefined ? '' : val) + '"' +
                        stepAttr + minAttr + maxAttr + ' ' +
                        'style="width:100%; background:#0d1219; color:#fbbf24; border:1px solid #334155; ' +
                        'border-radius:4px; padding:5px 8px; font-size:0.8rem; font-family:monospace;">';
            }

            var hintAttr = f.hint ? (' — ' + f.hint) : '';

            return '' +
                '<div style="background:' + (isDead ? 'rgba(100,116,139,0.06)' : 'transparent') + '; ' +
                        'border-radius:5px; padding:6px 8px;' + (isDead ? ' opacity:0.72;' : '') + '">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">' +
                        '<span style="font-size:0.78rem; color:#cbd5e1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" ' +
                                'title="' + f.path + hintAttr + '">' +
                            (isDiffParam ? '<span title="此參數由難度模式控制" style="color:#f472b6;">🎮</span> ' : '') +
                            f.label +
                        '</span>' +
                        '<span style="flex:0 0 auto; font-size:0.68rem; padding:0 5px; border-radius:3px; ' +
                                'border:1px solid ' + tag.color + '; color:' + tag.color + '; background:' + tag.bg + ';">' +
                            tag.text +
                        '</span>' +
                    '</div>' +
                    '<div style="display:flex; align-items:center; gap:6px;">' + inputHtml + '</div>' +
                    '<div style="font-size:0.68rem; color:#64748b; margin-top:3px; font-family:monospace; ' +
                            'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.path + '</div>' +
                    (f.hint ? '<div style="font-size:0.68rem; color:#7c8ba1; margin-top:2px; line-height:1.35;">' + f.hint + '</div>' : '') +
                '</div>';
        }

        bindField(f) {
            var CFG = window.HY.GameConfig;
            var id = 'cheat-field-' + f.path.replace(/\./g, '_');
            var el = document.getElementById(id);
            if (!el) return;

            this._refs[f.path] = el;
            var self = this;
            var isDiffParam = (DIFFICULTY_PARAM_KEYS.indexOf(f.path) !== -1);

            el.addEventListener('change', function () {
                var newVal;

                if (f.type === 'bool') {
                    newVal = !!el.checked;
                    var stateEl = document.getElementById(id + '-state');
                    if (stateEl) {
                        stateEl.textContent = newVal ? '開啟' : '關閉';
                        stateEl.style.color = newVal ? '#4ade80' : '#94a3b8';
                    }
                } else if (f.type === 'arr') {
                    newVal = el.value.split(',')
                        .map(function (s) { return parseFloat(s.trim()); })
                        .filter(function (n) { return !isNaN(n); });
                    if (newVal.length === 0) {
                        self.flashStatus('⚠️ 陣列格式錯誤', '#f87171');
                        return;
                    }
                } else {
                    var parsed = parseFloat(el.value);
                    if (isNaN(parsed)) {
                        var cur = getByPath(CFG, f.path);
                        el.value = (cur === undefined ? '' : cur);
                        self.flashStatus('⚠️ 請輸入數字', '#f87171');
                        return;
                    }
                    if (f.min !== undefined && parsed < f.min) parsed = f.min;
                    if (f.max !== undefined && parsed > f.max) parsed = f.max;
                    el.value = parsed;
                    newVal = parsed;
                }

                var ok = setByPath(CFG, f.path, newVal);
                if (!ok) {
                    self.flashStatus('⚠️ 寫入失敗', '#f87171');
                    return;
                }

                self.flashStatus('✏️ 已修改', '#fbbf24');

                if (isDiffParam) self.refreshDifficultyBar();

                if (f.live === 'reapply') {
                    self.scheduleReapply();
                } else if (f.live === 'live') {
                    self.scheduleLightRefresh();
                }
            });
        }

        scheduleReapply() {
            var self = this;
            if (this._pendingReapply) clearTimeout(this._pendingReapply);
            this._pendingReapply = setTimeout(function () {
                self._pendingReapply = null;
                window.HY.GameConfig.reapply();
                self.syncAllInputs();
                self.refreshDifficultyBar();
                self.flashStatus('✅ 已套用', '#4ade80');
            }, 500);
        }

        scheduleLightRefresh() {
            var self = this;
            if (this._pendingLight) clearTimeout(this._pendingLight);
            this._pendingLight = setTimeout(function () {
                self._pendingLight = null;
                try {
                    if (self.app && typeof self.app.renderAll === 'function') self.app.renderAll();
                } catch (e) {}
                self.flashStatus('✅ 即時生效', '#4ade80');
            }, 500);
        }

        syncAllInputs() {
            var CFG = window.HY.GameConfig;
            var self = this;
            Object.keys(this._refs).forEach(function (path) {
                var el = self._refs[path];
                if (!el) return;
                var val = getByPath(CFG, path);
                if (el.type === 'checkbox') {
                    el.checked = !!val;
                    var stateEl = document.getElementById(el.id + '-state');
                    if (stateEl) {
                        stateEl.textContent = val ? '開啟' : '關閉';
                        stateEl.style.color = val ? '#4ade80' : '#94a3b8';
                    }
                } else if (el.type === 'text') {
                    el.value = Array.isArray(val) ? val.join(',') : '';
                } else {
                    el.value = (val === undefined ? '' : val);
                }
            });
        }

        flashStatus(text, color) {
            var el = this.modalEl && this.modalEl.querySelector('#cheat-status');
            if (!el) return;
            el.textContent = text;
            el.style.color = color || '#4ade80';
            if (this._statusTimer) clearTimeout(this._statusTimer);
            this._statusTimer = setTimeout(function () {
                if (el) el.textContent = '';
            }, 2400);
        }

        copyJsonToClipboard() {
            var CFG = window.HY.GameConfig;
            var out = { version: CFG.version };
            (CFG.SECTION_KEYS || []).forEach(function (k) {
                if (CFG[k]) out[k] = CFG[k];
            });
            var text = JSON.stringify(out, null, 2);

            var self = this;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    self.flashStatus('📋 已複製 JSON', '#7dd3fc');
                }).catch(function () {
                    self._fallbackCopy(text);
                });
            } else {
                this._fallbackCopy(text);
            }
        }

        _fallbackCopy(text) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed; left:-9999px;';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                this.flashStatus('📋 已複製 JSON', '#7dd3fc');
            } catch (e) {
                console.log('[CheatPanel] 複製失敗，已印在 Console：');
                console.log(text);
                this.flashStatus('已印在 Console', '#fbbf24');
            }
            document.body.removeChild(ta);
        }

        open() {
            if (!this.modalEl) this.buildModal();

            if (this.currentDifficulty === null) {
                var saved = null;
                try { saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY); } catch (e) {}
                if (saved && DIFFICULTY_PRESETS[saved]) {
                    this.currentDifficulty = saved;
                } else {
                    this.detectCustomization();
                }
            }

            this.renderAll();
            this.renderDifficultyBar();

            this.modalEl.classList.remove('hidden');
            this.modalEl.style.display = 'flex';
        }

        close() {
            if (!this.modalEl) return;
            this.modalEl.classList.add('hidden');
            this.modalEl.style.display = 'none';
        }
    }

    // ⭐ 真正的類別定義完成，覆蓋掉最上方的佔位函式
    window.HY.CheatPanel = CheatPanel;

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            try {
                var game = window.HY.game;
                if (game && window.HY.GameConfig) {
                    window.HY.cheatPanel = new CheatPanel(game);
                }
            } catch (e) {
                console.error('[CheatPanel] ✗ 實例化失敗：', e, e && e.stack);
            }
        }, 220);
    });

    // 供 Console 除錯
    window.HY.CheatPanel.DIFFICULTY_PRESETS = DIFFICULTY_PRESETS;
    window.HY.CheatPanel.SECTIONS = SECTIONS;

    // ⭐ 載入成功訊息（看到這行 = 檔案完整且無語法錯誤）
    var _fieldCount = 0;
    SECTIONS.forEach(function (s) { _fieldCount += s.fields.length; });
    console.log('[cheatPanel] ✓ HY.CheatPanel 已定義（v3）｜' +
        SECTIONS.length + ' 個區段、' + _fieldCount + ' 個參數');

    } catch (err) {
        // ⚠️ 注意：try/catch 只能捕捉「執行期」錯誤。
        //    若檔案本身有語法錯誤（被截斷、括號不配對），整段程式根本不會執行，
        //    這個 catch 也不會被觸發。此時請用 Console 的 fetch 診斷指令檢查檔案完整性。
        console.error('[cheatPanel] ✗ 載入失敗！真正的原因如下：', err);
        console.error('[cheatPanel] 錯誤堆疊：', err && err.stack);
        throw err;
    }
})();