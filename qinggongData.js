// js/qinggongData.js  (v40)
// 4 門江湖共通輕功 + 15 大門派 × 3 門專屬身法 = 49 門
//
// v40 修正（收尾整理）：
//   ⭐ desc 移除「每級提升：…」的數值列 —— 該數值由 uiMartialSect.formatScaledBonus
//      統一計算與顯示，原本在此預先算好會導致卡片上出現兩次「每級提升」
//   ⭐ desc 只保留門派風格文案（數值仍完整存在於 bonus 欄位）
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    const SECT_TIER_LV = [30, 120, 240];
    const SECT_TIER_SP = [200, 1500, 6000];

    const SECT_QINGGONG = {
        shaolin: [
            ['少林鐵布衫身法', '少林硬功樁步，業力凝聚更速。', { def: 25, maxHp: 150, atkSpd: 1 }, { dr: 0.002, max: 1 }],
            ['少林龍爪手步法', '龍爪手進退如龍，業力不散。', { def: 60, maxHp: 350, critRes: 2, atkSpd: 2 }, { dr: 0.002, max: 2, reflect: 0.03 }],
            ['一葦渡江身法', '達摩一葦渡江絕技，業力如海。', { def: 140, maxHp: 800, critRes: 4, atkSpd: 3 }, { dr: 0.003, max: 3, reflect: 0.05, releaseHeal: 0.03 }]
        ],
        mingjiao: [
            ['聖火身法', '聖火迅捷身法，火種易燃。', { atk: 25, crit: 1, atkSpd: 1 }, { dot: 0.01 }],
            ['光明頂身法', '聖火教徒奔襲，火勢蔓延。', { atk: 62, crit: 2, maxHp: 250, atkSpd: 2 }, { dot: 0.015, max: 1 }],
            ['乾坤大挪移身法', '挪移乾坤之絕世身法。', { atk: 145, crit: 4, maxHp: 600, atkSpd: 3 }, { dot: 0.02, max: 1, lowHpBonus: 0.03 }]
        ],
        gaibang: [
            ['丐幫遊身步', '街頭歷練步法，尋隙而入。', { eva: 2, hit: 4, atkSpd: 1 }, { dmg: 0.002 }],
            ['丐幫醉步', '醉拳醉步，虛實難測。', { eva: 4, hit: 10, atk: 50, maxHp: 240, atkSpd: 2 }, { dmg: 0.003, max: 2 }],
            ['逍遙遊身法', '逍遙遊身，天地共遊。', { eva: 7, hit: 18, atk: 120, maxHp: 550, atkSpd: 3 }, { dmg: 0.004, max: 3 }]
        ],
        wudang: [
            ['武當輕功', '武當基礎輕身功夫，化勁有序。', { maxMp: 10, hit: 3, atkSpd: 1 }, { critRes: 0.002 }],
            ['梯雲縱', '梯雲縱真訣，踏雲而上。', { maxMp: 23, hit: 8, atk: 40, atkSpd: 2 }, { critRes: 0.002, release: 0.03, max: 2 }],
            ['太極輕功', '太極玄功化入輕功，玄妙無方。', { maxMp: 53, hit: 15, atk: 110, maxHp: 400, atkSpd: 3 }, { critRes: 0.003, release: 0.05, max: 3 }]
        ],
        emei: [
            ['峨嵋身法', '金頂雲霧步法，慈悲隨行。', { maxHp: 140, maxMp: 8, def: 10, atkSpd: 1 }, { atkDef: 0.002 }],
            ['峨嵋佛光步', '佛光籠罩之步法，安詳自在。', { maxHp: 330, maxMp: 20, def: 28, atkSpd: 2 }, { atkDef: 0.003, max: 2, healBonus: 0.01 }],
            ['慈航身法', '慈航普渡之身法，普度眾生。', { maxHp: 750, maxMp: 47, def: 65, critRes: 4, atkSpd: 3 }, { atkDef: 0.004, max: 3, healBonus: 0.03 }]
        ],
        xingxiu: [
            ['星宿身法', '陰沉步法如蛇潛行，毒意暗藏。', { atk: 22, critRes: 2, atkSpd: 1 }, { cut: 0.002 }],
            ['化功身法', '化功大法配套身法，吸取生機。', { atk: 55, critRes: 4, maxHp: 260, atkSpd: 2 }, { cut: 0.003, max: 2 }],
            ['星宿老仙身法', '星宿老仙傳授身法，陰毒莫測。', { atk: 128, critRes: 7, maxHp: 620, atkSpd: 3 }, { cut: 0.004, max: 3 }]
        ],
        tianlong: [
            ['天龍身法', '大理段氏基礎身法，沉穩威嚴。', { hit: 5, def: 12, atkSpd: 1 }, { hit: 0.01 }],
            ['大理段氏步法', '大理皇族步法，氣度不凡。', { hit: 12, def: 32, atk: 48, atkSpd: 2 }, { hit: 0.02, max: 1 }],
            ['六脈神劍身法', '六脈神劍配套身法，劍隨身走。', { hit: 22, def: 78, atk: 125, maxHp: 480, atkSpd: 3 }, { hit: 0.03, max: 2, pen: 0.05 }]
        ],
        tianshan: [
            ['天山身法', '天山靈鷲宮基礎身法。', { crit: 2, eva: 2, atkSpd: 1 }, { slow: 0.003 }],
            ['折梅手身法', '折梅手配套身法，如梅飄零。', { crit: 3, eva: 4, atk: 55, atkSpd: 2 }, { slow: 0.005, max: 1, critBonus: 0.03 }],
            ['八荒六合身法', '八荒六合唯我獨尊身法。', { crit: 6, eva: 7, atk: 138, maxHp: 500, atkSpd: 3 }, { slow: 0.007, max: 2, critBonus: 0.06 }]
        ],
        xiaoyao: [
            ['逍遙身法', '逍遙派基礎身法，悠然自得。', { eva: 3, maxMp: 9, atkSpd: 1 }, { drain: 0.005 }],
            ['凌波微步', '凌波微步真訣，踏水無痕。', { eva: 5, maxMp: 22, atk: 48, atkSpd: 2 }, { drain: 0.008, dmgBonus: 0.03 }],
            ['北冥身法', '北冥神功配套身法，海納百川。', { eva: 9, maxMp: 51, atk: 118, maxHp: 460, atkSpd: 3 }, { drain: 0.012, dmgBonus: 0.05 }]
        ],
        murong: [
            ['慕容身法', '燕子塢慕容家傳身法。', { def: 18, atk: 20, atkSpd: 1 }, { cap: 0.01 }],
            ['燕子塢身法', '燕子塢皇家身法，輕盈如燕。', { def: 45, atk: 52, maxHp: 240, atkSpd: 2 }, { cap: 0.02, mult: 0.05 }],
            ['斗轉星移身法', '斗轉星移身法，以彼之道。', { def: 105, atk: 130, maxHp: 580, critRes: 3, atkSpd: 3 }, { cap: 0.03, mult: 0.08 }]
        ],
        tangmen: [
            ['唐門身法', '蜀中唐門基礎身法。', { crit: 2, hit: 4, atkSpd: 1 }, { dmg: 0.01 }],
            ['暗器身法', '暗器配套身法，機簧迅捷。', { crit: 3, hit: 10, atk: 52, atkSpd: 2 }, { dmg: 0.015, max: 2 }],
            ['千機匣身法', '千機匣配套身法，萬變不離。', { crit: 6, hit: 18, atk: 132, maxHp: 460, atkSpd: 3 }, { dmg: 0.02, max: 3, aoeBonus: 0.02 }]
        ],
        guigu: [
            ['鬼谷身法', '鬼谷派基礎身法，佈陣有序。', { def: 14, maxHp: 110, maxMp: 7, atkSpd: 1 }, { power: 0.03 }],
            ['太一身法', '太一神功配套身法，演化無窮。', { def: 38, maxHp: 290, maxMp: 17, atk: 45, atkSpd: 2 }, { power: 0.05 }],
            ['陰陽縱橫身法', '陰陽縱橫身法，縱橫捭闔。', { def: 88, maxHp: 680, maxMp: 40, atk: 118, atkSpd: 3 }, { power: 0.08 }]
        ],
        taohuadao: [
            ['桃花島身法', '桃花島基礎身法，落英繽紛。', { hit: 5, eva: 2, atkSpd: 1 }, { extra: 0.01 }],
            ['蘭花拂穴步', '蘭花拂穴手配套步法，點穴無形。', { hit: 11, eva: 4, atk: 50, atkSpd: 2 }, { extra: 0.02 }],
            ['落英神劍步', '落英神劍掌配套步法，掌劍合一。', { hit: 20, eva: 7, atk: 128, maxHp: 480, crit: 3, atkSpd: 3 }, { extra: 0.04 }]
        ],
        jueqinggu: [
            ['絕情谷身法', '絕情谷基礎身法，斷絕情絲。', { atk: 25, crit: 2, atkSpd: 1 }, { heal: 0.01 }],
            ['陰陽倒亂身法', '陰陽倒亂刃配套身法，刀劍齊鳴。', { atk: 60, crit: 3, maxHp: 240, atkSpd: 2 }, { atkUp: 0.02, defUp: 0.02, heal: 0.02 }],
            ['玉女素心步', '玉女素心步法，素心劍意。', { atk: 142, crit: 6, maxHp: 560, atkSpd: 3 }, { atkUp: 0.03, defUp: 0.03, heal: 0.03 }]
        ],
        erengu: [
            ['惡人谷身法', '凶戾狠辣基礎身法。', { atk: 30, maxHp: 120, atkSpd: 1 }, { perStack: 0.002 }],
            ['血煞身法', '血煞魔功配套身法，血氣翻騰。', { atk: 68, maxHp: 300, crit: 2, atkSpd: 2 }, { perStack: 0.003, lowHpBonus: 0.01 }],
            ['魔化身法', '一陽指魔化配套身法，凶煞絕倫。', { atk: 158, maxHp: 700, crit: 4, atkSpd: 3 }, { perStack: 0.005, lowHpBonus: 0.02, killHeal: 0.01 }]
        ]
    };

    const SECT_DISPLAY = {
        shaolin: '少林派', mingjiao: '明教', gaibang: '丐幫', wudang: '武當派', emei: '峨嵋派',
        xingxiu: '星宿派', tianlong: '天龍寺', tianshan: '天山派', xiaoyao: '逍遙派', murong: '慕容世家',
        tangmen: '唐門', guigu: '鬼谷派', taohuadao: '桃花島', jueqinggu: '絕情谷', erengu: '惡人谷'
    };

    var list = [
        {
            id: 'niaodu_shu', name: '鳥渡術', reqLv: 5, sectReq: null, category: '江湖共通',
            desc: '江湖基礎輕功，借力鍛體，可於樹梢屋簷間騰挪換氣。',
            spCost: 80, bonus: { def: 15, maxHp: 80, atkSpd: 1 }
        },
        {
            id: 'lian_bu', name: '踏水行', reqLv: 25, sectReq: null, category: '江湖共通',
            desc: '流傳於江湖的踏水無痕步法，水面行舟而不濕鞋襪。',
            spCost: 180, bonus: { maxHp: 160, maxMp: 10, atkSpd: 1 }
        },
        {
            id: 'huanmo_shenfa', name: '神行百變', reqLv: 70, sectReq: null, category: '江湖共通',
            desc: '鬼魅莫測的殺伐步法，虛實之間難辨其形。',
            spCost: 400, bonus: { atk: 45, crit: 2, atkSpd: 2 }
        },
        {
            id: 'xukong_bu', name: '踏雪無痕・虛空步', reqLv: 160, sectReq: null, category: '江湖共通',
            desc: '跨越空間維度的天道身法，一步可越十丈溪谷。',
            spCost: 1100, bonus: { atk: 120, def: 80, maxHp: 400, crit: 3, atkSpd: 3 }
        }
    ];

    Object.keys(SECT_QINGGONG).forEach(function (sectId) {
        var arr = SECT_QINGGONG[sectId];
        var sectName = SECT_DISPLAY[sectId] || sectId;

        arr.forEach(function (item, i) {
            var name = item[0], flavor = item[1], bonus = item[2], featBoost = item[3];
            var id = 'qg_' + sectId + '_' + (i + 1);
            var isUltimate = (i === 2);

            list.push({
                id: id,
                name: name,
                category: sectName + (isUltimate ? '鎮派身法' : '專屬身法'),
                reqLv: SECT_TIER_LV[i],
                sectReq: sectId,
                // ⭐ v40：desc 只保留風格文案。數值由 uiMartialSect.formatScaledBonus 顯示。
                desc: '【' + sectName + (isUltimate ? '鎮派身法' : '專屬身法') + '】' + flavor,
                spCost: SECT_TIER_SP[i],
                bonus: bonus,
                featBoost: featBoost
            });
        });
    });

    Data.QINGGONG = list;
})();