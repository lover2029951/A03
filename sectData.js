// js/sectData.js  (v39)
// 15 大門派：各自擁有獨一無二的「專屬門派特色」機制
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    function tree(sectId) {
        var arr = [];
        for (var i = 1; i <= 10; i++) arr.push(sectId + '_art_' + i);
        return arr;
    }

    Data.SECTS = {
        shaolin: {
            id: 'shaolin', name: '少林派', reqLv: 10,
            desc: '【天下武功出少林】外家金剛體魄之巔，十式韋陀杵、獅子吼與如來神掌，以業力反震護體。',
            bonus: { maxHp: 350, def: 45, critRes: 15 },
            feature: {
                id: 'karma', name: '金剛業力', icon: '🛡️', color: '#fbbf24', maxStack: 10,
                shortDesc: '受擊疊業力減傷，出手引爆反震',
                desc: '受敵方攻擊時凝聚 1 層「金剛業力」（上限 10 層），每層使自身受到的傷害降低 2%；出手時引爆全部業力，每層對敵人追加 0.30 倍攻擊力的無視防禦反震傷害。'
            },
            signatureSkill: 'shaolin_art_1',
            skillTree: tree('shaolin')
        },
        mingjiao: {
            id: 'mingjiao', name: '明教', reqLv: 10,
            desc: '【熊熊聖火焚盡八荒】近戰狂暴聖火之門，十式純陽刀與九陽焚天，以聖火殘血增幅焚盡萬物。',
            bonus: { atk: 60, crit: 12, hit: 8 },
            feature: {
                id: 'ignite', name: '聖火燎原', icon: '🔥', color: '#ef4444', maxStack: 8,
                shortDesc: '點燃聖火持續灼傷，自身殘血增幅',
                desc: '攻擊為敵人疊加 1 層「聖火」（上限 8 層），每層每回合造成 0.15 倍攻擊力的灼傷；自身每損失 10% 氣血，「聖火」灼傷威力提升 8%。'
            },
            signatureSkill: 'mingjiao_art_1',
            skillTree: tree('mingjiao')
        },
        gaibang: {
            id: 'gaibang', name: '丐幫', reqLv: 10,
            desc: '【天下第一大幫】身法矯健、連擊無雙，十式打狗棒法與降龍廿八掌，以連環破綻蠶食強敵。',
            bonus: { eva: 14, hit: 12, maxHp: 220, atk: 35 },
            feature: {
                id: 'breach', name: '連環破綻', icon: '🎯', color: '#10b981', maxStack: 12,
                shortDesc: '同目標連擊疊破綻，傷害遞增',
                desc: '對同一目標連續命中時累積 1 層「破綻」（上限 12 層），每層使自身對該目標造成的傷害提升 4%；一旦切換攻擊目標，破綻立即清空。'
            },
            signatureSkill: 'gaibang_art_1',
            skillTree: tree('gaibang')
        },
        wudang: {
            id: 'wudang', name: '武當派', reqLv: 10,
            desc: '【道門玄功內家之宗】真氣浩瀚，十式兩儀劍與太極玄功，以化勁存真氣反擊制敵。',
            bonus: { maxMp: 47, hit: 15, crit: 10, atk: 40 },
            feature: {
                id: 'chi', name: '太極化勁', icon: '☯️', color: '#38bdf8', maxStack: 15,
                shortDesc: '受擊存真氣增暴抗，出手釋放內勁',
                desc: '受敵方攻擊時儲存 1 層「真氣」（上限 15 層），每層使自身暴擊抵抗提升 1.5%；出手時消耗全部真氣，每層追加 0.25 倍內力上限的無屬性內勁傷害。'
            },
            signatureSkill: 'wudang_art_1',
            skillTree: tree('wudang')
        },
        emei: {
            id: 'emei', name: '峨嵋派', reqLv: 10,
            desc: '【金頂佛光普渡眾生】攻守兼備之醫仙劍派，十式清心咒與金頂佛光，以慈悲印記庇佑全隊。',
            bonus: { maxHp: 280, maxMp: 40, def: 35, critRes: 14 },
            feature: {
                id: 'mercy', name: '慈航印記', icon: '💚', color: '#34d399', maxStack: 10,
                shortDesc: '治療疊慈悲，全隊攻防遞增',
                desc: '每次為隊友或自身回復氣血時，累積 1 層「慈悲」（上限 10 層），每層使全隊隊員攻擊與防禦提升 1.5%；施術者自身獲雙倍加成。'
            },
            signatureSkill: 'emei_art_1',
            skillTree: tree('emei')
        },
        xingxiu: {
            id: 'xingxiu', name: '星宿派', reqLv: 10,
            desc: '【星宿老仙法駕中原】西域劇毒內家掌門，十式腐屍毒與化功大法，以萬毒蝕骨削減敵之上限。',
            bonus: { atk: 55, crit: 10, maxHp: 200, critRes: 10 },
            feature: {
                id: 'poison', name: '萬毒蝕骨', icon: '☠️', color: '#22c55e', maxStack: 10,
                shortDesc: '劇毒削減敵方氣血上限',
                desc: '攻擊為敵人注入 1 層「劇毒」（上限 10 層），每層永久降低目標 3% 最大氣血上限（該目標氣血上限無法回復）；中毒目標死亡時，劇毒會傳染 1 層至其他存活敵人。'
            },
            signatureSkill: 'xingxiu_art_1',
            skillTree: tree('xingxiu')
        },
        tianlong: {
            id: 'tianlong', name: '天龍寺', reqLv: 10,
            desc: '【大理皇室段氏絕學】內外兼修、百步穿楊，十式一陽指與六脈神劍，以脈門標記貫穿一切護體。',
            bonus: { hit: 22, atk: 45, def: 30, critRes: 10 },
            feature: {
                id: 'meridian', name: '六脈貫通', icon: '👁️', color: '#38bdf8', maxStack: 6,
                shortDesc: '標記脈門必中，滿層觸發必殺',
                desc: '攻擊為敵人標記 1 層「脈門」（上限 6 層），每層使自身對該目標的命中率提升 8%、無視其 5% 閃避；累積至滿層時，下一次攻擊必定命中且無視 50% 防禦。'
            },
            signatureSkill: 'tianlong_art_1',
            skillTree: tree('tianlong')
        },
        tianshan: {
            id: 'tianshan', name: '天山派', reqLv: 10,
            desc: '【靈鷲宮折梅刺客】冰封萬里、十步一殺，十式折梅手與八荒六合，以冰魄凍結敵之行動。',
            bonus: { crit: 18, eva: 12, atk: 48 },
            feature: {
                id: 'frost', name: '冰魄凍結', icon: '❄️', color: '#67e8f9', maxStack: 8,
                shortDesc: '寒冰減速敵方出手，滿層定身',
                desc: '攻擊為敵人疊加 1 層「寒冰」（上限 8 層），每層使其出手速度降低 4%；累積至滿層時，目標凍結 2 回合內無法行動，凍結期間自身對其暴擊率提升 30%。'
            },
            signatureSkill: 'tianshan_art_1',
            skillTree: tree('tianshan')
        },
        xiaoyao: {
            id: 'xiaoyao', name: '逍遙派', reqLv: 10,
            desc: '【凌波微步奇門遁甲】精通十式彈指神功與北冥神功，以納元吸取內力，內力越盛威力越強。',
            bonus: { eva: 15, hit: 14, maxMp: 33, atk: 38 },
            feature: {
                id: 'drain', name: '北冥納元', icon: '💧', color: '#a78bfa', maxStack: 1,
                shortDesc: '吸取敵方內力，內力越高傷害越強',
                desc: '每次攻擊吸取目標 0.10 倍自身內力上限的內力；自身內力高於 50% 時，所有傷害額外提升（當前內力百分比 - 50%）× 0.6 的幅度。'
            },
            signatureSkill: 'xiaoyao_art_1',
            skillTree: tree('xiaoyao')
        },
        murong: {
            id: 'murong', name: '慕容世家', reqLv: 10,
            desc: '【以彼之道還施彼身】燕子塢皇族劍派，十式斗轉星移與參合指，以彼力返施之道反制強敵。',
            bonus: { atk: 45, def: 38, maxHp: 250, critRes: 12 },
            feature: {
                id: 'reflect', name: '斗轉還施', icon: '↩️', color: '#60a5fa', maxStack: 1,
                shortDesc: '記錄受擊傷害，出手時返還',
                desc: '每次受到敵方攻擊時，記錄該次傷害為「彼力」（累積上限為自身最大氣血的 30%）；出手時釋放全部彼力，對敵人造成 1.5 倍彼力的真實傷害。'
            },
            signatureSkill: 'murong_art_1',
            skillTree: tree('murong')
        },
        tangmen: {
            id: 'tangmen', name: '唐門', reqLv: 10,
            desc: '【蜀中唐門機關暴雨】暗器與毒弩之王，十式鐵蒺藜與孔雀翎，以千機連爆傾瀉萬箭。',
            bonus: { crit: 16, hit: 16, atk: 52 },
            feature: {
                id: 'trap', name: '千機連爆', icon: '🕸️', color: '#f97316', maxStack: 10,
                shortDesc: '攻擊佈置機關，群攻時連鎖引爆',
                desc: '每次攻擊在場上佈置 1 枚「機關」（上限 10 枚）；當自身施展群攻招式時，每枚機關額外引爆 0.20 倍攻擊力的穿刺傷害，並使該次群攻傷害提升 5%。'
            },
            signatureSkill: 'tangmen_art_1',
            skillTree: tree('tangmen')
        },
        guigu: {
            id: 'guigu', name: '鬼谷派', reqLv: 10,
            desc: '【縱橫捭闔算盡蒼生】陣法與謀略宗師，十式一氣三清與陰陽縱橫，以奇門變陣掌控戰局。',
            bonus: { atk: 42, def: 35, maxHp: 240, maxMp: 30 },
            feature: {
                id: 'formation', name: '奇門變陣', icon: '🎴', color: '#8b5cf6', maxStack: 4,
                shortDesc: '四門輪轉，提供不同增益',
                desc: '每回合自動輪轉「奇門四陣」：景門（攻擊 +12%）、死門（防禦 +15%）、驚門（暴擊 +10%）、開門（每回合回復 6% 氣血與內力）；陣法於每回合出手前切換。'
            },
            signatureSkill: 'guigu_art_1',
            skillTree: tree('guigu')
        },
        taohuadao: {
            id: 'taohuadao', name: '桃花島', reqLv: 10,
            desc: '【東邪奇門碧海潮生】離島琴簫合璧，十式落英神劍掌與碧海潮生曲，以五行逆轉變化無方。',
            bonus: { hit: 15, eva: 14, crit: 10, atk: 42 },
            feature: {
                id: 'element', name: '五行逆轉', icon: '🌈', color: '#f472b6', maxStack: 5,
                shortDesc: '攻擊隨機輪換五行，額外屬攻',
                desc: '每次攻擊隨機輪換一種五行屬性（金→木→水→火→土 循環），額外造成該屬性 0.50 倍靈根屬攻的傷害，並無視屬性相剋造成的傷害減免。'
            },
            signatureSkill: 'taohuadao_art_1',
            skillTree: tree('taohuadao')
        },
        jueqinggu: {
            id: 'jueqinggu', name: '絕情谷', reqLv: 10,
            desc: '【問世間情是何物】刀劍雙持奇門，十式陰陽倒亂刃與玉女素心，以刀劍陰陽交替應戰。',
            bonus: { atk: 50, hit: 14, crit: 12 },
            feature: {
                id: 'yinyang', name: '陰陽倒亂', icon: '⚔️', color: '#e879f9', maxStack: 2,
                shortDesc: '奇偶回合切換刀劍模式',
                desc: '奇數回合自動進入「陽刀」模式（攻擊 +40%、防禦 -20%）；偶數回合進入「陰劍」模式（防禦 +40%、攻擊時回復 20% 造成傷害為氣血）；兩種模式於每回合出手前自動切換。'
            },
            signatureSkill: 'jueqinggu_art_1',
            skillTree: tree('jueqinggu')
        },
        erengu: {
            id: 'erengu', name: '惡人谷', reqLv: 10,
            desc: '【四大惡人煞氣滔天】凶戾霸道的禁忌魔門，十式鱷嘴剪與一陽指魔杖，以血怒沸騰嗜血屠戮。',
            bonus: { atk: 65, crit: 14, maxHp: 180 },
            feature: {
                id: 'fury', name: '血怒沸騰', icon: '🩸', color: '#dc2626', maxStack: 5,
                shortDesc: '殘血增幅，擊殺回血疊血怒',
                desc: '自身氣血越低，攻擊越高（每損失 10% 氣血攻擊提升 6%）；擊殺敵人時回復 8% 最大氣血，並永久疊加 1 層「血怒」（上限 5 層，每層攻擊 +3%）。'
            },
            signatureSkill: 'erengu_art_1',
            skillTree: tree('erengu')
        }
    };
})();