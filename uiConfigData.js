// js/uiConfigData.js  (v49)
// 全域設定 + 裝備槽位 + 自動戰鬥預設 + 掉落政策
//
// v49 修正：
//   ⭐ DEFAULT_AUTO_CONFIG 新增「隊友自動用藥」與「隊員技能輔助」設定
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.CONFIG = {
        MAX_LEVEL: 300,
        MAX_CHARS: 5,
        MAX_PARTY_SIZE: 5,
        REWARD_RATE: 0.085,
        AUTO_SAVE_INTERVAL: 30000,
        WELCOME_MSG: '⚡ 歡迎來到《黃易群俠傳 Web：Lv.300 破碎虛空傳奇》！已實裝 100% PoE 十部位裝備、固定上詞綴、白/藍/黃/暗金傳奇稀有度與通貨工藝！',
        RESET_CONFIRM_MSG: '確定要重啟時空嗎？這將清除目前的所有角色修為與進度！'
    };

    Data.EQUIP_SLOTS = {
        mainhand:   { id: 'mainhand',   name: '主手武器', icon: '🗡️' },
        offhand:    { id: 'offhand',    name: '副手/盾牌', icon: '🛡️' },
        helmet:     { id: 'helmet',     name: '頭部護具', icon: '🪖' },
        body:       { id: 'body',       name: '胸甲戰衣', icon: '🥋' },
        gloves:     { id: 'gloves',     name: '手套護手', icon: '🧤' },
        boots:      { id: 'boots',      name: '戰靴履具', icon: '🥾' },
        belt:       { id: 'belt',       name: '腰帶束甲', icon: '🎗️' },
        amulet:     { id: 'amulet',     name: '護身符項鍊', icon: '📿' },
        ring_left:  { id: 'ring_left',  name: '左手戒指', icon: '💍' },
        ring_right: { id: 'ring_right', name: '右手戒指', icon: '💍' }
    };

    Data.DEFAULT_AUTO_CONFIG = {
        // ══════ ① 自身用藥 ══════
        hpThreshold: 50,
        hpItemId: 'pill_hp',
        mpThreshold: 25,
        mpItemId: 'pill_hp',

        // ══════ ② ⭐ 隊友用藥（新增）══════
        allyUsePills: true,
        allyHpThreshold: 40,
        allyHpItemId: 'pill_major',
        allyMpThreshold: 20,
        allyMpItemId: 'pill_major',

        // ══════ ③ 自身選招 ══════
        lowHpSkillRule: 45,
        emergencySkillId: 'auto_heal',
        aoeWhenMulti: true,
        aoeSkillId: 'auto_aoe',
        primarySkillId: 'auto_best',

        // ══════ ④ ⭐ 隊員技能輔助（新增）══════
        allySupportEnabled: true,
        allyHealThreshold: 50,
        allyHealSkillId: 'auto_heal_ally',   // 'auto_heal_ally' | 'none' | skillId
        allySupportInterval: 1,              // 每 N 次出手檢查一次
        supportTargetRule: 'most_wounded'    // 'most_wounded' | 'leader' | 'random'
    };

    // ⭐ 掉落政策總開關
    Data.LOOT_POLICY = {
        combatDropsPills:      false,
        guildBuildingsDropPills: true,
        expeditionDropsPills:  true
    };
})();