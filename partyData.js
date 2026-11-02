// js/partyData.js
// 五人角色預設稱號 (PRESET_NAMES)。
//
// ⚠️ 本檔的 Data.FORMATIONS 為 **legacy 死資料**：
//    遊戲實際使用的陣法體系是 formationData.js 的 Data.XIANXIA_FORMATIONS
//    （修仙十五大陣法 + 靈根需求 + 種子式隨機分配）。
//    以下 4 個舊陣法從未被任何程式讀取，僅為向後相容而保留。
//    若確認無外部引用，可直接刪除整個 Data.FORMATIONS 區塊。
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.PRESET_NAMES = [
        '時空浪人・壹',
        '少帥傳人・貳',
        '慈航劍客・叁',
        '天魔行者・肆',
        '尋秦太傅・伍'
    ];

    // ─────────────────────────────────────────────
    // LEGACY：舊版「組隊合擊陣法」（未被讀取）
    //   現行陣法請見 formationData.js → Data.XIANXIA_FORMATIONS
    // ─────────────────────────────────────────────
    Data.LEGACY_FORMATIONS = {
        none: {
            id: 'none',
            name: '自由散陣',
            desc: '無特殊陣法約束，各憑本事迎敵。',
            bonus: { atkPct: 0, defPct: 0 }
        },
        shaoshuai_anguard: {
            id: 'shaoshuai_anguard',
            name: '少帥軍・鋒矢殺陣',
            desc: '寇仲領軍衝鋒之陣，全隊攻擊力提升 +15%！',
            bonus: { atkPct: 0.15, defPct: 0 }
        },
        cihang_circle: {
            id: 'cihang_circle',
            name: '慈航靜齋・蓮華劍陣',
            desc: '守望相助的佛門劍陣，全隊防禦力提升 +20%、攻擊 +5%！',
            bonus: { atkPct: 0.05, defPct: 0.20 }
        },
        tianmo_field: {
            id: 'tianmo_field',
            name: '陰癸魔門・天魔大陣',
            desc: '詭奇莫測的魔門合擊陣，全隊攻擊 +12%、防禦 +12%！',
            bonus: { atkPct: 0.12, defPct: 0.12 }
        }
    };

    // 別名：保持舊引用不報錯（若外部程式仍讀 Data.FORMATIONS）
    Data.FORMATIONS = Data.LEGACY_FORMATIONS;
})();