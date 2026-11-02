// js/petData.js
// 專門存放：靈獸與生化坐騎數據 (PETS)
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.PETS = {
        cyber_hound: {
            id: 'cyber_hound', name: '機械獵犬 K-9', species: '🤖 星際方舟生化獸', reqLv: 2,
            desc: '馬博士打造的鈦合金機械戰犬，內建紅外線鎖定儀，提升命中並撕咬敵人。',
            adoptGold: 120, feedGold: 60, feedSp: 40, skillName: '高頻粒子撕咬', effectType: 'bite', powerMult: 0.45,
            bonus: { atk: 12, def: 8, maxHp: 60, hit: 5 }
        },
        wuzhui_horse: {
            id: 'wuzhui_horse', name: '飛馬牧場・烏騅神駒', species: '🐎 尋秦/大唐絕世名駒', reqLv: 15,
            desc: '商秀珣飛馬牧場培育的汗血神駒，亦是項少龍愛駒，提升閃避、命中與暴擊抵抗。',
            adoptGold: 450, feedGold: 140, feedSp: 90, skillName: '鐵蹄破陣衝鋒', effectType: 'charge', powerMult: 0.65,
            bonus: { eva: 6, hit: 6, critRes: 5, atk: 28, maxHp: 220 }
        },
        black_eagle: {
            id: 'black_eagle', name: '驚雁宮・戰神黑雕', species: '🦅 塞外異種神禽', reqLv: 45,
            desc: '傳鷹翱翔天際的通靈巨雕，高空鷹眼鎖定敵人破綻，大幅提升命中與爆擊。',
            adoptGold: 1600, feedGold: 350, feedSp: 220, skillName: '九霄裂空爪', effectType: 'crit_claw', powerMult: 0.90,
            bonus: { crit: 8, hit: 12, eva: 6, atk: 65, maxHp: 500 }
        },
        flame_leopard: {
            id: 'flame_leopard', name: '魔師宮・赤焰雪豹', species: '🐯 域外冰火異獸', reqLv: 95,
            desc: '生於極北苦寒之地的通靈異豹，迅捷無倫，撲擊時為主人吸取真氣。',
            adoptGold: 4500, feedGold: 800, feedSp: 500, skillName: '赤焰噬魂撲', effectType: 'drain_bite', powerMult: 1.15,
            bonus: { atk: 160, def: 90, maxHp: 1200, hit: 15, critRes: 12 }
        },
        golden_roc: {
            id: 'golden_roc', name: '天竺・金翅大鵬鳥', species: '🦅 邊荒/武周神話靈禽', reqLv: 160,
            desc: '展翅遮天蔽日的神話靈禽，罡風護體提供極高閃避、命中與暴擊抵抗。',
            adoptGold: 15000, feedGold: 2200, feedSp: 1400, skillName: '扶搖九萬里・金羽嵐', effectType: 'crit_claw', powerMult: 1.45,
            bonus: { atk: 380, def: 220, maxHp: 3200, crit: 12, hit: 22, eva: 12, critRes: 18 }
        },
        void_dragon: {
            id: 'void_dragon', name: '戰神殿・破碎虛空魔龍', species: '🐉 上古天道神獸', reqLv: 220,
            desc: '鎮守《戰神圖錄》的太古魔龍，吐息間毀天滅地，無視敵方防禦並護佑主人。',
            adoptGold: 42000, feedGold: 5000, feedSp: 3200, skillName: '虛空滅世龍息', effectType: 'dragon_breath', powerMult: 1.75,
            bonus: { atk: 750, def: 450, maxHp: 7500, crit: 15, hit: 28, critRes: 25 }
        },
        star_behemoth: {
            id: 'star_behemoth', name: '黑洞星門・量子吞星獸', species: '🌌 超維宇宙終極巨獸', reqLv: 270,
            desc: '棲息於星際黑洞邊緣的反物質巨獸，掌控重力波與曲速力場，萬法不侵。',
            adoptGold: 110000, feedGold: 12000, feedSp: 8000, skillName: '超新星引力坍縮砲', effectType: 'dragon_breath', powerMult: 2.20,
            bonus: { atk: 1600, def: 1000, maxHp: 18000, crit: 20, eva: 16, hit: 38, critRes: 38 }
        }
    };
})();