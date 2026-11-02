// js/lotteryCelebData.js  (v1)
// ═══════════════════════════════════════════════════════════════════════
//  大樂透虛擬人物資料庫（世界名人）
//
//  ⭐ 本檔只放「資料」，不含任何邏輯。
//  ⭐ spend: [最小下注, 最大下注]（單位：兩紋銀）
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    var Data = window.HY.Data;

    Data.LOTTERY_CELEBS = [
        // ══════════ 科學與發明 ══════════
        { id: 'einstein',      name: '愛因斯坦',     icon: '🧠', title: '相對論之父',       spend: [200,  3000] },
        { id: 'newton',        name: '牛頓',         icon: '🍎', title: '萬有引力發現者',   spend: [200,  2500] },
        { id: 'tesla',         name: '特斯拉',       icon: '⚡', title: '交流電之父',       spend: [500,  5000] },
        { id: 'edison',        name: '愛迪生',       icon: '💡', title: '發明大王',         spend: [300,  4000] },
        { id: 'curie',         name: '居禮夫人',     icon: '🧪', title: '兩屆諾貝爾獎得主', spend: [300,  3000] },
        { id: 'turing',        name: '圖靈',         icon: '🤖', title: '電腦科學之父',     spend: [500,  6000] },
        { id: 'hawking',       name: '霍金',         icon: '🌌', title: '黑洞理論大師',     spend: [300,  3500] },
        { id: 'darwin',        name: '達爾文',       icon: '🐒', title: '演化論之父',       spend: [200,  2000] },
        { id: 'galileo',       name: '伽利略',       icon: '🔭', title: '近代科學之父',     spend: [200,  2200] },
        { id: 'archimedes',    name: '阿基米德',     icon: '🛁', title: '浮力原理發現者',   spend: [150,  1800] },
        { id: 'feynman',       name: '費曼',         icon: '📐', title: '量子電動力學家',   spend: [400,  4500] },
        { id: 'bohr',          name: '波耳',         icon: '⚛️', title: '原子模型提出者',   spend: [300,  3200] },

        // ══════════ 帝王將相 ══════════
        { id: 'napoleon',      name: '拿破崙',       icon: '🎖️', title: '法蘭西第一皇帝',   spend: [800,  12000] },
        { id: 'qinshihuang',   name: '秦始皇',       icon: '👑', title: '千古一帝',         spend: [1000, 15000] },
        { id: 'wuzetian',      name: '武則天',       icon: '🌺', title: '大周聖神皇帝',     spend: [800,  10000] },
        { id: 'caocao',        name: '曹操',         icon: '⚔️', title: '魏武帝',           spend: [500,  7000] },
        { id: 'zhugeliang',    name: '諸葛亮',       icon: '🪶', title: '臥龍先生',         spend: [400,  5000] },
        { id: 'guanyu',        name: '關羽',         icon: '🐲', title: '武聖關公',         spend: [300,  4000] },
        { id: 'zhaoyun',       name: '趙雲',         icon: '🗡️', title: '常山趙子龍',       spend: [300,  3500] },
        { id: 'genghis',       name: '成吉思汗',     icon: '🏹', title: '蒙古帝國開創者',   spend: [1200, 18000] },
        { id: 'zhenghe',       name: '鄭和',         icon: '⛵', title: '七下西洋統帥',     spend: [600,  8000] },

        // ══════════ 文學藝術 ══════════
        { id: 'shakespeare',   name: '莎士比亞',     icon: '🎭', title: '戲劇大師',         spend: [300,  4000] },
        { id: 'davinci',       name: '達文西',       icon: '🎨', title: '文藝復興全才',     spend: [500,  6000] },
        { id: 'van_gogh',      name: '梵谷',         icon: '🌻', title: '後印象派畫家',     spend: [100,  1200] },
        { id: 'picasso',       name: '畢卡索',       icon: '🖼️', title: '立體主義宗師',     spend: [600,  8000] },
        { id: 'michelangelo',  name: '米開朗基羅',   icon: '🗿', title: '雕塑巨匠',         spend: [400,  5000] },
        { id: 'beethoven',     name: '貝多芬',       icon: '🎼', title: '樂聖',             spend: [300,  3600] },
        { id: 'mozart',        name: '莫札特',       icon: '🎹', title: '音樂神童',         spend: [300,  3800] },
        { id: 'libai',         name: '李白',         icon: '🍶', title: '詩仙',             spend: [150,  2000] },
        { id: 'dufu',          name: '杜甫',         icon: '📜', title: '詩聖',             spend: [100,  1200] },
        { id: 'sushi',         name: '蘇東坡',       icon: '🌕', title: '北宋文豪',         spend: [200,  2400] },
        { id: 'wangxizhi',     name: '王羲之',       icon: '🖌️', title: '書聖',             spend: [300,  3500] },
        { id: 'tolstoy',       name: '托爾斯泰',     icon: '📖', title: '戰爭與和平作者',   spend: [300,  3200] },
        { id: 'hemingway',     name: '海明威',       icon: '🐟', title: '老人與海作者',     spend: [200,  2600] },

        // ══════════ 武林宗師 ══════════
        { id: 'zhang_sanfeng', name: '張三丰',       icon: '☯️', title: '武當開山祖師',     spend: [400,  5000] },
        { id: 'huang_yaoshi',  name: '黃藥師',       icon: '🌸', title: '東邪桃花島主',     spend: [500,  6000] },
        { id: 'hong_qigong',   name: '洪七公',       icon: '🐉', title: '北丐九指神丐',     spend: [200,  2500] },
        { id: 'dugu_qiuqiu',   name: '獨孤求敗',     icon: '⚔️', title: '劍魔',             spend: [600,  8000] },
        { id: 'dongfang_bubai',name: '東方不敗',     icon: '🧵', title: '日月神教教主',     spend: [700,  9000] },
        { id: 'saodiseng',     name: '掃地僧',       icon: '🧹', title: '藏經閣神僧',       spend: [800,  12000] },
        { id: 'wuyazi',        name: '無崖子',       icon: '🎋', title: '逍遙派掌門',       spend: [500,  6500] },

        // ══════════ 現代風雲 ══════════
        { id: 'musk',          name: '馬斯克',       icon: '🚀', title: '火星殖民推手',     spend: [1500, 25000] },
        { id: 'gates',         name: '比爾蓋茲',     icon: '💻', title: '軟體帝國創辦人',   spend: [1200, 20000] },
        { id: 'jobs',          name: '賈伯斯',       icon: '📱', title: '蘋果教主',         spend: [1000, 16000] },
        { id: 'bezos',         name: '貝佐斯',       icon: '📦', title: '電商帝國霸主',     spend: [1200, 18000] },
        { id: 'buffett',       name: '巴菲特',       icon: '📈', title: '股神',             spend: [2000, 30000] },
        { id: 'jordan',        name: '喬丹',         icon: '🏀', title: '籃球之神',         spend: [800,  12000] },
        { id: 'messi',         name: '梅西',         icon: '⚽', title: '足球球王',         spend: [600,  9000] },
        { id: 'beckham',       name: '貝克漢',       icon: '🎯', title: '萬人迷',           spend: [500,  7000] },
        { id: 'federer',       name: '費德勒',       icon: '🎾', title: '網球優雅之王',     spend: [500,  8000] },
        { id: 'tyson',         name: '泰森',         icon: '🥊', title: '拳王',             spend: [400,  6000] },

        // ══════════ 東西方哲人 / 傳奇 ══════════
        { id: 'zhangheng',     name: '張衡',         icon: '🌍', title: '地動儀發明者',     spend: [200,  2400] },
        { id: 'zuchongzhi',    name: '祖沖之',       icon: '📏', title: '精算圓周率',       spend: [200,  2200] },
        { id: 'huatuo',        name: '華佗',         icon: '🌿', title: '神醫',             spend: [150,  1800] },
        { id: 'confucius',     name: '孔子',         icon: '📚', title: '至聖先師',         spend: [300,  3600] },
        { id: 'laozi',         name: '老子',         icon: '☯️', title: '道家始祖',         spend: [300,  3400] },
        { id: 'socrates',      name: '蘇格拉底',     icon: '🏛️', title: '西方哲學之父',     spend: [200,  2400] },
        { id: 'aristotle',     name: '亞里斯多德',   icon: '🔬', title: '百科全書式學者',   spend: [300,  3200] },
        { id: 'plato',         name: '柏拉圖',       icon: '💭', title: '理想國作者',       spend: [250,  2800] },
        { id: 'kant',          name: '康德',         icon: '🕰️', title: '三大批判作者',     spend: [250,  3000] },
        { id: 'nietzsche',     name: '尼采',         icon: '🌑', title: '超人哲學家',       spend: [200,  2600] }
    ];

    console.log('[lotteryCelebData] ✓ 已載入 ' + Data.LOTTERY_CELEBS.length + ' 位世界名人');
})();