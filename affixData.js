// js/affixData.js
// 專門存放：完整《流亡黯道 PoE》28 種稀有怪物詞綴（宿敵詞、精髓詞 Essence、狩獵紅獸詞 Bestiary、譫妄/深淵/超越/先驅/罪魂季賽詞）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    // 敵人稀有度階級設定 (最多 3 種詞綴同時共存)
    Data.RARITY_TIERS = {
        normal: { id: 'normal', name: '普通', minAffix: 0, maxAffix: 0, color: '#e2e8f0', statMult: 1.0,  rewardMult: 1.0 },
        magic:  { id: 'magic',  name: '魔法', minAffix: 1, maxAffix: 2, color: '#60a5fa', statMult: 1.3,  rewardMult: 1.5 },
        rare:   { id: 'rare',   name: '稀有', minAffix: 2, maxAffix: 3, color: '#fbbf24', statMult: 1.75, rewardMult: 2.5 }
    };

    // ⭐ 28 種 PoE 完整怪物詞綴庫
    Data.MONSTER_AFFIXES = {
        // ================= 【1. 宿敵核心詞綴 (Archnemesis)】 =================
        armored: {
            id: 'armored', category: '宿敵', name: '鋼筋鐵骨', color: '#94a3b8',
            desc: '護體罡氣極度凝實：防禦力 +60%、暴擊抵抗 +25%',
            statMod: { defPct: 0.60, critResFlat: 25 }
        },
        accurate: {
            id: 'accurate', category: '宿敵', name: '致命精準', color: '#f87171',
            desc: '洞悉弱點：命中率 +35%、會心爆擊率 +25%',
            statMod: { hitFlat: 35, critFlat: 25 }
        },
        vampiric: {
            id: 'vampiric', category: '宿敵', name: '嗜血狂徒', color: '#ef4444',
            desc: '生命偷取：攻擊時將造成傷害的 35% 轉化為自身氣血',
            onHitEffect: 'leech', leechRatio: 0.35
        },
        thorns: {
            id: 'thorns', category: '宿敵', name: '荊棘反傷', color: '#fb923c',
            desc: '反震真氣：受到攻擊時，反射 15% 傷害回擊出招者',
            onStruckEffect: 'thorns', thornsRatio: 0.15
        },
        hasted: {
            id: 'hasted', category: '宿敵', name: '急速狂暴', color: '#38bdf8',
            desc: '神速連擊：出手速度極快，每回合額外發動 1 次追擊！',
            extraAction: true
        },
        gargantuan: {
            id: 'gargantuan', category: '宿敵', name: '巨像豐沛', color: '#4ade80',
            desc: '氣血如海：最大氣血 +80%，每回合結束自動回復 8% 最大氣血',
            statMod: { hpPct: 0.80 }, turnEndRegen: 0.08
        },
        mana_siphon: {
            id: 'mana_siphon', category: '宿敵', name: '噬魔力場', color: '#818cf8',
            desc: '枯竭藍圈：攻擊命中時，額外燃燒並抽乾目標 15% 最大內力',
            onHitEffect: 'mana_burn', manaBurnRatio: 0.15
        },
        evasive: {
            id: 'evasive', category: '宿敵', name: '電光幻影', color: '#2dd4bf',
            desc: '殘影迷蹤：輕功閃避率 +30%、命中率 +15%',
            statMod: { evaFlat: 30, hitFlat: 15 }
        },
        crushing: {
            id: 'crushing', category: '宿敵', name: '毀滅碎甲', color: '#f43f5e',
            desc: '霸道重擊：攻擊力 +40%，且攻擊無視我方 35% 護體防禦',
            statMod: { atkPct: 0.40 }, armorPen: 0.35
        },
        arcing: {
            id: 'arcing', category: '宿敵', name: '雷霆連鎖', color: '#c084fc',
            desc: '連鎖電弧：攻擊時釋放連鎖氣勁，對我方全體隊員追加 30% 濺射傷害',
            onHitEffect: 'chain_aoe', chainRatio: 0.30
        },
        executioner: {
            id: 'executioner', category: '宿敵', name: '無情處刑', color: '#e11d48',
            desc: '冷血收割：對氣血低於 50% 的目標造成額外 +45% 處刑總傷害',
            executeBonus: 0.45
        },
        molten_shell: {
            id: 'molten_shell', category: '宿敵', name: '熔岩自爆', color: '#f59e0b',
            desc: '亡語火球：陣亡瞬間引爆真氣，對我方全體造成各自最大氣血 12% 的火焰傷害！',
            onDeathEffect: 'explode', explodeHpRatio: 0.12
        },
        temporal_bubble: {
            id: 'temporal_bubble', category: '宿敵', name: '時空罩子', color: '#f472b6',
            desc: '時間泡泡護罩：閃避率 +25%、防禦力 +40%，並削弱受擊暴擊率',
            statMod: { evaFlat: 25, defPct: 0.40, critResFlat: 30 }
        },

        // ================= 【2. 精髓禁錮詞綴 (Essence League)】 =================
        essence_hatred: {
            id: 'essence_hatred', category: '精髓', name: '精髓：憎恨之咆哮', color: '#38bdf8',
            desc: '【精髓怪】寒冰晶體護身：防禦 +50%、攻擊 +30%，擊中時凍結遲緩目標並吸取生機',
            statMod: { defPct: 0.50, atkPct: 0.30, critResFlat: 20 },
            onHitEffect: 'leech', leechRatio: 0.25, lootBonus: 1.5
        },
        essence_wrath: {
            id: 'essence_wrath', category: '精髓', name: '精髓：狂怒之尖嘯', color: '#facc15',
            desc: '【精髓怪】雷霆精髓暴走：攻擊力 +55%、會心爆擊率 +30%，攻擊釋放連鎖閃電',
            statMod: { atkPct: 0.55, critFlat: 30 },
            onHitEffect: 'chain_aoe', chainRatio: 0.25, lootBonus: 1.5
        },
        essence_torment: {
            id: 'essence_torment', category: '精髓', name: '精髓：苦痛之破空', color: '#a855f7',
            desc: '【精髓怪】精神折磨結晶：命中 +40%、無視 35% 防禦，擊中時抽乾目標 20% 內力',
            statMod: { hitFlat: 40 }, armorPen: 0.35,
            onHitEffect: 'mana_burn', manaBurnRatio: 0.20, lootBonus: 1.6
        },
        essence_greed: {
            id: 'essence_greed', category: '精髓', name: '精髓：貪婪之破聾', color: '#4ade80',
            desc: '【精髓怪】重金晶殼：最大氣血 +100%、反傷 12%，擊敗後掉寶率提升！',
            statMod: { hpPct: 1.0, defPct: 0.30 },
            onStruckEffect: 'thorns', thornsRatio: 0.12, lootBonus: 2.0
        },

        // ================= 【3. 埃inhar 狩獵魔物詞綴 (Bestiary Red Beasts)】 =================
        beast_farrul: {
            id: 'beast_farrul', category: '狩獵紅獸', name: '狩獵：費爾羅猛虎之魂', color: '#ef4444',
            desc: '【傳奇紅獸】叢林霸主：攻擊 +45%、爆擊 +25%，且每回合必定發動雙重撕咬追擊！',
            statMod: { atkPct: 0.45, critFlat: 25, hitFlat: 25 },
            extraAction: true, lootBonus: 1.8
        },
        beast_fenumus: {
            id: 'beast_fenumus', category: '狩獵紅獸', name: '狩獵：菲努姆斯毒蛛網', color: '#10b981',
            desc: '【傳奇紅獸】深淵毒網：閃避 +25%，攻擊同時偷取氣血並腐蝕目標內力',
            statMod: { evaFlat: 25, hpPct: 0.50 },
            onHitEffect: 'beast_venom', leechRatio: 0.30, manaBurnRatio: 0.12, lootBonus: 1.8
        },
        beast_saqawal: {
            id: 'beast_saqawal', category: '狩獵紅獸', name: '狩獵：薩卡瓦爾蒼空嵐', color: '#06b6d4',
            desc: '【傳奇紅獸】狂嵐護體：閃避 +35%，每回合回血 10% 並以旋風波及全隊',
            statMod: { evaFlat: 35, hitFlat: 25 },
            turnEndRegen: 0.10, onHitEffect: 'chain_aoe', chainRatio: 0.25, lootBonus: 1.8
        },
        beast_craicic: {
            id: 'beast_craicic', category: '狩獵紅獸', name: '狩獵：深海奇美拉硬殼', color: '#3b82f6',
            desc: '【傳奇紅獸】深海甲殼：氣血 +70%、防禦 +70%、暴抗 +35%，並反彈 18% 受擊傷害',
            statMod: { hpPct: 0.70, defPct: 0.70, critResFlat: 35 },
            onStruckEffect: 'thorns', thornsRatio: 0.18, lootBonus: 1.8
        },

        // ================= 【4. PoE 歷代季賽專屬詞綴 (Delirium / Beyond / Abyss / Harbinger / Torment)】 =================
        delirium_touched: {
            id: 'delirium_touched', category: '譫妄季賽', name: '譫妄迷霧：恐懼具象', color: '#cbd5e1',
            desc: '【譫妄季賽詞】迷霧減傷：最大氣血 +65%、防禦 +50%、攻擊 +35%，對低血目標處刑增傷',
            statMod: { hpPct: 0.65, defPct: 0.50, atkPct: 0.35 },
            executeBonus: 0.40, lootBonus: 1.7
        },
        beyond_demon: {
            id: 'beyond_demon', category: '超越季賽', name: '超越惡魔：血海降臨', color: '#dc2626',
            desc: '【超越季賽詞】異界惡魔：攻擊 +50%、吸血 30%，且每回合發動惡魔雙重連擊！',
            statMod: { atkPct: 0.50, critFlat: 20 },
            onHitEffect: 'leech', leechRatio: 0.30, extraAction: true, lootBonus: 1.9
        },
        abyssal_lich: {
            id: 'abyssal_lich', category: '深淵季賽', name: '深淵巫妖：冥河凝視', color: '#22c55e',
            desc: '【深淵季賽詞】冥河黑光：無視我方 35% 防禦，死亡時引發冥河屍爆傷及全隊',
            statMod: { atkPct: 0.35, hitFlat: 30 },
            armorPen: 0.35, onDeathEffect: 'explode', explodeHpRatio: 0.14, lootBonus: 1.7
        },
        harbinger_shield: {
            id: 'harbinger_shield', category: '先驅季賽', name: '先驅者：古神藍圖護盾', color: '#2563eb',
            desc: '【先驅季賽詞】空間能量盾：氣血上限 +90%、暴抗 +40%，每回合自動修復 8% 護盾氣血',
            statMod: { hpPct: 0.90, critResFlat: 40 },
            turnEndRegen: 0.08, lootBonus: 1.8
        },
        tormented_embezzler: {
            id: 'tormented_embezzler', category: '罪魂季賽', name: '罪魂附身：盜寶狂魔', color: '#84cc16',
            desc: '【罪魂季賽詞】綠光罪魂入體：全屬性與速度暴漲，擊殺後裝備與通貨掉落率大幅提升 2.5 倍！',
            statMod: { hpPct: 0.50, atkPct: 0.35, evaFlat: 20 },
            extraAction: true, lootBonus: 2.5
        },
        chayula_touched: {
            id: 'chayula_touched', category: '裂界神觸', name: '裂界：夏烏拉混沌之觸', color: '#9333ea',
            desc: '【神觸王詞】混沌編織：氣血 +80%、攻擊 +50%、無視防禦且偷取氣血與內力，掉寶率 x2.5！',
            statMod: { hpPct: 0.80, atkPct: 0.50, hitFlat: 35, critResFlat: 30 },
            armorPen: 0.35, onHitEffect: 'beast_venom', leechRatio: 0.35, manaBurnRatio: 0.15, lootBonus: 2.5
        },
        lunaris_touched: {
            id: 'lunaris_touched', category: '古神祝福', name: '古神：月影與日耀之觸', color: '#f59e0b',
            desc: '【神觸王詞】雙神降臨：攻防氣血全面提升 +60%，攻擊釋放冰火風暴波及全隊，掉寶率 x2.5！',
            statMod: { hpPct: 0.60, atkPct: 0.60, defPct: 0.60, critFlat: 25 },
            onHitEffect: 'chain_aoe', chainRatio: 0.35, lootBonus: 2.5
        }
    };
})();