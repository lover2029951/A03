// js/xinfaData.js  (v39)
// 15 大門派 × 5 階心法 = 75 門
//   ⭐ 內力上限相關屬性統一降低 500%（÷6），數值直接寫入
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    const TIER_LV = [20, 70, 130, 200, 280];
    const TIER_SP = [500, 2000, 6000, 14000, 30000];

    const SECT_XINFA = {
        shaolin: [
            ['易筋經・洗髓神功', '達摩祖師無上內功，業力初凝。', { maxHp: 80, def: 15, critRes: 1 }, { dr: 0.005 }, '業力每層減傷額外 +0.5%'],
            ['金剛不壞體・般若心經', '佛門護體樁功，業力更凝。', { maxHp: 170, def: 32, critRes: 2 }, { dr: 0.004, max: 2 }, '業力上限 +2、每層減傷 +0.4%'],
            ['達摩易筋經・無量壽功', '增長壽元真氣，業力淬體。', { maxHp: 280, def: 52, critRes: 3 }, { max: 3, reflect: 0.06 }, '業力上限 +3、引爆倍率 +0.06'],
            ['少林九陽功', '九陽真氣灌注，業力反震。', { maxHp: 420, def: 78, critRes: 5 }, { reflect: 0.10, releaseHeal: 0.04 }, '引爆倍率 +0.10、引爆回復 4% 氣血'],
            ['少林神功・易筋洗髓真經', '少林至高總綱，業力圓滿。', { maxHp: 620, def: 115, critRes: 7, maxMp: 13 }, { max: 5, dr: 0.006, reflect: 0.12, releaseHeal: 0.06 }, '業力上限 +5、每層減傷 +0.6%、引爆倍率 +0.12、引爆回復 6% 氣血']
        ],
        mingjiao: [
            ['聖火令・純陽功', '聖火純陽真氣，火種初燃。', { atk: 28, maxHp: 60 }, { dot: 0.02 }, '聖火每層灼傷 +2%'],
            ['聖火令神功・九陽天書', '光明頂鎮教神功，烈焰漸盛。', { atk: 52, crit: 2, maxHp: 110 }, { dot: 0.02, max: 1 }, '聖火上限 +1、每層灼傷 +2%'],
            ['焚我金身・聖火真經', '焚身成道之秘法，火勁暴漲。', { atk: 80, crit: 3, maxHp: 170 }, { max: 2, lowHpBonus: 0.03 }, '聖火上限 +2、殘血增幅 +3%'],
            ['乾坤大挪移心法', '借力打力，挪移乾坤。', { atk: 120, crit: 5, maxHp: 240 }, { dot: 0.03, lowHpBonus: 0.04 }, '每層灼傷 +3%、殘血增幅 +4%'],
            ['明尊聖火・焚天絕學', '明尊降世之總綱，焚盡八荒。', { atk: 175, crit: 7, maxHp: 340 }, { max: 3, dot: 0.04, lowHpBonus: 0.06 }, '聖火上限 +3、每層灼傷 +4%、殘血增幅 +6%']
        ],
        gaibang: [
            ['混天氣功', '丐幫基礎內功，尋敵破綻。', { atk: 22, eva: 2, maxHp: 70 }, { dmg: 0.006 }, '破綻每層增傷 +0.6%'],
            ['擒龍功・混元一氣', '喬峰絕頂內功，破綻更顯。', { atk: 45, eva: 3, maxHp: 130 }, { dmg: 0.005, max: 2 }, '破綻上限 +2、每層增傷 +0.5%'],
            ['降龍十八掌心法', '降龍掌力之源，尋隙而入。', { atk: 72, eva: 4, maxHp: 200, hit: 2 }, { max: 3, dmg: 0.006 }, '破綻上限 +3、每層增傷 +0.6%'],
            ['打狗棒法心法', '打狗棒配套內功，密集連擊。', { atk: 108, eva: 6, maxHp: 280, hit: 3 }, { max: 4, dmg: 0.007 }, '破綻上限 +4、每層增傷 +0.7%'],
            ['丐幫絕學・降龍廿八掌心法', '丐幫鎮派總綱，破綻疊滿。', { atk: 155, eva: 8, maxHp: 400, hit: 5 }, { max: 6, dmg: 0.008 }, '破綻上限 +6、每層增傷 +0.8%']
        ],
        wudang: [
            ['純陽無極功', '道門純陽真氣，化勁初成。', { maxMp: 8, atk: 20, hit: 2 }, { critRes: 0.003 }, '真氣每層暴抗 +0.3%'],
            ['太極神功・純陽無極', '張三丰道家絕學，化勁漸深。', { maxMp: 18, atk: 40, hit: 3 }, { critRes: 0.003, max: 3 }, '真氣上限 +3、每層暴抗 +0.3%'],
            ['武當九陽功', '九陽真氣滋養百脈，化勁通神。', { maxMp: 32, atk: 65, hit: 4, maxHp: 150 }, { max: 3, release: 0.05 }, '真氣上限 +3、釋放倍率 +0.05'],
            ['真武七截陣心法', '真武大帝陣法心訣，化勁歸一。', { maxMp: 48, atk: 100, hit: 6, maxHp: 220 }, { max: 4, release: 0.08, critRes: 0.002 }, '真氣上限 +4、釋放倍率 +0.08、每層暴抗 +0.2%'],
            ['太極玄功・真武大帝心法', '武當至高總綱，化勁圓滿。', { maxMp: 70, atk: 145, hit: 8, maxHp: 320 }, { max: 6, release: 0.12, critRes: 0.003 }, '真氣上限 +6、釋放倍率 +0.12、每層暴抗 +0.3%']
        ],
        emei: [
            ['大乘涅槃功', '郭襄女俠遺篇，慈悲初植。', { maxHp: 75, maxMp: 7, def: 12 }, { atkDef: 0.003 }, '慈悲每層全隊攻防 +0.3%'],
            ['峨嵋九陽功', '剛柔並濟，慈悲漸深。', { maxHp: 160, maxMp: 14, def: 28 }, { atkDef: 0.003, max: 2 }, '慈悲上限 +2、每層全隊攻防 +0.3%'],
            ['慈航普渡心法', '慈悲為懷，普渡眾生。', { maxHp: 265, maxMp: 23, def: 48, critRes: 3 }, { max: 3, healBonus: 0.02 }, '慈悲上限 +3、治療量 +2%'],
            ['金頂佛光心法', '金頂無上佛光，護佑蒼生。', { maxHp: 400, maxMp: 35, def: 72, critRes: 5 }, { max: 3, atkDef: 0.004, healBonus: 0.03 }, '慈悲上限 +3、每層全隊攻防 +0.4%、治療量 +3%'],
            ['峨嵋鎮派・大乘涅槃真經', '峨嵋至高總綱，涅槃圓滿。', { maxHp: 590, maxMp: 52, def: 105, critRes: 7 }, { max: 5, atkDef: 0.005, healBonus: 0.05 }, '慈悲上限 +5、每層全隊攻防 +0.5%、治療量 +5%']
        ],
        xingxiu: [
            ['化功大法', '化人內力為己用，毒功初成。', { atk: 26, maxHp: 60 }, { cut: 0.004 }, '劇毒每層削上限 +0.4%'],
            ['神木王鼎心法', '星宿派毒經配套，腐蝕敵元。', { atk: 50, maxHp: 115, hit: 2 }, { cut: 0.004, max: 2 }, '劇毒上限 +2、每層削上限 +0.4%'],
            ['星宿七絕毒心法', '七絕毒功內勁，見血封喉。', { atk: 76, maxHp: 175, crit: 3 }, { max: 3, cut: 0.005 }, '劇毒上限 +3、每層削上限 +0.5%'],
            ['化功大法・吸星真經', '吸星真經融會化功，掠奪生機。', { atk: 115, maxHp: 245, crit: 5 }, { max: 3, cut: 0.006 }, '劇毒上限 +3、每層削上限 +0.6%'],
            ['星宿老仙・化功毒經', '丁春秋搏命毒功總綱，劇毒無雙。', { atk: 165, maxHp: 350, crit: 7 }, { max: 5, cut: 0.008 }, '劇毒上限 +5、每層削上限 +0.8%']
        ],
        tianlong: [
            ['枯榮禪功', '枯榮大師禪功，脈門初標。', { atk: 25, hit: 3, def: 10 }, { hit: 0.02 }, '脈門每層命中 +2%'],
            ['六脈神劍心法', '六脈無形劍氣之源，標記精準。', { atk: 48, hit: 5, def: 24 }, { hit: 0.02, max: 1 }, '脈門上限 +1、每層命中 +2%'],
            ['枯榮禪功・非枯非榮', '禪功臻境，脈門通透。', { atk: 75, hit: 7, def: 40, maxHp: 150 }, { max: 1, pen: 0.05 }, '脈門上限 +1、滿層破甲 +5%'],
            ['天龍寺心法・六脈真經', '鎮寺心法，劍氣縱橫。', { atk: 112, hit: 9, def: 62, maxHp: 220 }, { max: 2, hit: 0.03, pen: 0.08 }, '脈門上限 +2、每層命中 +3%、滿層破甲 +8%'],
            ['天龍鎮派・六脈神劍總綱', '天龍寺至高總綱，貫穿天地。', { atk: 160, hit: 12, def: 92, maxHp: 320 }, { max: 3, hit: 0.04, pen: 0.12 }, '脈門上限 +3、每層命中 +4%、滿層破甲 +12%']
        ],
        tianshan: [
            ['八荒六合唯我獨尊功', '天山童姥至高神功，寒冰初附。', { atk: 30, crit: 2, eva: 2 }, { slow: 0.008 }, '寒冰每層減速 +0.8%'],
            ['天山六陽掌心法', '寒冰刺骨，凍氣漸凝。', { atk: 55, crit: 3, eva: 3 }, { slow: 0.008, max: 1 }, '寒冰上限 +1、每層減速 +0.8%'],
            ['生死符心法', '生死符劇毒心訣，冰封萬里。', { atk: 82, crit: 4, eva: 4, maxHp: 160 }, { max: 1, critBonus: 0.05 }, '寒冰上限 +1、凍結時自身暴擊 +5%'],
            ['陽歌天鈞心法', '陽歌天鈞絕學，劍破虛空。', { atk: 122, crit: 6, eva: 6, maxHp: 235 }, { max: 2, slow: 0.010, critBonus: 0.08 }, '寒冰上限 +2、每層減速 +1.0%、凍結暴擊 +8%'],
            ['天山童姥絕學・八荒真經', '天山派至高總綱，破碎虛空。', { atk: 172, crit: 9, eva: 8, maxHp: 340 }, { max: 2, slow: 0.012, critBonus: 0.12, freezeTurns: 1 }, '寒冰上限 +2、每層減速 +1.2%、凍結暴擊 +12%、凍結回合 +1']
        ],
        xiaoyao: [
            ['北冥神功', '海納百川，納元初成。', { atk: 22, eva: 3, maxMp: 8 }, { drain: 0.01 }, '納元吸取比例 +1%'],
            ['小無相功', '道家無相真氣，納元漸深。', { atk: 44, eva: 4, maxMp: 18, hit: 2 }, { drain: 0.01, dmgBonus: 0.05 }, '吸取比例 +1%、高內力增傷 +5%'],
            ['凌波微步心法', '凌波微步配套內功，飄逸絕倫。', { atk: 70, eva: 6, maxMp: 32, hit: 3 }, { drain: 0.015, dmgBonus: 0.08 }, '吸取比例 +1.5%、高內力增傷 +8%'],
            ['北冥神功・鯨吸真經', '鯨吸百川之真經，內力無窮。', { atk: 105, eva: 8, maxMp: 48, hit: 4 }, { drain: 0.02, dmgBonus: 0.12 }, '吸取比例 +2%、高內力增傷 +12%'],
            ['逍遙絕學・北冥天鑑真經', '逍遙派至高總綱，唯我獨尊。', { atk: 152, eva: 11, maxMp: 68, hit: 6 }, { drain: 0.025, dmgBonus: 0.18 }, '吸取比例 +2.5%、高內力增傷 +18%']
        ],
        murong: [
            ['參合指心法', '慕容家傳內功，儲存彼力。', { atk: 24, def: 14, maxHp: 60 }, { mult: 0.05 }, '彼力返還倍率 +0.05'],
            ['慕容龍城心法', '慕容龍城絕學，斗轉星移。', { atk: 46, def: 30, maxHp: 120 }, { mult: 0.05, cap: 0.02 }, '返還倍率 +0.05、彼力上限 +2%'],
            ['斗轉星移心法', '斗轉星移真訣，返施彼身。', { atk: 72, def: 48, maxHp: 190 }, { mult: 0.08, cap: 0.03 }, '返還倍率 +0.08、彼力上限 +3%'],
            ['燕子塢心法・以彼之道', '燕子塢皇族心法，還施彼身。', { atk: 108, def: 72, maxHp: 265 }, { mult: 0.10, cap: 0.04 }, '返還倍率 +0.10、彼力上限 +4%'],
            ['慕容龍城真傳・參合指真經', '慕容至高總綱，以彼之道還施彼身。', { atk: 155, def: 108, maxHp: 385 }, { mult: 0.15, cap: 0.06 }, '返還倍率 +0.15、彼力上限 +6%']
        ],
        tangmen: [
            ['唐門毒經', '蜀中唐門毒術基礎，佈置機關。', { atk: 27, crit: 2, hit: 3 }, { dmg: 0.02 }, '每枚機關引爆倍率 +0.02'],
            ['五毒秘傳', '五毒秘傳心法，機關漸密。', { atk: 50, crit: 3, hit: 4 }, { dmg: 0.02, max: 2 }, '機關上限 +2、每枚引爆倍率 +0.02'],
            ['唐門暗器心法', '暗器配套內功，機簧爆發。', { atk: 78, crit: 4, hit: 5, maxHp: 150 }, { max: 3, aoeBonus: 0.01 }, '機關上限 +3、群攻增幅 +1%'],
            ['孔雀翎心法', '孔雀翎配套心訣，傾瀉如雨。', { atk: 114, crit: 6, hit: 7, maxHp: 220 }, { max: 3, dmg: 0.03, aoeBonus: 0.02 }, '機關上限 +3、每枚引爆 +0.03、群攻增幅 +2%'],
            ['唐門鎮派・十方俱滅真經', '唐門至高總綱，十方俱滅。', { atk: 162, crit: 9, hit: 9, maxHp: 320 }, { max: 5, dmg: 0.04, aoeBonus: 0.03 }, '機關上限 +5、每枚引爆 +0.04、群攻增幅 +3%']
        ],
        guigu: [
            ['太一神功', '鬼谷子無上天書，奇門初布。', { atk: 22, def: 12, maxHp: 55, maxMp: 6 }, { power: 0.10 }, '奇門陣法強度 +10%'],
            ['陰符七術', '陰符七術心法，縱橫捭闔。', { atk: 42, def: 28, maxHp: 110, maxMp: 12 }, { power: 0.12 }, '奇門陣法強度 +12%'],
            ['長生訣心法', '長生之秘，青帝遺錄。', { atk: 68, def: 45, maxHp: 175, maxMp: 19 }, { power: 0.15 }, '奇門陣法強度 +15%'],
            ['太一青木心法', '太一青木真氣，生生不息。', { atk: 102, def: 68, maxHp: 245, maxMp: 28 }, { power: 0.18 }, '奇門陣法強度 +18%'],
            ['鬼谷大道・陰陽縱橫真經', '鬼谷至高總綱，陰陽縱橫。', { atk: 148, def: 102, maxHp: 350, maxMp: 41 }, { power: 0.25 }, '奇門陣法強度 +25%']
        ],
        taohuadao: [
            ['碧波神功', '黃藥師融合九陰之功，五行初轉。', { atk: 23, hit: 3, eva: 2 }, { extra: 0.03 }, '五行額外屬攻 +0.03 倍'],
            ['九陰總綱', '九陰真經總綱，奇門五轉。', { atk: 45, hit: 4, eva: 3, maxHp: 120 }, { extra: 0.03 }, '五行額外屬攻 +0.03 倍'],
            ['落英神劍掌心法', '落英神劍掌配套內功，五行輪轉。', { atk: 72, hit: 6, eva: 4, maxHp: 185 }, { extra: 0.05 }, '五行額外屬攻 +0.05 倍'],
            ['玉簫劍法心法', '玉簫劍法配套心訣，簫聲劍影。', { atk: 106, hit: 8, eva: 6, maxHp: 255 }, { extra: 0.06 }, '五行額外屬攻 +0.06 倍'],
            ['東邪絕學・碧海潮生真經', '桃花島至高總綱，碧海潮生。', { atk: 153, hit: 11, eva: 8, maxHp: 365 }, { extra: 0.09 }, '五行額外屬攻 +0.09 倍']
        ],
        jueqinggu: [
            ['閉穴功', '封閉全身大穴，陰陽初分。', { atk: 26, crit: 2, critRes: 2 }, { heal: 0.01 }, '陰劍模式吸血 +1%'],
            ['絕情內經', '斷絕情絲，刀劍分途。', { atk: 50, crit: 3, critRes: 3 }, { atkUp: 0.02, heal: 0.02 }, '陽刀攻擊 +2%、陰劍吸血 +2%'],
            ['陰陽倒亂刃心法', '刀劍齊鳴，陰陽互補。', { atk: 76, crit: 5, critRes: 4, maxHp: 160 }, { atkUp: 0.03, defUp: 0.03, heal: 0.02 }, '陽刀攻擊 +3%、陰劍防禦 +3%、陰劍吸血 +2%'],
            ['玉女心經心法', '玉女素心，陰陽圓融。', { atk: 112, crit: 7, critRes: 6, maxHp: 235 }, { atkUp: 0.04, defUp: 0.04, heal: 0.03 }, '陽刀攻擊 +4%、陰劍防禦 +4%、陰劍吸血 +3%'],
            ['公孫止絕學・陰陽倒亂刃真經', '絕情谷至高總綱，刀劍顛倒。', { atk: 158, crit: 10, critRes: 8, maxHp: 340 }, { atkUp: 0.06, defUp: 0.06, heal: 0.05 }, '陽刀攻擊 +6%、陰劍防禦 +6%、陰劍吸血 +5%']
        ],
        erengu: [
            ['血煞魔功', '凶煞霸道內勁，血怒初沸。', { atk: 32, crit: 2, maxHp: 55 }, { perStack: 0.005 }, '血怒每層攻擊 +0.5%'],
            ['窮凶極惡經', '煞氣沖霄，血怒翻騰。', { atk: 58, crit: 3, maxHp: 110 }, { perStack: 0.005, lowHpBonus: 0.01 }, '每層攻擊 +0.5%、殘血增幅 +1%'],
            ['惡人谷血煞心法', '凶戾絕倫，血氣暴漲。', { atk: 88, crit: 4, maxHp: 170 }, { perStack: 0.006, killHeal: 0.02 }, '每層攻擊 +0.6%、擊殺回血 +2%'],
            ['血刀門心法', '嗜血屠戮，血怒不息。', { atk: 128, crit: 6, maxHp: 245 }, { perStack: 0.008, killHeal: 0.03, max: 1 }, '每層攻擊 +0.8%、擊殺回血 +3%、血怒上限 +1'],
            ['段延慶絕學・血煞魔經', '惡人谷至高總綱，一陽指魔化。', { atk: 182, crit: 9, maxHp: 350 }, { perStack: 0.012, killHeal: 0.05, lowHpBonus: 0.02, max: 2 }, '每層攻擊 +1.2%、擊殺回血 +5%、殘血增幅 +2%、血怒上限 +2']
        ]
    };

    const SECT_DISPLAY = {
        shaolin: '少林派', mingjiao: '明教', gaibang: '丐幫', wudang: '武當派', emei: '峨嵋派',
        xingxiu: '星宿派', tianlong: '天龍寺', tianshan: '天山派', xiaoyao: '逍遙派', murong: '慕容世家',
        tangmen: '唐門', guigu: '鬼谷派', taohuadao: '桃花島', jueqinggu: '絕情谷', erengu: '惡人谷'
    };

    Data.XINFA = {
        basic_taha: {
            id: 'basic_taha', name: '江湖吐納功', origin: '江湖共通', category: '江湖共通',
            reqLv: 5, sectReq: null,
            desc: '江湖武師基礎吐納法。每級提升：攻擊 +3.75、防禦 +3、氣血 +12.5。【主運效果】受到敵方攻擊傷害降低 8%。',
            spCost: 120, passivePerLv: { atk: 15, def: 12, maxHp: 50 },
            activeEffectDesc: '基礎護體：受到敵方攻擊傷害降低 8%', effectType: 'dmg_reduce'
        }
    };

    Object.keys(SECT_XINFA).forEach(function (sectId) {
        var list = SECT_XINFA[sectId];
        var sectName = SECT_DISPLAY[sectId] || sectId;
        var featDef = Data.SECTS && Data.SECTS[sectId] ? Data.SECTS[sectId].feature : null;

        list.forEach(function (item, i) {
            var name = item[0], descSuffix = item[1], passive = item[2], featBoost = item[3], featDesc = item[4];
            var id = 'xf_' + sectId + '_' + (i + 1);
            var isUltimate = (i === 4);

            Data.XINFA[id] = {
                id: id,
                name: name,
                category: sectName + (isUltimate ? '至高心法' : '鎮派心法'),
                origin: sectName + (isUltimate ? '至高心法' : '鎮派心法'),
                reqLv: TIER_LV[i],
                sectReq: sectId,
                desc: '【' + sectName + '第 ' + (i + 1) + '階心法】' + descSuffix,
                spCost: TIER_SP[i],
                passivePerLv: passive,
                featBoost: featBoost,
                activeEffectDesc: featDef
                    ? (featDef.icon + ' ' + featDef.name + '：' + featDesc)
                    : featDesc,
                effectType: 'sect_feature'
            };
        });
    });
})();