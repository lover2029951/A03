// js/meridianData.js  (v45)
// 獨立人體十四經脈
//
// v45 修正：
//   ⭐ 廢除舊 elemAtk / elemDef 單一數值
//   ⭐ 改為 elAtk / elDef 八元素結構（陽經主攻、陰經主防）
//   ⭐ 舊 elemAtk 已預先 ÷4 換算（如 28 → 7），等效戰力不變
//   ⭐ elAtk / elDef 不套用武學 ÷4 政策
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.MERIDIANS = [
        // ── 十二正經（陽經主攻、陰經主防）──
        {
            id: 'm_1_fei', name: '1. 手太陰肺經', reqLv: 1, spCost: 150,
            desc: '主司呼吸吐納，屬金。每重提升：最大氣血 +22.5、最大內力 +1.75、金元素攻擊 +3、金元素防禦 +3',
            bonus: { maxHp: 90, maxMp: 7, elAtk: { metal: 3 }, elDef: { metal: 3 } }
        },
        {
            id: 'm_2_dachang', name: '2. 手陽明大腸經', reqLv: 10, spCost: 220,
            desc: '主司津液傳導，屬金（陽）。每重提升：護體防禦 +4.5、最大氣血 +17.5、金元素防禦 +4',
            bonus: { def: 18, maxHp: 70, elDef: { metal: 4 } }
        },
        {
            id: 'm_3_wei', name: '3. 足陽明胃經', reqLv: 20, spCost: 320,
            desc: '多氣多血之經，屬土（陽）。每重提升：最大氣血 +35、暴擊抵抗 +0.25%、土元素攻擊 +4',
            bonus: { maxHp: 140, critRes: 1, elAtk: { earth: 4 } }
        },
        {
            id: 'm_4_pi', name: '4. 足太陰脾經', reqLv: 30, spCost: 450,
            desc: '後天氣血之本，屬土。每重提升：外功與內勁攻擊 +6.25、氣血 +25、土元素防禦 +4',
            bonus: { atk: 25, maxHp: 100, elDef: { earth: 4 } }
        },
        {
            id: 'm_5_xin', name: '5. 手少陰心經', reqLv: 45, spCost: 650,
            desc: '君主之官神明所出，屬火。每重提升：火元素攻擊 +7、會心爆擊 +0.25%',
            bonus: { crit: 1, elAtk: { fire: 7 } }
        },
        {
            id: 'm_6_xiaochang', name: '6. 手太陽小腸經', reqLv: 60, spCost: 900,
            desc: '受盛之官化生精微，屬火（陽）。每重提升：精準命中 +0.5%、基礎攻擊 +8、火元素防禦 +4、冰元素防禦 +2',
            bonus: { hit: 2, atk: 32, elDef: { fire: 4, ice: 2 } }
        },
        {
            id: 'm_7_pangguang', name: '7. 足太陽膀胱經', reqLv: 75, spCost: 1250,
            desc: '通體陽氣之藩籬，屬水（陽）。每重提升：護體防禦 +8.75、水元素防禦 +6',
            bonus: { def: 35, elDef: { water: 6 } }
        },
        {
            id: 'm_8_shen', name: '8. 足少陰腎經', reqLv: 95, spCost: 1700,
            desc: '先天元氣之根，屬水。每重提升：最大內力 +6.25、暴擊抵抗 +0.5%、水元素攻擊 +6',
            bonus: { maxMp: 25, critRes: 2, elAtk: { water: 6 } }
        },
        {
            id: 'm_9_xinbao', name: '9. 手厥陰心包經', reqLv: 115, spCost: 2300,
            desc: '護衛心脈氣機，屬雷（陰）。每重提升：最大氣血 +60、雷元素防禦 +9',
            bonus: { maxHp: 240, elDef: { lightning: 9 } }
        },
        {
            id: 'm_10_sanjiao', name: '10. 手少陽三焦經', reqLv: 135, spCost: 3100,
            desc: '決瀆之官通行元氣，屬雷（陽）。每重提升：基礎攻擊 +13.75、雷元素攻擊 +10',
            bonus: { atk: 55, elAtk: { lightning: 10 } }
        },
        {
            id: 'm_11_dan', name: '11. 足少陽膽經', reqLv: 155, spCost: 4200,
            desc: '中正之官主司決斷，屬木（陽）。每重提升：會心爆擊 +0.5%、精準命中 +0.5%、攻擊 +11.25、木元素攻擊 +8',
            bonus: { crit: 2, hit: 2, atk: 45, elAtk: { wood: 8 } }
        },
        {
            id: 'm_12_gan', name: '12. 足厥陰肝經', reqLv: 180, spCost: 5600,
            desc: '將軍之官主司疏泄，屬木（陰）。每重提升：輕功閃避 +0.5%、基礎攻擊 +17.5、風元素防禦 +7',
            bonus: { eva: 2, atk: 70, elDef: { wind: 7 } }
        },

        // ── 任督二脈（總綱，最強）──
        {
            id: 'm_13_ren', name: '13. 任脈・陰脈之海', reqLv: 210, spCost: 7800,
            desc: '總任諸陰之海，屬冰。每重提升：最大氣血 +125、護體防禦 +16.25、暴抗 +0.75%、冰元素攻擊 +12、冰元素防禦 +8',
            bonus: { maxHp: 500, def: 65, critRes: 3, elAtk: { ice: 12 }, elDef: { ice: 8 } }
        },
        {
            id: 'm_14_du', name: '14. 督脈・陽脈之海', reqLv: 240, spCost: 11000,
            desc: '總督諸陽之海，屬雷風。每重提升：基礎攻擊 +30、雷元素攻擊 +20、風元素攻擊 +10、會心 +0.75%',
            bonus: { atk: 120, crit: 3, elAtk: { lightning: 20, wind: 10 } }
        }
    ];

    // ══════ 元素歸屬一覽（供 UI / 教學使用）══════
    Data.MERIDIAN_ELEMENT_MAP = {
        m_1_fei: 'metal', m_2_dachang: 'metal',
        m_3_wei: 'earth', m_4_pi: 'earth',
        m_5_xin: 'fire', m_6_xiaochang: 'fire',
        m_7_pangguang: 'water', m_8_shen: 'water',
        m_9_xinbao: 'lightning', m_10_sanjiao: 'lightning',
        m_11_dan: 'wood', m_12_gan: 'wind',
        m_13_ren: 'ice', m_14_du: 'lightning'
    };
})();