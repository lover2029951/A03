// js/companionData.js  (v39)
// 原著群俠助戰數據 (COMPANIONS)
//   ⭐ 內力上限相關屬性統一降低 500%（÷6）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.COMPANIONS = {
        kou_zhong: {
            id: 'kou_zhong', name: '寇仲', title: '少帥軍主帥', reqLv: 3,
            desc: '大唐雙龍之一，手持井中月，每回合施展《井中八法》猛烈斬擊敵人。',
            recruitGold: 150, upgradeSpCost: 80, skillName: '井中八法・速戰', actionType: 'attack', powerMult: 0.65,
            passive: { atk: 15, crit: 5, hit: 4 }
        },
        xu_ziling: {
            id: 'xu_ziling', name: '徐子陵', title: '長生真氣傳人', reqLv: 12,
            desc: '大唐雙龍之一，通曉九字真言手印，每回合助戰並為主角回補內力與護體。',
            recruitGold: 300, upgradeSpCost: 110, skillName: '九字真言印', actionType: 'mp_support', powerMult: 0.50,
            passive: { def: 15, maxMp: 13, critRes: 6 }
        },
        shi_feixuan: {
            id: 'shi_feixuan', name: '師妃暄', title: '慈航靜齋聖女', reqLv: 30,
            desc: '清麗出塵的劍道仙子，每回合以色空劍氣傷敵，並大幅治療主角氣血。',
            recruitGold: 800, upgradeSpCost: 180, skillName: '色空劍法・清心', actionType: 'heal_support', powerMult: 0.60,
            passive: { maxHp: 220, def: 25, hit: 6, critRes: 10 }
        },
        wan_wan: {
            id: 'wan_wan', name: '婠婠', title: '陰癸派妖女', reqLv: 45,
            desc: '赤足踏歌的魔門天驕，每回合施展《天魔刃》對敵方造成極高無視防禦傷害。',
            recruitGold: 1200, upgradeSpCost: 240, skillName: '天魔刃・搜魂', actionType: 'true_damage', powerMult: 0.85,
            passive: { atk: 45, eva: 8, crit: 8, hit: 8 }
        },
        xiang_shaolong: {
            id: 'xiang_shaolong', name: '項少龍', title: '時空元祖太傅', reqLv: 75,
            desc: '穿越戰國的特種部隊精英，全方面提升主角攻防、命中與暴抗，發動百戰刀法合擊。',
            recruitGold: 2800, upgradeSpCost: 400, skillName: '墨子劍法・特種合擊', actionType: 'all_round', powerMult: 1.05,
            passive: { atk: 85, def: 60, maxHp: 500, hit: 12, critRes: 12 }
        },
        yan_fei: {
            id: 'yan_fei', name: '燕飛', title: '邊荒第一高手', reqLv: 120,
            desc: '《邊荒傳說》靈魂人物，蝶戀花劍融合丹劫，劍氣直指仙門。',
            recruitGold: 6500, upgradeSpCost: 800, skillName: '仙門劍訣・丹劫破', actionType: 'true_damage', powerMult: 1.25,
            passive: { atk: 180, crit: 12, hit: 16, critRes: 14, maxHp: 1200 }
        },
        lang_fanyun: {
            id: 'lang_fanyun', name: '浪翻雲', title: '覆雨劍神', reqLv: 165,
            desc: '洞庭湖怒蛟幫第一高手，因惜惜之死悟通天道，覆雨劍法無堅不摧。',
            recruitGold: 14000, upgradeSpCost: 1500, skillName: '覆雨劍法・極情於劍', actionType: 'true_damage', powerMult: 1.45,
            passive: { atk: 320, crit: 15, hit: 22, maxHp: 2400 }
        },
        pang_ban: {
            id: 'pang_ban', name: '龐斑', title: '魔師宮無上宗師', reqLv: 195,
            desc: '練成《道心種魔大法》的當世魔師，舉手投足皆引動天地磁場。',
            recruitGold: 25000, upgradeSpCost: 2600, skillName: '道心種魔・天魔解體', actionType: 'all_round', powerMult: 1.65,
            passive: { atk: 480, def: 260, maxHp: 4000, critRes: 20, hit: 20 }
        },
        long_ying: {
            id: 'long_ying', name: '龍鷹', title: '魔種大成・萬乘之主', reqLv: 230,
            desc: '《日月當空》主角，承襲邪帝向雨田道心種魔，與女帝武曌共掌天下。',
            recruitGold: 48000, upgradeSpCost: 4500, skillName: '道心種魔・日月當空', actionType: 'all_round', powerMult: 1.90,
            passive: { atk: 800, def: 450, maxHp: 7500, crit: 18, hit: 26, critRes: 24 }
        },
        ling_donglai: {
            id: 'ling_donglai', name: '令東來', title: '無上宗師・神遊物外', reqLv: 275,
            desc: '《破碎虛空》十絕關修道奇人，無上玄功臻至化境，直入天道。',
            recruitGold: 95000, upgradeSpCost: 8500, skillName: '無上玄功・十絕破虛', actionType: 'all_round', powerMult: 2.30,
            passive: { atk: 1500, def: 900, maxHp: 15000, crit: 22, eva: 18, hit: 35, critRes: 35 }
        }
    };
})();