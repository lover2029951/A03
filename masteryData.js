// js/masteryData.js  (v47)
// 武道專精 18 門
//
// v47 修正：
//   ⭐ 舊 elemAtk / elemDef（數字）→ elAtk / elDef（八元素物件）
//   ⭐ 為每門專精指定對應元素（火焰→火、冰霜→冰、元素鏈→雷…）
//   ⭐ 說明文字由「靈根屬攻」改為「X元素攻擊 / X元素抗性」
//   ⭐ elAtk / elDef 為最終值，不套用 ÷5 政策
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.MASTERY = [
        // ── 核心抗性三門 ──
        {
            id: 'yijian_kuitian_bu', name: '【專精命中】天山聽風辨位決', category: '核心抗性', reqLv: 15,
            desc: '推算敵人軌跡之專精，料敵機先。每級提升：精準命中 +0.8%',
            spCost: 150, bonus: { hit: 4 }
        },
        {
            id: 'jiutian_nuoyi_bu', name: '【專精閃避】乾坤大挪移身法', category: '核心抗性', reqLv: 35,
            desc: '秘傳瞬移卸力步法，殘影留形。每級提升：輕功閃避 +0.6%',
            spCost: 220, bonus: { eva: 3 }
        },
        {
            id: 'jingang_chanding_shen', name: '【專精暴抗】少林金剛禪定身', category: '核心抗性', reqLv: 50,
            desc: '佛門護體樁功，不動如山化解致命要害。每級提升：暴擊抵抗 +0.8%',
            spCost: 280, bonus: { critRes: 4 }
        },

        // ── 魔獸世界風格 15 門專精 ──
        {
            id: 'wow_arms_blade', name: '【武器精通】劍刃風暴', category: '魔獸專精', reqLv: 60,
            desc: '如狂戰士般揮舞巨刃，每一擊都撕裂目標甲冑。每級提升：攻擊 +12、會心爆擊 +0.6%',
            spCost: 420, bonus: { atk: 60, crit: 3 }
        },
        {
            id: 'wow_fury_blood', name: '【狂怒精通】嗜血狂暴', category: '魔獸專精', reqLv: 75,
            desc: '以怒氣換取毀滅性的力量，血越熱越難阻擋。每級提升：攻擊 +16、最大氣血 +40',
            spCost: 560, bonus: { atk: 80, maxHp: 200 }
        },
        {
            id: 'wow_prot_shield', name: '【防護精通】盾牆壁壘', category: '魔獸專精', reqLv: 90,
            desc: '舉盾如城牆、寸步不退的鐵血守護者。每級提升：護體防禦 +14、氣血 +70、暴抗 +0.8%',
            spCost: 700, bonus: { def: 70, maxHp: 350, critRes: 4 }
        },
        {
            id: 'wow_fire_pyro', name: '【火焰精通】炎爆灼燒', category: '魔獸專精', reqLv: 105,
            desc: '引爆高熱火球，讓敵人在烈焰中化為灰燼。每級提升：火元素攻擊 +18、會心 +0.6%',
            spCost: 850, bonus: { elAtk: { fire: 18 }, crit: 3 }
        },
        {
            id: 'wow_frost_bone', name: '【冰霜精通】寒冰凍骨', category: '魔獸專精', reqLv: 120,
            desc: '以極寒之力凍結萬物，兼具攻擊與防護。每級提升：冰元素攻擊 +14、冰元素抗性 +8、暴抗 +0.6%',
            spCost: 1000, bonus: { elAtk: { ice: 14 }, elDef: { ice: 8 }, critRes: 3 }
        },
        {
            id: 'wow_holy_light', name: '【神聖精通】聖光治癒', category: '魔獸專精', reqLv: 135,
            desc: '以聖光庇護己身與同伴，堅不可摧。每級提升：氣血 +80、內力 +5、防禦 +8',
            spCost: 1150, bonus: { maxHp: 400, maxMp: 25, def: 40 }
        },
        {
            id: 'wow_shadow_void', name: '【暗影精通】暗言虛空', category: '魔獸專精', reqLv: 150,
            desc: '將心靈之力化為虛空暗影，無聲無息地蝕人心魄。每級提升：雷元素攻擊 +17、命中 +0.8%',
            spCost: 1300, bonus: { elAtk: { lightning: 17 }, hit: 4 }
        },
        {
            id: 'wow_feral_bite', name: '【野性精通】獸性撕咬', category: '魔獸專精', reqLv: 165,
            desc: '化身為野獸，以爪牙與本能獵殺獵物。每級提升：攻擊 +15、閃避 +0.6%',
            spCost: 1450, bonus: { atk: 75, eva: 3 }
        },
        {
            id: 'wow_balance_moon', name: '【平衡精通】月火蝕星', category: '魔獸專精', reqLv: 180,
            desc: '借日月星辰之力，攻守兼備的自然平衡之道。每級提升：木元素攻擊 +12、木元素抗性 +12、內力 +4',
            spCost: 1600, bonus: { elAtk: { wood: 12 }, elDef: { wood: 12 }, maxMp: 20 }
        },
        {
            id: 'wow_restore_spring', name: '【恢復精通】生命之泉', category: '魔獸專精', reqLv: 195,
            desc: '引動大地生命之泉，源源不絕地補養肉身。每級提升：氣血 +76、內力 +6',
            spCost: 1800, bonus: { maxHp: 380, maxMp: 30 }
        },
        {
            id: 'wow_retri_crusade', name: '【懲戒精通】十字軍打擊', category: '魔獸專精', reqLv: 210,
            desc: '聖光灌注武器，每一擊都帶著神聖的審判。每級提升：攻擊 +14、命中 +0.8%、會心 +0.4%',
            spCost: 2000, bonus: { atk: 70, hit: 4, crit: 2 }
        },
        {
            id: 'wow_assassin_poison', name: '【刺殺精通】致命毒藥', category: '魔獸專精', reqLv: 225,
            desc: '在暗影中佈下致命毒藥，一擊斃命。每級提升：會心爆擊 +1%、精準命中 +1%',
            spCost: 2200, bonus: { crit: 5, hit: 5 }
        },
        {
            id: 'wow_subtle_step', name: '【敏銳精通】暗影步', category: '魔獸專精', reqLv: 240,
            desc: '瞬息穿梭於暗影之間，讓對手連身影都捕捉不到。每級提升：輕功閃避 +1%、精準命中 +1%',
            spCost: 2500, bonus: { eva: 5, hit: 5 }
        },
        {
            id: 'wow_bm_heart', name: '【獸王精通】野獸之心', category: '魔獸專精', reqLv: 260,
            desc: '與獸群心靈相通，獲得超越人類的體魄與直覺。每級提升：攻擊 +13、氣血 +56、閃避 +0.6%',
            spCost: 2800, bonus: { atk: 65, maxHp: 280, eva: 3 }
        },
        {
            id: 'wow_elem_chain', name: '【元素精通】閃電鏈', category: '魔獸專精', reqLv: 290,
            desc: '引動天地元素共鳴，以奔雷之力貫穿一切防禦。每級提升：雷元素攻擊 +20、會心 +0.8%',
            spCost: 3200, bonus: { elAtk: { lightning: 20 }, crit: 4 }
        }
    ];
})();