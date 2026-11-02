// js/mapData.js
// 專門存放：7大時空紀元 (ERAS) 與 Lv.1~300 共 20 張時空地圖與怪物數據 (MAPS)
window.HY = window.HY || {};
window.HY.Data = window.HY.Data || {};

(function () {
    const Data = window.HY.Data;

    Data.ERAS = [
        { id: 'modern',    name: '🛸 第一紀元：星際方舟總部 (Lv.1+)' },
        { id: 'datang',    name: '🐉 第二紀元：大唐雙龍傳 (Lv.1 ~ Lv.60)' },
        { id: 'xunqin',    name: '🏺 第三紀元：尋秦記・戰國七雄 (Lv.60 ~ Lv.110)' },
        { id: 'bianhuang', name: '⚔️ 第四紀元：邊荒傳說・五胡亂華 (Lv.110 ~ Lv.155)' },
        { id: 'fuyu',      name: '🌧️ 第五紀元：覆雨翻雲・大明江湖 (Lv.155 ~ Lv.200)' },
        { id: 'riyue',     name: '☀️ 第六紀元：日月當空・武周盛世 (Lv.200 ~ Lv.250)' },
        { id: 'posui',     name: '🌌 第七紀元：破碎虛空・超維天道 (Lv.250 ~ Lv.300)' }
    ];

    Data.MAPS = {
        star_ark: {
            id: 'star_ark', era: 'modern', name: '星際方舟主城', minLv: 1, hasMedicalPod: true,
            desc: '馬博士與時空管理局總部，設有時空醫療艙與全息訓練模擬器。',
            enemies: [
                { id: 'holo_drone', name: '全息訓練木人', lv: 1, hp: 70, atk: 12, def: 2, hit: 90, eva: 2, crit: 2, critRes: 0, exp: 30, sp: 25, gold: 20, faction: '星際方舟訓練營', skills: [{ name: '基礎直拳模擬', mult: 1.15, effect: 'normal' }] },
                { id: 'sec_mech', name: '暴走的機械警衛', lv: 4, hp: 160, atk: 24, def: 8, hit: 92, eva: 4, crit: 5, critRes: 2, exp: 70, sp: 50, gold: 45, faction: '方舟防衛系統', skills: [{ name: '高壓電擊警棍', mult: 1.25, effect: 'normal' }, { name: '雷射鎖定射擊', mult: 1.35, effect: 'pierce' }] },
                { id: 'time_hacker', name: '時空黑手特工', lv: 8, hp: 360, atk: 45, def: 16, hit: 95, eva: 8, crit: 8, critRes: 5, exp: 180, sp: 130, gold: 140, faction: '時空恐怖組織', skills: [{ name: '次元震盪匕', mult: 1.3, effect: 'pierce' }, { name: '奈米劇毒飛鏢', mult: 1.4, effect: 'drain' }] }
            ]
        },
        yangzhou: {
            id: 'yangzhou', era: 'datang', name: '揚州城郊', minLv: 1,
            desc: '《大唐雙龍傳》新手起點，寇仲與徐子陵曾在此混跡，石龍道場座落於此。',
            enemies: [
                { id: 'thug', name: '揚州竹花幫潑皮', lv: 2, hp: 95, atk: 16, def: 4, hit: 90, eva: 3, crit: 3, critRes: 0, exp: 40, sp: 30, gold: 30, faction: '揚州竹花幫', skills: [{ name: '市井潑皮刀', mult: 1.15, effect: 'normal' }] },
                { id: 'spy', name: '宇文閥密探', lv: 5, hp: 210, atk: 30, def: 10, hit: 93, eva: 6, crit: 6, critRes: 3, exp: 90, sp: 65, gold: 60, faction: '隋廷・宇文門閥', skills: [{ name: '冰玄寒氣掌', mult: 1.25, effect: 'normal' }] },
                { id: 'shilong', name: '【頭目】推山手・石龍', lv: 10, hp: 520, atk: 58, def: 22, hit: 96, eva: 8, crit: 10, critRes: 6, exp: 260, sp: 180, gold: 200, faction: '道門分支・石龍武場', skills: [{ name: '石龍推山手', mult: 1.35, effect: 'normal' }, { name: '長生破石勁', mult: 1.45, effect: 'pierce' }] }
            ]
        },
        nanyang: {
            id: 'nanyang', era: 'datang', name: '南陽城・飛馬牧場', minLv: 12,
            desc: '商秀珣執掌的飛馬牧場與南陽重鎮，四大寇與宇文化及大軍正虎視眈眈。',
            enemies: [
                { id: 'bandit_soldier', name: '四大寇劫匪', lv: 14, hp: 750, atk: 82, def: 32, hit: 96, eva: 9, crit: 8, critRes: 6, exp: 420, sp: 300, gold: 280, faction: '塞外四大寇聯軍', skills: [{ name: '狂風鬼頭刀', mult: 1.25, effect: 'normal' }] },
                { id: 'xiang_batian', name: '四大寇・向霸天', lv: 18, hp: 1150, atk: 115, def: 46, hit: 98, eva: 10, crit: 12, critRes: 9, exp: 680, sp: 480, gold: 500, faction: '四大寇首領', skills: [{ name: '霸天開山斧', mult: 1.35, effect: 'pierce' }] },
                { id: 'yuwen_huaji', name: '【頭目】宇文化及', lv: 22, hp: 1800, atk: 155, def: 65, hit: 102, eva: 14, crit: 15, critRes: 12, exp: 1150, sp: 820, gold: 880, faction: '隋廷・宇文門閥宗師', skills: [{ name: '冰玄勁・寒霜摧心', mult: 1.4, effect: 'pierce' }, { name: '千里冰封勁', mult: 1.25, effect: 'aoe' }] }
            ]
        },
        luoyang: {
            id: 'luoyang', era: 'datang', name: '東都洛陽・天街', minLv: 24,
            desc: '王世充盤踞的東都洛陽，淨念禪院和氏璧失竊，正邪兩道高手雲集。',
            enemies: [
                { id: 'demon_disciple', name: '曼清院陰癸刺客', lv: 26, hp: 2300, atk: 190, def: 80, hit: 104, eva: 16, crit: 14, critRes: 12, exp: 1500, sp: 1050, gold: 1100, faction: '魔門・陰癸派', skills: [{ name: '天魔迷魂飄帶', mult: 1.3, effect: 'normal' }] },
                { id: 'bian_bufu', name: '陰癸派・邊不負', lv: 30, hp: 3200, atk: 240, def: 105, hit: 106, eva: 18, crit: 16, critRes: 15, exp: 2200, sp: 1550, gold: 1600, faction: '魔門・陰癸派長老', skills: [{ name: '天魔雙環・絞殺', mult: 1.35, effect: 'pierce' }, { name: '魔門噬血功', mult: 1.4, effect: 'drain' }] },
                { id: 'baifeng', name: '【頭目】辟塵・榮鳳祥', lv: 35, hp: 4600, atk: 310, def: 135, hit: 110, eva: 20, crit: 18, critRes: 18, exp: 3400, sp: 2400, gold: 2500, faction: '魔門・邪極宗大賈', skills: [{ name: '辟塵奇功・拂袖破甲', mult: 1.45, effect: 'pierce' }, { name: '紫氣天羅・吸元勁', mult: 1.4, effect: 'drain' }] }
            ]
        },
        changan: {
            id: 'changan', era: 'datang', name: '長安城・楊公寶庫', minLv: 36,
            desc: '天下第一巧匠魯妙子設計的地下機關寶庫，邪帝舍利便藏於最深處。',
            enemies: [
                { id: 'bronze_guard', name: '寶庫機關銅人', lv: 38, hp: 5500, atk: 350, def: 165, hit: 108, eva: 12, crit: 12, critRes: 25, exp: 4200, sp: 3000, gold: 3100, faction: '魯妙子天工機關', skills: [{ name: '墨家機關重錘', mult: 1.35, effect: 'normal' }, { name: '地宮強弩齊射', mult: 1.25, effect: 'aoe' }] },
                { id: 'an_long', name: '天蓮宗主・安隆', lv: 42, hp: 7200, atk: 430, def: 195, hit: 112, eva: 18, crit: 18, critRes: 22, exp: 5800, sp: 4100, gold: 4300, faction: '魔門・天蓮宗', skills: [{ name: '天心蓮環・胖公印', mult: 1.4, effect: 'pierce' }, { name: '蓮華吸元功', mult: 1.35, effect: 'drain' }] },
                { id: 'shi_zhixuan', name: '【頭目】邪王・石之軒', lv: 48, hp: 10500, atk: 550, def: 245, hit: 118, eva: 26, crit: 24, critRes: 26, exp: 8800, sp: 6200, gold: 6500, faction: '魔門・花間派 & 補天閣', skills: [{ name: '不死印法・生死二氣', mult: 1.5, effect: 'drain' }, { name: '幻魔身法・百變魔指', mult: 1.45, effect: 'pierce' }] }
            ]
        },
        steppe: {
            id: 'steppe', era: 'datang', name: '塞外草原・突厥王庭', minLv: 48,
            desc: '一望無際的塞外大草原，突厥金狼軍與三大宗師之一的「武尊」畢玄坐鎮於此。',
            enemies: [
                { id: 'wolf_cavalry', name: '突厥金狼精騎', lv: 50, hp: 11500, atk: 580, def: 260, hit: 116, eva: 22, crit: 18, critRes: 22, exp: 9500, sp: 6800, gold: 7000, faction: '突厥金狼王帳', skills: [{ name: '金狼彎刀斬', mult: 1.3, effect: 'normal' }] },
                { id: 'keda_zhi', name: '狂沙刀・可達志', lv: 55, hp: 15000, atk: 700, def: 310, hit: 120, eva: 25, crit: 22, critRes: 25, exp: 13000, sp: 9200, gold: 9600, faction: '突厥武尊親傳', skills: [{ name: '大漠狂沙刀法', mult: 1.4, effect: 'pierce' }, { name: '旋風沙暴斬', mult: 1.25, effect: 'aoe' }] },
                { id: 'bi_xuan', name: '【宗師】武尊・畢玄', lv: 60, hp: 21000, atk: 880, def: 390, hit: 125, eva: 28, crit: 26, critRes: 30, exp: 19000, sp: 13500, gold: 14000, faction: '三大宗師・突厥武尊', skills: [{ name: '炎陽奇功・烈日焚天', mult: 1.55, effect: 'pierce' }, { name: '阿鼻地獄矛・荒漠焦土', mult: 1.35, effect: 'aoe' }] }
            ]
        },
        handan: {
            id: 'handan', era: 'xunqin', name: '桑林村・趙國邯鄲', minLv: 60,
            desc: '《尋秦記》時空起點，項少龍初降桑林村並進入邯鄲烏氏家，趙穆府劍客四處橫行。',
            enemies: [
                { id: 'zhao_bandit', name: '桑林村馬賊頭領', lv: 64, hp: 23000, atk: 940, def: 420, hit: 124, eva: 26, crit: 20, critRes: 26, exp: 21000, sp: 15000, gold: 15500, faction: '戰國・燕趙馬賊團', skills: [{ name: '胡服騎射重斬', mult: 1.35, effect: 'normal' }] },
                { id: 'lianjin', name: '左手神劍・連晉', lv: 70, hp: 30000, atk: 1120, def: 500, hit: 128, eva: 30, crit: 26, critRes: 28, exp: 28000, sp: 20000, gold: 21000, faction: '趙國・巨鹿侯趙穆府', skills: [{ name: '左手奪命快劍', mult: 1.45, effect: 'pierce' }, { name: '漫天劍影殺', mult: 1.3, effect: 'aoe' }] },
                { id: 'guangao', name: '【頭目】大劍師・管中邪', lv: 76, hp: 40000, atk: 1350, def: 600, hit: 132, eva: 30, crit: 28, critRes: 32, exp: 38000, sp: 27000, gold: 28000, faction: '趙國第一劍師', skills: [{ name: '趙國霸劍・無堅不摧', mult: 1.5, effect: 'pierce' }, { name: '血戰狂歌斬', mult: 1.45, effect: 'drain' }] }
            ]
        },
        daliang: {
            id: 'daliang', era: 'xunqin', name: '魏國大梁・信陵君府', minLv: 76,
            desc: '戰國四大公子信陵君無忌的封地，齊國稷下劍聖曹秋道門人亦在此活動。',
            enemies: [
                { id: 'wei_assassin', name: '信陵府黑衣死士', lv: 80, hp: 45000, atk: 1480, def: 660, hit: 134, eva: 32, crit: 25, critRes: 30, exp: 43000, sp: 31000, gold: 32000, faction: '魏國・信陵君門客', skills: [{ name: '大梁刺客劍', mult: 1.35, effect: 'pierce' }] },
                { id: 'sifu', name: '灰鬍客・穡夫', lv: 86, hp: 58000, atk: 1750, def: 780, hit: 138, eva: 34, crit: 28, critRes: 34, exp: 56000, sp: 40000, gold: 42000, faction: '戰國刺客聯盟', skills: [{ name: '灰鬍詭劍術', mult: 1.4, effect: 'pierce' }, { name: '陰風噬魂斬', mult: 1.4, effect: 'drain' }] },
                { id: 'cao_qiudao', name: '【宗師】稷下劍聖・曹秋道', lv: 92, hp: 78000, atk: 2150, def: 950, hit: 145, eva: 38, crit: 32, critRes: 38, exp: 76000, sp: 54000, gold: 56000, faction: '齊國・稷下學宮劍聖', skills: [{ name: '稷下聖劍・百步飛劍', mult: 1.55, effect: 'pierce' }, { name: '劍聖無雙・萬劍歸宗', mult: 1.35, effect: 'aoe' }] }
            ]
        },
        xianyang: {
            id: 'xianyang', era: 'xunqin', name: '秦國咸陽・呂不韋府', minLv: 92,
            desc: '大秦帝國都城咸陽，相國呂不韋與長信侯嫪毐蠢蠢欲動，大秦名將鎮守關中。',
            enemies: [
                { id: 'qin_guard', name: '咸陽黑甲鐵衛', lv: 96, hp: 88000, atk: 2350, def: 1080, hit: 142, eva: 32, crit: 26, critRes: 40, exp: 86000, sp: 62000, gold: 64000, faction: '大秦・咸陽禁衛軍', skills: [{ name: '大秦青銅長戈斬', mult: 1.35, effect: 'pierce' }] },
                { id: 'lao_ai', name: '長信侯・嫪毐', lv: 103, hp: 115000, atk: 2800, def: 1260, hit: 148, eva: 36, crit: 30, critRes: 40, exp: 112000, sp: 80000, gold: 84000, faction: '秦國・長信侯逆黨', skills: [{ name: '狂輪霸劍斬', mult: 1.45, effect: 'pierce' }, { name: '妖道采補邪功', mult: 1.4, effect: 'drain' }] },
                { id: 'ying_zheng_guard', name: '【統帥】大秦武安君・李牧殘影', lv: 110, hp: 155000, atk: 3400, def: 1520, hit: 155, eva: 40, crit: 35, critRes: 45, exp: 150000, sp: 110000, gold: 115000, faction: '戰國四大名將之首', skills: [{ name: '武安兵法・千軍破甲斬', mult: 1.6, effect: 'pierce' }, { name: '鐵騎連環陣・全軍突擊', mult: 1.4, effect: 'aoe' }] }
            ]
        },
        bianhuang_town: {
            id: 'bianhuang_town', era: 'bianhuang', name: '邊荒集・鐘樓廣場', minLv: 110,
            desc: '《邊荒傳說》核心舞台，南北政權緩衝地帶，荒人、兩湖幫與五胡馬賊齊聚爭奪邊荒第一名號。',
            enemies: [
                { id: 'huang_raider', name: '五胡匈奴劫掠騎', lv: 115, hp: 175000, atk: 3700, def: 1680, hit: 152, eva: 38, crit: 28, critRes: 42, exp: 168000, sp: 120000, gold: 125000, faction: '北方五胡聯軍', skills: [{ name: '狼牙重錘砸擊', mult: 1.4, effect: 'normal' }] },
                { id: 'helian_bobo', name: '大夏魔魁・赫連勃勃', lv: 122, hp: 225000, atk: 4400, def: 2000, hit: 158, eva: 42, crit: 34, critRes: 45, exp: 215000, sp: 155000, gold: 160000, faction: '匈奴鐵弗部之主', skills: [{ name: '龍昇霸刀・裂地斬', mult: 1.5, effect: 'pierce' }, { name: '匈奴狂血咒', mult: 1.4, effect: 'drain' }] },
                { id: 'murong_chui', name: '【霸主】鮮卑戰神・慕容垂', lv: 130, hp: 300000, atk: 5300, def: 2450, hit: 165, eva: 45, crit: 38, critRes: 50, exp: 290000, sp: 210000, gold: 220000, faction: '後燕開國皇帝・鮮卑第一高手', skills: [{ name: '鮮卑霸王槍・貫日', mult: 1.6, effect: 'pierce' }, { name: '燕皇霸氣・八方風雨', mult: 1.4, effect: 'aoe' }] }
            ]
        },
        jiankang_city: {
            id: 'jiankang_city', era: 'bianhuang', name: '東晉建康・秦淮河畔', minLv: 130,
            desc: '江南東晉帝都建康，謝家北府兵與桓玄楚軍明爭暗鬥，天師道妖人亦潛伏於秦淮水榭。',
            enemies: [
                { id: 'tianshi_zealot', name: '天師道五斗米護法', lv: 135, hp: 340000, atk: 5800, def: 2680, hit: 164, eva: 44, crit: 32, critRes: 48, exp: 330000, sp: 240000, gold: 250000, faction: '五斗米道・盧循水軍', skills: [{ name: '五雷符法掌', mult: 1.4, effect: 'pierce' }] },
                { id: 'huan_xuan', name: '南楚霸主・桓玄', lv: 142, hp: 430000, atk: 6800, def: 3150, hit: 170, eva: 46, crit: 36, critRes: 52, exp: 420000, sp: 300000, gold: 315000, faction: '荊州譙國桓氏', skills: [{ name: '驚天劍法・斷江流', mult: 1.5, effect: 'pierce' }, { name: '楚王奪魄勁', mult: 1.45, effect: 'drain' }] },
                { id: 'sun_en', name: '【天師】黃天無極・孫恩', lv: 155, hp: 580000, atk: 8400, def: 3900, hit: 178, eva: 52, crit: 42, critRes: 58, exp: 560000, sp: 410000, gold: 430000, faction: '天師道魁首・破碎虛空第一人', skills: [{ name: '黃天大法・天譴雷火', mult: 1.65, effect: 'pierce' }, { name: '萬劫不復・黃天浩劫', mult: 1.45, effect: 'aoe' }] }
            ]
        },
        dongting: {
            id: 'dongting', era: 'fuyu', name: '洞庭湖・怒蛟島', minLv: 155,
            desc: '《覆雨翻雲》核心水道，八百里洞庭波濤洶湧，怒蛟幫與黑榜高手在此激戰。',
            enemies: [
                { id: 'rebel_pirate', name: '怒蛟幫叛逆精銳', lv: 160, hp: 650000, atk: 9200, def: 4300, hit: 176, eva: 50, crit: 36, critRes: 55, exp: 640000, sp: 460000, gold: 480000, faction: '怒蛟幫・上官鷹叛黨', skills: [{ name: '分水刺・破浪式', mult: 1.4, effect: 'pierce' }] },
                { id: 'qian_luo', name: '黑榜山城主・乾羅', lv: 168, hp: 820000, atk: 10800, def: 5000, hit: 182, eva: 54, crit: 40, critRes: 58, exp: 800000, sp: 580000, gold: 600000, faction: '黑榜第一名宿・乾羅山城', skills: [{ name: '黑榜絕殺・乾羅鬼爪', mult: 1.5, effect: 'drain' }] },
                { id: 'li_ruohai', name: '【黑榜】血手・厲若海', lv: 178, hp: 1100000, atk: 13200, def: 6100, hit: 188, eva: 56, crit: 45, critRes: 62, exp: 1080000, sp: 780000, gold: 810000, faction: '燎原百擊・邪異槍皇', skills: [{ name: '燎原槍法・百擊無悔', mult: 1.6, effect: 'pierce' }, { name: '紅日燎原・槍芒焚天', mult: 1.4, effect: 'aoe' }] }
            ]
        },
        lanjiang: {
            id: 'lanjiang', era: 'fuyu', name: '攔江島・魔師宮決戰', minLv: 178,
            desc: '長江險要攔江島，八月十五月圓之夜，覆雨劍浪翻雲與魔師龐斑決一死戰之地！',
            enemies: [
                { id: 'li_chimei', name: '天魅凝陰・里赤媚', lv: 184, hp: 1300000, atk: 14800, def: 6900, hit: 190, eva: 62, crit: 42, critRes: 64, exp: 1280000, sp: 920000, gold: 950000, faction: '蒙古八大高手・天魅宗', skills: [{ name: '天魅凝陰・鬼影爪', mult: 1.5, effect: 'pierce' }, { name: '魅影吸星指', mult: 1.45, effect: 'drain' }] },
                { id: 'lang_boss', name: '【劍神】覆雨劍・浪翻雲', lv: 192, hp: 1750000, atk: 18200, def: 8500, hit: 198, eva: 65, crit: 48, critRes: 68, exp: 1700000, sp: 1250000, gold: 1300000, faction: '大明・洞庭怒蛟幫劍神', skills: [{ name: '覆雨劍法・極情於劍', mult: 1.65, effect: 'pierce' }, { name: '洞庭驚濤・漫天劍雨', mult: 1.45, effect: 'aoe' }] },
                { id: 'pang_boss', name: '【魔師】道心種魔・龐斑', lv: 200, hp: 2300000, atk: 22500, def: 10500, hit: 205, eva: 68, crit: 52, critRes: 72, exp: 2250000, sp: 1650000, gold: 1750000, faction: '域外無上・魔師宮宗主', skills: [{ name: '道心種魔・魔仙雙劫', mult: 1.7, effect: 'drain' }, { name: '天魔解體・磁場崩滅', mult: 1.48, effect: 'aoe' }] }
            ]
        },
        shendu_luoyang: {
            id: 'shendu_luoyang', era: 'riyue', name: '神都洛陽・明堂萬象神宮', minLv: 200,
            desc: '《日月當空》女帝武曌登基之神都，胖公褚幫、大江聯與魔門六道在明堂展開巔峰博弈。',
            enemies: [
                { id: 'neiwei_guard', name: '神都內衛大統領', lv: 208, hp: 2700000, atk: 25500, def: 12000, hit: 208, eva: 66, crit: 45, critRes: 72, exp: 2650000, sp: 1950000, gold: 2000000, faction: '武周・鳳閣內衛', skills: [{ name: '御前飲血刀', mult: 1.45, effect: 'pierce' }] },
                { id: 'fa_ming', name: '大周國師・法明和尚', lv: 218, hp: 3500000, atk: 31000, def: 14800, hit: 215, eva: 70, crit: 48, critRes: 78, exp: 3450000, sp: 2500000, gold: 2600000, faction: '白馬寺・魔佛一脈', skills: [{ name: '魔佛金身・大日如來印', mult: 1.55, effect: 'pierce' }, { name: '梵音奪魄', mult: 1.45, effect: 'drain' }] },
                { id: 'wu_zhao', name: '【女帝】日月當空・武曌', lv: 230, hp: 4800000, atk: 39500, def: 18500, hit: 225, eva: 75, crit: 55, critRes: 85, exp: 4700000, sp: 3400000, gold: 3600000, faction: '大周聖神皇帝・天魔策大成', skills: [{ name: '天魔皇氣・萬邦來朝', mult: 1.7, effect: 'pierce' }, { name: '日月當空・君臨天下', mult: 1.5, effect: 'aoe' }] }
            ]
        },
        secret_realm_evil: {
            id: 'secret_realm_evil', era: 'riyue', name: '巴蜀秘境・魔帝向雨田遺塚', minLv: 230,
            desc: '《盛唐三部曲》與魔門最初源頭，活過數百載的秘人向雨田曾在此參悟《道心種魔大法》。',
            enemies: [
                { id: 'shadow_guardian', name: '魔帝陵・不死血衛', lv: 236, hp: 5600000, atk: 44000, def: 21000, hit: 228, eva: 74, crit: 50, critRes: 82, exp: 5500000, sp: 4000000, gold: 4200000, faction: '上古魔門守陵人', skills: [{ name: '血影搜魂爪', mult: 1.5, effect: 'drain' }] },
                { id: 'duanmu_ling', name: '劍罡同流・端木菱', lv: 243, hp: 7200000, atk: 53000, def: 25500, hit: 235, eva: 78, crit: 56, critRes: 88, exp: 7000000, sp: 5100000, gold: 5400000, faction: '小三合・無上劍道', skills: [{ name: '劍罡同流・破虛一劍', mult: 1.65, effect: 'pierce' }] },
                { id: 'xiang_yutian', name: '【邪帝】秘人・向雨田', lv: 250, hp: 9800000, atk: 66000, def: 32000, hit: 245, eva: 82, crit: 60, critRes: 95, exp: 9500000, sp: 7000000, gold: 7500000, faction: '魔門初代邪帝・破碎虛空', skills: [{ name: '初代魔種・吞天噬地', mult: 1.75, effect: 'drain' }, { name: '邪帝舍利・元氣大爆炸', mult: 1.55, effect: 'aoe' }] }
            ]
        },
        palace: {
            id: 'palace', era: 'posui', name: '驚雁宮・戰神殿深處', minLv: 250,
            desc: '《破碎虛空》核心秘境，四大奇書之首《戰神圖錄》四十九幅浮雕與太古魔龍鎮守之地。',
            enemies: [
                { id: 'war_dragon', name: '戰神殿・護殿太古魔龍', lv: 258, hp: 12000000, atk: 78000, def: 38000, hit: 250, eva: 80, crit: 58, critRes: 98, exp: 11800000, sp: 8600000, gold: 9000000, faction: '上古天道異獸', skills: [{ name: '太古魔龍裂空爪', mult: 1.6, effect: 'pierce' }, { name: '戰神殿・滅世龍息', mult: 1.48, effect: 'aoe' }] },
                { id: 'meng_chixing', name: '魔宗無上・蒙赤行', lv: 266, hp: 16000000, atk: 95000, def: 46000, hit: 260, eva: 85, crit: 62, critRes: 105, exp: 15500000, sp: 11500000, gold: 12000000, faction: '天道・域外大魔宗', skills: [{ name: '無上魔宗・凝真九變', mult: 1.68, effect: 'drain' }, { name: '精神風暴・天地同壽', mult: 1.5, effect: 'aoe' }] },
                { id: 'chuan_ying', name: '【武神】破碎虛空・傳鷹', lv: 275, hp: 22000000, atk: 120000, def: 58000, hit: 270, eva: 90, crit: 68, critRes: 115, exp: 21500000, sp: 16000000, gold: 17000000, faction: '驚雁宮・破碎虛空武神', skills: [{ name: '鷹刀合璧・戰神圖錄極意', mult: 1.78, effect: 'pierce' }, { name: '破碎虛空・天道滅世斬', mult: 1.55, effect: 'aoe' }] }
            ]
        },
        tian_dao_void: {
            id: 'tian_dao_void', era: 'posui', name: '超維星門・天道破碎之境 (終極 Lv.300)', minLv: 275,
            desc: '跨越《星際浪子》與《破碎虛空》的宇宙終極盡頭，廣成子、令東來與黑洞反物質主宰在此印證最高天道！',
            enemies: [
                { id: 'ling_boss', name: '【神遊】十絕無上・令東來', lv: 284, hp: 32000000, atk: 155000, def: 75000, hit: 280, eva: 95, crit: 70, critRes: 125, exp: 31000000, sp: 23000000, gold: 25000000, faction: '十絕關・神遊物外宗師', skills: [{ name: '無上玄功・神遊太虛', mult: 1.75, effect: 'pierce' }, { name: '十絕劍氣・萬象俱滅', mult: 1.55, effect: 'aoe' }] },
                { id: 'guang_chengzi', name: '【仙祖】長生戰神・廣成子化體', lv: 292, hp: 46000000, atk: 205000, def: 100000, hit: 292, eva: 100, crit: 75, critRes: 138, exp: 45000000, sp: 34000000, gold: 36000000, faction: '戰神圖錄 & 長生訣創始者', skills: [{ name: '戰神圖錄・四十九式歸一', mult: 1.82, effect: 'drain' }, { name: '長生天道・宇宙洪荒', mult: 1.6, effect: 'aoe' }] },
                { id: 'cosmic_overlord', name: '【Lv.300 終極】黑洞反物質・時空主宰', lv: 300, hp: 68000000, atk: 280000, def: 140000, hit: 310, eva: 110, crit: 80, critRes: 155, exp: 70000000, sp: 52000000, gold: 55000000, faction: '星際浪子・超維宇宙意志', skills: [{ name: '反物質坍縮・維度抹殺', mult: 1.9, effect: 'pierce' }, { name: '大宇宙崩滅・時空歸零', mult: 1.68, effect: 'aoe' }] }
            ]
        }
    };
})();