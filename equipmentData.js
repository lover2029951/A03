// js/equipmentData.js  (v40)
// PoE 裝備基底庫 + 傳奇暗金裝庫 + 黑市丹藥
//
// v40 修正：
//   ⭐ 移除所有裝備名稱的英文副名（如 (Diamond Ring)、(Stygian Vise)、(Headhunter)…）
// v39：內力上限相關屬性統一降低 500%（÷6）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    // 1. 💊 黑市常駐丹藥
    Data.ITEMS = {
        pill_hp: {
            id: 'pill_hp', name: '行軍散', type: 'consumable', reqLv: 1,
            desc: '基礎軍中良藥，恢復 350 點氣血與 120 點內力。', price: 35,
            effect: { hp: 350, mp: 120 }
        },
        pill_major: {
            id: 'pill_major', name: '九轉大還丹', type: 'consumable', reqLv: 25,
            desc: '星際精煉秘藥，瞬間恢復 4000 點氣血與 1200 點內力。', price: 300,
            effect: { hp: 4000, mp: 1200 }
        },
        pill_supreme: {
            id: 'pill_supreme', name: '慈航千年雪蓮丹', type: 'consumable', reqLv: 100,
            desc: '宗師級救命聖藥，瞬間恢復 35000 點氣血與 10000 點內力。', price: 2500,
            effect: { hp: 35000, mp: 10000 }
        },
        pill_sp: {
            id: 'pill_sp', name: '和氏璧異能碎片', type: 'consumable', reqLv: 5,
            desc: '蘊含奇異時空能量，直接獲得 500 點武學點數 (武點)。', price: 300,
            effect: { sp: 500 }
        }
    };

    // 2. 🗡️ PoE 十大部位裝備基底庫
    Data.POE_BASES = [
        // === 主手武器 (mainhand) ===
        { id: 'b_mh_1', name: '鏽鐵短劍', slotType: 'mainhand', reqLv: 1,   price: 60,   baseStats: { atk: 18 }, implicit: { statKey: 'hit', val: 6, text: '固定基底：精準命中率 +6%' } },
        { id: 'b_mh_2', name: '百煉長刀', slotType: 'mainhand', reqLv: 20,  price: 300,  baseStats: { atk: 85 }, implicit: { statKey: 'crit', val: 6, text: '固定基底：全域會心爆擊率 +6%' } },
        { id: 'b_mh_3', name: '帝國刺客短匕', slotType: 'mainhand', reqLv: 65, price: 1200, baseStats: { atk: 260 }, implicit: { statKey: 'crit', val: 12, text: '固定基底：全域會心爆擊率 +12%' } },
        { id: 'b_mh_4', name: '虎牙巨劍', slotType: 'mainhand', reqLv: 130, price: 4500, baseStats: { atk: 720 }, implicit: { statKey: 'hit', val: 16, text: '固定基底：精準命中率 +16%' } },
        { id: 'b_mh_5', name: '星芒戰劍', slotType: 'mainhand', reqLv: 210, price: 15000,baseStats: { atk: 1950 }, implicit: { statKey: 'crit', val: 18, text: '固定基底：全域會心爆擊率 +18%' } },
        { id: 'b_mh_6', name: '虛空反物質刃', slotType: 'mainhand', reqLv: 270, price: 45000,baseStats: { atk: 4800 }, implicit: { statKey: 'hit', val: 28, text: '固定基底：精準命中率 +28%' } },
        { id: 'b_mh_7', name: '太虛斬仙神劍', slotType: 'mainhand', reqLv: 300, price: 68000,baseStats: { atk: 6800 }, implicit: { statKey: 'crit', val: 22, text: '固定太虛基底：會心爆擊率 +22%' } },

        // === 副手武器/盾牌 (offhand) ===
        { id: 'b_oh_1', name: '杉木圓盾', slotType: 'offhand', reqLv: 1,   price: 50,   baseStats: { def: 15, maxHp: 60 }, implicit: { statKey: 'critRes', val: 5, text: '固定格擋基底：暴擊抵抗 +5%' } },
        { id: 'b_oh_2', name: '連環雙刺刃', slotType: 'offhand', reqLv: 30, price: 400, baseStats: { atk: 65, def: 30 }, implicit: { statKey: 'eva', val: 6, text: '固定雙持基底：輕功閃避率 +6%' } },
        { id: 'b_oh_3', name: '皇家堅毅塔盾', slotType: 'offhand', reqLv: 90, price: 2200,baseStats: { def: 260, maxHp: 900 }, implicit: { statKey: 'critRes', val: 14, text: '固定格擋基底：暴擊抵抗 +14%' } },
        { id: 'b_oh_4', name: '魔門天魔副手刃', slotType: 'offhand', reqLv: 170,price: 9000,baseStats: { atk: 850, def: 320 }, implicit: { statKey: 'crit', val: 14, text: '固定雙持基底：會心爆擊率 +14%' } },
        { id: 'b_oh_5', name: '不朽聖堂神盾', slotType: 'offhand', reqLv: 250,price: 35000,baseStats: { def: 1800, maxHp: 6500 }, implicit: { statKey: 'critRes', val: 25, text: '固定格擋基底：暴擊抵抗 +25%' } },
        { id: 'b_oh_6', name: '天道不滅神盾', slotType: 'offhand', reqLv: 290,price: 52000,baseStats: { def: 2600, maxHp: 9500 }, implicit: { statKey: 'critRes', val: 30, text: '固定格擋基底：暴擊抵抗 +30%' } },

        // === 頭部護具 (helmet) ===
        { id: 'b_hm_1', name: '鐵鍛戰盔', slotType: 'helmet', reqLv: 1,   price: 50,   baseStats: { def: 12, maxHp: 50 }, implicit: { statKey: 'critRes', val: 3, text: '固定基底：暴擊抵抗 +3%' } },
        { id: 'b_hm_2', name: '祭禮之冠', slotType: 'helmet', reqLv: 40,  price: 600,  baseStats: { def: 85, maxHp: 380, maxMp: 25 }, implicit: { statKey: 'maxMp', val: 20, text: '固定基底：最大內力 +20' } },
        { id: 'b_hm_3', name: '喚骨頭盔', slotType: 'helmet', reqLv: 110, price: 3200, baseStats: { def: 320, maxHp: 1500 }, implicit: { statKey: 'atk', val: 160, text: '固定基底：全域傷害攻擊 +160' } },
        { id: 'b_hm_4', name: '皇家常勝之冠', slotType: 'helmet', reqLv: 200,price: 14000,baseStats: { def: 950, maxHp: 4800 }, implicit: { statKey: 'critRes', val: 18, text: '固定基底：暴擊抵抗 +18%' } },
        { id: 'b_hm_5', name: '星穹戰盔', slotType: 'helmet', reqLv: 240, price: 21000, baseStats: { def: 1650, maxHp: 8200 }, implicit: { statKey: 'critRes', val: 22, text: '固定基底：暴擊抵抗 +22%' } },
        { id: 'b_hm_6', name: '魔神破滅之冠', slotType: 'helmet', reqLv: 290, price: 44000, baseStats: { def: 3400, maxHp: 17000 }, implicit: { statKey: 'atk', val: 900, text: '固定基底：全域攻擊 +900' } },

        // === 胸甲戰衣 (body) ===
        { id: 'b_bd_1', name: '簡陋皮甲', slotType: 'body', reqLv: 1,   price: 70,   baseStats: { def: 22, maxHp: 100 }, implicit: { statKey: 'eva', val: 3, text: '固定基底：輕功閃避率 +3%' } },
        { id: 'b_bd_2', name: '連身龍鱗甲', slotType: 'body', reqLv: 35,  price: 550,  baseStats: { def: 130, maxHp: 600 }, implicit: { statKey: 'critRes', val: 8, text: '固定基底：暴擊抵抗 +8%' } },
        { id: 'b_bd_3', name: '刺客密教戰衣', slotType: 'body', reqLv: 95, price: 2800, baseStats: { def: 380, maxHp: 1900 }, implicit: { statKey: 'eva', val: 12, text: '固定基底：輕功閃避率 +12%' } },
        { id: 'b_bd_4', name: '星芒戰鎧', slotType: 'body', reqLv: 180, price: 12000,baseStats: { def: 1250, maxHp: 6500 }, implicit: { statKey: 'critRes', val: 22, text: '固定星芒基底：全暴擊抵抗 +22%' } },
        { id: 'b_bd_5', name: '超維瓦爾祭袍', slotType: 'body', reqLv: 260, price: 42000,baseStats: { def: 2800, maxHp: 16000 }, implicit: { statKey: 'maxHp', val: 4000, text: '固定基底：最大氣血上限 +4000' } },
        { id: 'b_bd_6', name: '混沌魔神戰鎧', slotType: 'body', reqLv: 300, price: 62000,baseStats: { def: 4200, maxHp: 22000 }, implicit: { statKey: 'maxHp', val: 6000, text: '固定基底：最大氣血上限 +6000' } },

        // === 手套護手 (gloves) ===
        { id: 'b_gl_1', name: '生皮手套', slotType: 'gloves', reqLv: 1,   price: 45,   baseStats: { def: 8, atk: 8 }, implicit: { statKey: 'hit', val: 4, text: '固定基底：精準命中率 +4%' } },
        { id: 'b_gl_2', name: '釘扣護手', slotType: 'gloves', reqLv: 45,  price: 700,  baseStats: { def: 75, atk: 65 }, implicit: { statKey: 'atk', val: 55, text: '固定釘扣基底：近戰外功攻擊 +55' } },
        { id: 'b_gl_3', name: '擒拿護手', slotType: 'gloves', reqLv: 125, price: 3800, baseStats: { def: 280, atk: 240 }, implicit: { statKey: 'hit', val: 14, text: '固定擒拿基底：投射與外功命中 +14%' } },
        { id: 'b_gl_4', name: '藥劑師手套', slotType: 'gloves', reqLv: 220, price: 18000,baseStats: { def: 820, atk: 750 }, implicit: { statKey: 'crit', val: 15, text: '固定基底：會心爆擊率 +15%' } },
        { id: 'b_gl_5', name: '裂空擒龍手', slotType: 'gloves', reqLv: 260, price: 26000,baseStats: { def: 1250, atk: 1150 }, implicit: { statKey: 'crit', val: 18, text: '固定基底：會心爆擊率 +18%' } },
        { id: 'b_gl_6', name: '太初碎星手套', slotType: 'gloves', reqLv: 300, price: 48000,baseStats: { def: 1900, atk: 1800 }, implicit: { statKey: 'hit', val: 26, text: '固定基底：精準命中率 +26%' } },

        // === 戰靴履具 (boots) ===
        { id: 'b_bt_1', name: '羊毛短靴', slotType: 'boots', reqLv: 1,   price: 45,   baseStats: { def: 10, maxHp: 50 }, implicit: { statKey: 'eva', val: 4, text: '固定基底：輕功閃避率 +4%' } },
        { id: 'b_bt_2', name: '雙色輕功戰靴', slotType: 'boots', reqLv: 50, price: 800, baseStats: { def: 90, maxHp: 450 }, implicit: { statKey: 'critRes', val: 10, text: '固定異色基底：暴擊抵抗 +10%' } },
        { id: 'b_bt_3', name: '異色戰靴', slotType: 'boots', reqLv: 140, price: 4200, baseStats: { def: 350, maxHp: 1800 }, implicit: { statKey: 'eva', val: 14, text: '固定異色基底：輕功閃避率 +14%' } },
        { id: 'b_bt_4', name: '逃亡者魔靴', slotType: 'boots', reqLv: 230, price: 20000,baseStats: { def: 980, maxHp: 5200 }, implicit: { statKey: 'hit', val: 20, text: '固定基底：精準命中率 +20%' } },
        { id: 'b_bt_5', name: '踏虛履空戰靴', slotType: 'boots', reqLv: 260, price: 28000,baseStats: { def: 1450, maxHp: 7600 }, implicit: { statKey: 'eva', val: 18, text: '固定基底：輕功閃避率 +18%' } },
        { id: 'b_bt_6', name: '天道輪迴魔靴', slotType: 'boots', reqLv: 300, price: 50000,baseStats: { def: 2200, maxHp: 12000 }, implicit: { statKey: 'eva', val: 24, text: '固定基底：輕功閃避率 +24%' } },

        // === 腰帶束甲 (belt) ===
        { id: 'b_bl_1', name: '皮革腰帶', slotType: 'belt', reqLv: 1,   price: 55,   baseStats: { maxHp: 80 }, implicit: { statKey: 'maxHp', val: 120, text: '固定皮革基底：最大氣血 +120' } },
        { id: 'b_bl_2', name: '素布腰帶', slotType: 'belt', reqLv: 35,  price: 500,  baseStats: { atk: 45, def: 40 }, implicit: { statKey: 'atk', val: 65, text: '固定素布基底：物理外功傷害 +65' } },
        { id: 'b_bl_3', name: '重革腰帶', slotType: 'belt', reqLv: 100, price: 2600, baseStats: { def: 220, maxHp: 1100 }, implicit: { statKey: 'critRes', val: 14, text: '固定重革基底：暴擊抵抗 +14%' } },
        { id: 'b_bl_4', name: '深淵腰帶', slotType: 'belt', reqLv: 190, price: 15000,baseStats: { atk: 550, maxHp: 3800 }, implicit: { statKey: 'crit', val: 15, text: '固定深淵基底：深淵珠寶會心 +15%' } },
        { id: 'b_bl_5', name: '半神腰帶', slotType: 'belt', reqLv: 240, price: 24000,baseStats: { atk: 1000, maxHp: 7200 }, implicit: { statKey: 'crit', val: 18, text: '固定深淵基底：會心爆擊率 +18%' } },
        { id: 'b_bl_6', name: '深淵輪迴束甲', slotType: 'belt', reqLv: 300, price: 52000,baseStats: { atk: 1800, maxHp: 14500 }, implicit: { statKey: 'maxHp', val: 4800, text: '固定基底：最大氣血 +4800' } },

        // === 護身符/項鍊 (amulet) ===
        { id: 'b_am_1', name: '珊瑚護身符', slotType: 'amulet', reqLv: 1,   price: 60,   baseStats: { maxHp: 70, maxMp: 7 }, implicit: { statKey: 'maxHp', val: 100, text: '固定珊瑚基底：氣血回復與上限 +100' } },
        { id: 'b_am_2', name: '翠玉護身符', slotType: 'amulet', reqLv: 40,  price: 650,  baseStats: { atk: 50, maxMp: 33 }, implicit: { statKey: 'hit', val: 10, text: '固定翠玉基底：精準命中率 +10%' } },
        { id: 'b_am_3', name: '黑曜護身符', slotType: 'amulet', reqLv: 115, price: 3500, baseStats: { atk: 220, def: 150, maxHp: 1000, maxMp: 167 }, implicit: { statKey: 'critRes', val: 15, text: '固定黑曜基底：全能力與暴抗 +15%' } },
        { id: 'b_am_4', name: '大理石護身符', slotType: 'amulet', reqLv: 215,price: 19000,baseStats: { atk: 680, maxHp: 4500, maxMp: 300 }, implicit: { statKey: 'maxHp', val: 2500, text: '固定大理石基底：最大氣血 +2500' } },
        { id: 'b_am_5', name: '太虛星塵護符', slotType: 'amulet', reqLv: 280,price: 38000,baseStats: { atk: 1600, maxHp: 10500, maxMp: 700 }, implicit: { statKey: 'maxHp', val: 3600, text: '固定基底：最大氣血 +3600' } },

        // === 戒指 (ring → 可穿戴於 ring_left 或 ring_right) ===
        { id: 'b_rg_1', name: '鐵戒指', slotType: 'ring', reqLv: 1,   price: 50,   baseStats: { atk: 12 }, implicit: { statKey: 'atk', val: 18, text: '固定鐵戒基底：外功點傷 +18' } },
        { id: 'b_rg_2', name: '寶鑽戒指', slotType: 'ring', reqLv: 25, price: 450, baseStats: { atk: 35, maxMp: 17 }, implicit: { statKey: 'crit', val: 10, text: '固定寶鑽基底：全域會心爆擊率 +10%' } },
        { id: 'b_rg_3', name: '雙玉戒指', slotType: 'ring', reqLv: 80, price: 2000, baseStats: { def: 140, maxHp: 750 }, implicit: { statKey: 'critRes', val: 14, text: '固定雙玉基底：雙重暴擊抵抗 +14%' } },
        { id: 'b_rg_4', name: '蛋白石戒指', slotType: 'ring', reqLv: 165,price: 9500, baseStats: { atk: 420, maxHp: 2200 }, implicit: { statKey: 'hit', val: 18, text: '固定蛋白石基底：元素與內勁命中 +18%' } },
        { id: 'b_rg_5', name: '朱砂之戒', slotType: 'ring', reqLv: 240,price: 28000,baseStats: { atk: 950, maxHp: 6000 }, implicit: { statKey: 'maxHp', val: 3200, text: '固定朱砂基底：生命上限提升 +3200' } },
        { id: 'b_rg_6', name: '破碎虛空之戒', slotType: 'ring', reqLv: 290,price: 42000,baseStats: { atk: 2000, maxHp: 12000 }, implicit: { statKey: 'crit', val: 20, text: '固定基底：會心爆擊率 +20%' } }
    ];

    // 3. 🟠 PoE 傳奇暗金裝備庫
    Data.POE_UNIQUES = [
        {
            id: 'u_tabula',
            name: '無盡之衣・簡陋長袍',
            slotType: 'body',
            reqLv: 1,
            price: 1500,
            baseStats: { maxHp: 250, maxMp: 42, atk: 60 },
            implicit: { statKey: 'hit', val: 15, text: '🟠 傳奇白袍基底：六連全白洞・精準命中 +15%' },
            uniqueMods: [
                { statKey: 'atk', val: 120, text: '🟠 傳奇詞綴：無等級限制，外功與內勁攻擊 +120' },
                { statKey: 'crit', val: 10, text: '🟠 傳奇詞綴：會心爆擊率 +10%' }
            ]
        },
        {
            id: 'u_jingzhong',
            name: '少帥井中月・百煉長刀',
            slotType: 'mainhand',
            reqLv: 20,
            price: 3000,
            baseStats: { atk: 180 },
            implicit: { statKey: 'crit', val: 10, text: '🟠 傳奇基底：少帥刀意・會心爆擊率 +10%' },
            uniqueMods: [
                { statKey: 'atk', val: 220, text: '🟠 傳奇詞綴：井中八法刀氣加持，攻擊力 +220' },
                { statKey: 'hit', val: 16, text: '🟠 傳奇詞綴：速戰必中，精準命中率 +16%' },
                { statKey: 'eva', val: 8, text: '🟠 傳奇詞綴：螺旋氣場，輕功閃避率 +8%' }
            ]
        },
        {
            id: 'u_abyssus',
            name: '深淵之喚・自殺頭盔',
            slotType: 'helmet',
            reqLv: 60,
            price: 8000,
            baseStats: { def: 280, atk: 500 },
            implicit: { statKey: 'crit', val: 18, text: '🟠 傳奇自殺頭基底：近戰會心爆擊加成 +18%' },
            uniqueMods: [
                { statKey: 'atk', val: 650, text: '🟠 傳奇詞綴：附加巨額物理外功點傷 +650' },
                { statKey: 'hit', val: 15, text: '🟠 傳奇詞綴：嗜血狂戰，精準命中率 +15%' }
            ]
        },
        {
            id: 'u_headhunter',
            name: '獵首・皮革腰帶',
            slotType: 'belt',
            reqLv: 110,
            price: 45000,
            baseStats: { maxHp: 1800, atk: 600 },
            implicit: { statKey: 'maxHp', val: 800, text: '🟠 傳奇獵首基底：最大氣血 +800' },
            uniqueMods: [
                { statKey: 'atk', val: 1200, text: '🟠 傳奇詞綴：【竊取稀有怪詞綴】擊殺強敵威能，攻擊力 +1200' },
                { statKey: 'crit', val: 20, text: '🟠 傳奇詞綴：獵殺本能，會心爆擊率 +20%' },
                { statKey: 'hit', val: 25, text: '🟠 傳奇詞綴：致命索敵，精準命中率 +25%' },
                { statKey: 'eva', val: 15, text: '🟠 傳奇詞綴：極速奔襲，輕功閃避率 +15%' }
            ]
        },
        {
            id: 'u_fuyu_star',
            name: '覆雨劍・星芒神劍',
            slotType: 'mainhand',
            reqLv: 175,
            price: 85000,
            baseStats: { atk: 3200, maxHp: 3000 },
            implicit: { statKey: 'hit', val: 30, text: '🟠 傳奇星芒基底：極情於劍・精準命中 +30%' },
            uniqueMods: [
                { statKey: 'atk', val: 2800, text: '🟠 傳奇詞綴：該武器物理外功傷害大幅增加 +2800' },
                { statKey: 'crit', val: 24, text: '🟠 傳奇詞綴：洞庭劍雨，會心爆擊率 +24%' },
                { statKey: 'maxHp', val: 3500, text: '🟠 傳奇詞綴：劍神體魄，最大氣血上限 +3500' }
            ]
        },
        {
            id: 'u_mageblood',
            name: '魔血・重革腰帶',
            slotType: 'belt',
            reqLv: 210,
            price: 120000,
            baseStats: { def: 1500, maxHp: 6000 },
            implicit: { statKey: 'critRes', val: 30, text: '🟠 傳奇魔血基底：暴擊抵抗 +30%' },
            uniqueMods: [
                { statKey: 'def', val: 2200, text: '🟠 傳奇詞綴：永久藥劑護體，防禦力 +2200' },
                { statKey: 'critRes', val: 35, text: '🟠 傳奇詞綴：萬劫不傷，暴擊抵抗 +35%' },
                { statKey: 'eva', val: 22, text: '🟠 傳奇詞綴：水銀常駐，輕功閃避率 +22%' },
                { statKey: 'maxHp', val: 6500, text: '🟠 傳奇詞綴：魔血沸騰，最大氣血 +6500' }
            ]
        },
        {
            id: 'u_sheli_amulet',
            name: '邪帝舍利・黑曜護身符',
            slotType: 'amulet',
            reqLv: 245,
            price: 160000,
            baseStats: { atk: 2500, maxHp: 9000, maxMp: 667 },
            implicit: { statKey: 'crit', val: 25, text: '🟠 傳奇舍利基底：歷代邪帝元氣・會心爆擊 +25%' },
            uniqueMods: [
                { statKey: 'atk', val: 3800, text: '🟠 傳奇詞綴：所有武學技能等級與威力暴漲，攻擊力 +3800' },
                { statKey: 'hit', val: 35, text: '🟠 傳奇詞綴：天道感應，精準命中率 +35%' },
                { statKey: 'critRes', val: 30, text: '🟠 傳奇詞綴：魔種護體，暴擊抵抗 +30%' }
            ]
        }
    ];
})();