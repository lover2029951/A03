// js/guildData.js  (v43)
// 幫會系統獨立資料庫
//
// v43 修正：
//   ⭐ 還原靈田／煉丹房／聚靈陣的丹藥說明文字
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.GUILD_MEMBER_NAMES = [
        '少帥軍精銳・陳老謀', '飛馬牧場執事・柳宗道', '雙龍幫香主・卜天志',
        '巴蜀獨尊堡・解暉', '江南巨鯤幫・雲玉真', '洛陽曼清院・沈落雁',
        '大江聯舵主・鄭淑明', '突厥歸附勇士・突利', '邊荒荒人劍手・呼延金',
        '怒蛟幫上官堂主', '墨家機關學徒・荊俊', '慈航俗家弟子・蘇璇'
    ];

    // 1. 🏯 八大幫會生產建築
    Data.GUILD_BUILDINGS = {
        herb_field: {
            id: 'herb_field', reqGuildLv: 1,
            name: '🌿 幫會靈田',
            desc: '栽種天山雪蓮與塞外靈草。每名駐守成員每週期產出：靈草 +2~3、並低機率收穫【行軍散】。',
            baseUpGold: 20000,
            produceDesc: '產出：靈草 +2.5/人、低機率得行軍散'
        },
        ore_mine: {
            id: 'ore_mine', reqGuildLv: 1,
            name: '⛏️ 幫會礦脈',
            desc: '開採魯妙子探勘出的地下玄鐵礦。每名駐守成員每週期產出：玄鐵 +2~3、紋銀 +60兩。',
            baseUpGold: 20000,
            produceDesc: '產出：玄鐵 +2.5/人、紋銀 +60兩/人'
        },
        scripture_hall: {
            id: 'scripture_hall', reqGuildLv: 1,
            name: '📚 藏經閣',
            desc: '典藏武林百家秘笈。每名駐守成員每週期推演產出：武點 +22、幫會貢獻 +7。',
            baseUpGold: 30000,
            produceDesc: '產出：武點 +22/人、幫貢 +7/人'
        },
        beast_park: {
            id: 'beast_park', reqGuildLv: 2,
            name: '🐾 幫會靈獸園',
            desc: '【需總舵 Lv.2】培育異種靈獸之園林。每名駐守成員每週期產出：靈草 +2、玄鐵 +2、幫貢 +10，極低機率使鎮幫神獸升階！',
            baseUpGold: 35000,
            produceDesc: '產出：靈草+2/玄鐵+2/幫貢+10'
        },
        alchemy_room: {
            id: 'alchemy_room', reqGuildLv: 2,
            name: '⚗️ 幫會煉丹房',
            desc: '【需總舵 Lv.2】每名駐守成員每週期消耗 30 靈草，機率煉出【九轉大還丹】或【千年雪蓮丹】。',
            baseUpGold: 40000,
            produceDesc: '消耗 30 靈草/人：機率煉製大還丹/雪蓮丹'
        },
        demon_tower: {
            id: 'demon_tower', reqGuildLv: 3,
            name: '🗼 鎮妖神塔',
            desc: '【需總舵 Lv.3】鎮壓時空妖魔之寶塔。每名駐守成員每週期產出：幫會資金 +90、武點 +30，並提高鎮妖塔爬塔獎勵！',
            baseUpGold: 45000,
            produceDesc: '產出：幫會資金 +90/人、武點 +30/人'
        },
        forge_hall: {
            id: 'forge_hall', reqGuildLv: 3,
            name: '🔨 鍛造閣',
            desc: '【需總舵 Lv.3】每名駐守成員每週期消耗 30 玄鐵，產出幫會資金並極低機率打造出 PoE 通貨！',
            baseUpGold: 50000,
            produceDesc: '消耗 30 玄鐵/人：產出幫會資金、低機率出通貨'
        },
        spirit_array: {
            id: 'spirit_array', reqGuildLv: 4,
            name: '☯️ 聚靈陣',
            desc: '【需總舵 Lv.4】匯聚天地靈氣。每名駐守成員每週期提升幫會經驗 +18、幫貢 +12，並低機率凝結【和氏璧異能碎片】。',
            baseUpGold: 60000,
            produceDesc: '產出：幫會經驗 +18/人、幫貢 +12/人'
        }
    };

    // 2. ✨ 幫會祝福
    Data.GUILD_BLESSINGS = [
        {
            id: 'poe_coc',
            name: '⚡ 暴擊時施放祝福 (Cast On Crit)',
            desc: '【啟用時提供】每級會心爆擊率 +1%、攻擊 +18。【祝福觸發】當該角色打出「會心一擊」時，無消耗觸發【CoC 天魔雷暴】追加 (25% + 等級x5%) 攻擊力的額外轟炸！',
            baseCostContrib: 600,
            bonusPerLv: { crit: 1, atk: 18 }
        },
        {
            id: 'poe_cwdt',
            name: '🛡️ 受傷時施放・不朽怒嚎祝福 (CwDT)',
            desc: '【啟用時提供】每級防禦 +18、最大氣血 +125。【祝福觸發】當該角色受擊且氣血低於 65% 時，觸發【不朽怒嚎】減免 (7.5% + 等級x1%) 傷害並瞬間回復 (3% + 等級x0.5%) 最大氣血！',
            baseCostContrib: 600,
            bonusPerLv: { def: 18, maxHp: 125 }
        },
        {
            id: 'poe_vaal_pact',
            name: '🩸 瓦爾冥約・鮮血祝福 (Vaal Pact)',
            desc: '【啟用時提供】每級攻擊 +25。【祝福觸發】該角色每次攻擊命中敵人時，觸發【瓦爾生命偷取】，將造成傷害的 (2.5% + 等級x0.75%) 瞬間恢復為自身氣血！',
            baseCostContrib: 550,
            bonusPerLv: { atk: 25 }
        },
        {
            id: 'poe_culling',
            name: '💀 處刑者・終結撲殺祝福 (Culling Strike)',
            desc: '【啟用時提供】每級攻擊 +20、命中 +1%。【祝福觸發】當敵人剩餘氣血低於 (5% + 等級x0.5%) 時，該角色攻擊命中將直接觸發【PoE 撲殺】瞬間斬殺敵人！',
            baseCostContrib: 750,
            bonusPerLv: { atk: 20, hit: 1 }
        },
        {
            id: 'poe_mom',
            name: '💧 心靈昇華祝福 (Mind Over Matter)',
            desc: '【啟用時提供】每級最大內力 +13、暴擊抵抗 +1.5%。【祝福觸發】該角色受到敵人傷害時，由內力 (MP) 先行分擔 (10% + 等級x0.75%) 的承受傷害！',
            baseCostContrib: 600,
            bonusPerLv: { maxMp: 13, critRes: 1.5 }
        },
        {
            id: 'poe_rt',
            name: '🎯 必中宗師祝福 (Resolute Technique)',
            desc: '【啟用時提供】每級精準命中率 +1.5%、攻擊 +15。【祝福觸發】該角色所有攻擊額外獲得 +(2.5% + 等級x0.75%) 護甲穿透，並提高保底命中率！',
            baseCostContrib: 550,
            bonusPerLv: { hit: 1.5, atk: 15 }
        },
        {
            id: 'poe_ancestral',
            name: '🌪️ 先祖戰吼祝福 (Ancestral Call)',
            desc: '【啟用時提供】每級攻擊 +22、氣血 +90。【祝福觸發】該角色施展單體武學時，先祖幻影自動對場上另一名存活敵人追加 (17.5% + 等級x3.5%) 傷害的額外打擊！',
            baseCostContrib: 700,
            bonusPerLv: { atk: 22, maxHp: 90 }
        },
        {
            id: 'poe_wind_dancer',
            name: '🍃 風魔舞者祝福 (Wind Dancer)',
            desc: '【啟用時提供】每級輕功閃避率 +1%、暴擊抵抗 +1%。【祝福觸發】當該角色成功閃避敵人攻擊時，自動觸發【順風疾行】回復 (10 + 等級x8) 點氣血與內力！',
            baseCostContrib: 650,
            bonusPerLv: { eva: 1, critRes: 1 }
        }
    ];

    // 3. 🌌 幫會技能：鬼谷八荒後天改命
    Data.GUILD_DESTINY_SKILLS = [
        {
            id: 'gg_red_dust_box',
            name: '🗡️ 紅塵劍匣 (紅塵劍魂)',
            tier: '仙品改命',
            desc: '【鬼谷逆天改命】該角色每次出手攻擊時，觸發劍匣萬劍齊發，對敵方全體追加 (22.5% + 等級x5%) 攻擊力的無視防禦劍氣傷害！每級並提升該角色：攻擊 +20、會心 +0.5%。',
            baseCostContrib: 900,
            bonusPerLv: { atk: 20, crit: 0.5 }
        },
        {
            id: 'gg_flying_dagger',
            name: '🗡️ 小李飛刀・例無虛發',
            tier: '天品改命',
            desc: '【鬼谷逆天改命】該角色每次出手時，自動射出一柄必中飛刀，對隨機一名敵人造成 (27.5% + 等級x6%) 攻擊力的必中穿刺傷害！每級並提升該角色：精準命中 +1.5%、攻擊 +15。',
            baseCostContrib: 750,
            bonusPerLv: { hit: 1.5, atk: 15 }
        },
        {
            id: 'gg_quad_spirit',
            name: '🔥 雙靈共生・四靈共鳴',
            tier: '仙品改命',
            desc: '【鬼谷逆天改命】該角色施展外功武技時，有 (12.5% + 等級x2.5%) 機率觸發「雙靈共生」，不消耗額外內力直接將該招式連續施放第 2 次！每級並提升該角色：最大內力 +10、攻擊 +18。',
            baseCostContrib: 1000,
            bonusPerLv: { maxMp: 10, atk: 18 }
        },
        {
            id: 'gg_blood_demon',
            name: '🩸 血魔大法・血煞饕餮',
            tier: '天品改命',
            desc: '【鬼谷逆天改命】該角色造成的武學總傷害提升 +(5% + 等級x1.5%)，且每次攻擊額外吸取造成傷害 (4% + 等級x1%) 化為自身氣血！每級並提升該角色：最大氣血 +110、攻擊 +15。',
            baseCostContrib: 800,
            bonusPerLv: { maxHp: 110, atk: 15 }
        },
        {
            id: 'gg_blood_spirit',
            name: '💧 血靈精通・燃血化元',
            tier: '天品改命',
            desc: '【鬼谷逆天改命】當該角色內力不足以施展招式時，自動消耗少量氣血代替內力出招，且燃血出招時傷害額外提升 +(12.5% + 等級x2.5%)！每級並提升該角色：氣血 +100、內力 +8。',
            baseCostContrib: 700,
            bonusPerLv: { maxHp: 100, maxMp: 8 }
        },
        {
            id: 'gg_martial_god',
            name: '🛡️ 武神殘決・破釜沉舟',
            tier: '仙品改命',
            desc: '【鬼谷逆天改命】戰鬥中若該角色氣血低於 80%，出手時附加自身已損失氣血 (10% + 等級x2.5%) 的額外真實傷害！每級並提升該角色：防禦 +18、氣血 +130。',
            baseCostContrib: 950,
            bonusPerLv: { def: 18, maxHp: 130 }
        },
        {
            id: 'gg_unity_mantra',
            name: '☯️ 歸一真訣・萬法歸一',
            tier: '天品改命',
            desc: '【鬼谷逆天改命】該角色受到敵人攻擊時，直接減免 (6% + 等級x1%) 傷害，並釋放歸一真氣反震攻擊者！每級並提升該角色：防禦 +20、暴擊抵抗 +1.5%。',
            baseCostContrib: 800,
            bonusPerLv: { def: 20, critRes: 1.5 }
        },
        {
            id: 'gg_wood_longevity',
            name: '🌸 水木長生・青帝遺錄',
            tier: '仙品改命',
            desc: '【鬼谷逆天改命】該角色每回合出招後自動引動青帝生機，回復自身 (4% + 等級x0.75%) 最大氣血與內力！每級並提升該角色：最大氣血 +150、暴擊抵抗 +1%。',
            baseCostContrib: 850,
            bonusPerLv: { maxHp: 150, critRes: 1 }
        },
        {
            id: 'gg_beyond_heaven',
            name: '⚡ 天外有天・天道洞察',
            tier: '天品改命',
            desc: '【鬼谷逆天改命】該角色施展門派專屬武學或群攻武學時，額外獲得 +(6% + 等級x1%) 會心爆擊率與破甲威力！每級並提升該角色：命中 +1%、閃避 +1%、會心 +0.5%。',
            baseCostContrib: 850,
            bonusPerLv: { hit: 1, eva: 1, crit: 0.5 }
        },
        {
            id: 'gg_killing_intent',
            name: '👹 殺心驟起・天魔處決',
            tier: '仙品改命',
            desc: '【鬼谷逆天改命】該角色攻擊敵人時，有 (10% + 等級x2%) 機率觸發「殺心驟起」，立即追加一記必定會心的天魔斬擊（造成 32.5% + 等級x5% 攻擊傷害）！每級並提升該角色：攻擊 +22、會心 +1%。',
            baseCostContrib: 950,
            bonusPerLv: { atk: 22, crit: 1 }
        }
    ];

    // 4. 🐉 幫會鎮派神獸
    Data.GUILD_BEASTS = {
        qilin: {
            id: 'qilin', name: '🔥 聖火麒麟',
            desc: '瑞氣千條的鎮幫火麒麟，提升全隊攻擊力與會心爆擊。',
            feedHerb: 150, feedOre: 150,
            bonusPerLv: { atk: 40, crit: 1, hit: 1 }
        },
        azure_dragon: {
            id: 'azure_dragon', name: '🐉 蒼穹青龍',
            desc: '翱翔九天的東方青龍，提升全隊氣血、內力與精準命中。',
            feedHerb: 200, feedOre: 100,
            bonusPerLv: { maxHp: 250, maxMp: 17, hit: 1.5 }
        },
        black_tortoise: {
            id: 'black_tortoise', name: '🐢 鎮嶽玄武',
            desc: '不動如山的北方玄武，大幅提升全隊防禦力與暴擊抵抗。',
            feedHerb: 100, feedOre: 200,
            bonusPerLv: { def: 32, maxHp: 200, critRes: 2 }
        },
        white_tiger: {
            id: 'white_tiger', name: '🐯 破軍白虎',
            desc: '主司殺伐的西方白虎，全面提升全隊攻擊、閃避與爆擊。',
            feedHerb: 180, feedOre: 180,
            bonusPerLv: { atk: 48, eva: 1, crit: 1.5 }
        }
    };

    // 5. 🌀 幫會專屬秘境
    Data.GUILD_REALMS = [
        {
            id: 'gr_yang_treasury', name: '楊公寶庫外圍密道', reqGuildLv: 1,
            desc: '搜尋魯妙子留下的機關物資。',
            costFunds: 2000, reward: { exp: 40, contrib: 20, herbs: 10, ores: 10, sp: 75 }
        },
        {
            id: 'gr_heshibi_illusion', name: '淨念禪院・和氏璧幻境', reqGuildLv: 2,
            desc: '承受和氏璧異能輻射洗禮，大幅淬鍊武道。',
            costFunds: 6000, reward: { exp: 100, contrib: 50, herbs: 22, ores: 22, sp: 225 }
        },
        {
            id: 'gr_evil_relic_cave', name: '巴蜀向雨田・邪帝魔窟', reqGuildLv: 4,
            desc: '深入初代邪帝遺跡，蒐羅珍稀靈草與玄鐵礦。',
            costFunds: 18000, reward: { exp: 275, contrib: 140, herbs: 60, ores: 60, sp: 600 }
        },
        {
            id: 'gr_wargod_abyss', name: '驚雁宮・戰神殿星門裂隙', reqGuildLv: 6,
            desc: '幫會最高機密秘境，有機會額外發現 PoE 通貨！',
            costFunds: 50000, reward: { exp: 750, contrib: 400, herbs: 150, ores: 150, sp: 1750, bonusOrb: true }
        }
    ];

    // 6. 🎲 幫會隨機江湖事件
    Data.GUILD_EVENTS = [
        { title: '【飛馬商隊來訪】商秀珣派人送來一批塞外物資與靈草！', effect: { herbs: 15, ores: 10, funds: 250 } },
        { title: '【魯妙子指點】天下第一巧匠路過幫會，改良了礦脈與聚靈陣！', effect: { exp: 60, ores: 20, contrib: 25 } },
        { title: '【擊退宇文閥夜襲】幫眾齊心擊退來犯密探，繳獲戰利品！', effect: { sp: 150, contrib: 40, funds: 400 } },
        { title: '【靈獸園瑞氣降臨】鎮幫神獸吐納靈氣，靈田與靈獸園產量增加！', effect: { herbs: 30, sp: 100 } },
        { title: '【鎮妖神塔異動】神塔鎮壓上古妖氣，轉化為精純幫貢與修為！', effect: { sp: 250, contrib: 50, exp: 50 } },
        { title: '【時空裂隙異寶】聚靈陣捕捉到一顆從異界墜落的 PoE 通貨！', effect: { contrib: 30, randomOrb: true } }
    ];
})();