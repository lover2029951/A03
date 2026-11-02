// js/gambleSystem.js  (v1)
// 🎰 時空賭坊：黑市賭博系統
//
//   ⭐ 8 種博弈遊戲，勝率固定 30%（拆為「普通勝 + 大獎」兩層）
//   ⭐ 彩池累積機制：每筆下注抽 3% 入池，大獎可奪池 40%
//   ⭐ 統計紀錄存於 rootState（隨存檔保存）
//   ⭐ 獨立檔案，不與黑市渲染邏輯耦合
window.HY = window.HY || {};

(function () {

    // ═══════════════════════════════════════════════════════════
    //  ① 遊戲配置
    //     baseWin + jackpotWin 恆等於 0.30（固定 30% 勝率）
    // ═══════════════════════════════════════════════════════════
    var GAMES = [
        {
            id: 'sicbo',
            name: '骰寶大小',
            icon: '🎲',
            theme: '#f59e0b',
            desc: '三顆骰子比點數總和。猜中「大」或「小」即可獲勝。',
            rule: '4~10 = 小 ｜ 11~17 = 大 ｜ 三同號通殺（僅大獎可破）',
            betSteps: [100, 1000, 10000],
            betMin: 100,
            baseWin: 0.24,
            jackpotWin: 0.06,
            basePayout: 2.5,
            jackpotPayout: 5.0,
            options: [
                { id: 'big',   label: '大', icon: '🔴' },
                { id: 'small', label: '小', icon: '🔵' }
            ]
        },
        {
            id: 'fishprawn',
            name: '魚蝦蟹',
            icon: '🀄',
            theme: '#10b981',
            desc: '六種圖案任選其一。三顆骰擲出你的圖案即獲勝。',
            rule: '出現 1~2 次為普通勝 ｜ 出現 3 次為大獎',
            betSteps: [100, 1000, 10000],
            betMin: 100,
            baseWin: 0.25,
            jackpotWin: 0.05,
            basePayout: 2.6,
            jackpotPayout: 5.5,
            options: [
                { id: 'fish',    label: '魚',   icon: '🐟' },
                { id: 'shrimp',  label: '蝦',   icon: '🦐' },
                { id: 'crab',    label: '蟹',   icon: '🦀' },
                { id: 'gourd',   label: '葫蘆', icon: '🍐' },
                { id: 'coin',    label: '銅錢', icon: '🪙' },
                { id: 'rooster', label: '雞',   icon: '🐔' }
            ]
        },
        {
            id: 'rps',
            name: '江湖猜拳',
            icon: '⚔️',
            theme: '#38bdf8',
            desc: '與江湖高手過招猜拳。贏者為勝，平手退還本金。',
            rule: '石頭剋剪刀 ｜ 剪刀剋布 ｜ 布剋石頭 ｜ 平手退回',
            betSteps: [100, 1000, 10000],
            betMin: 100,
            baseWin: 0.27,
            jackpotWin: 0.03,
            basePayout: 2.8,
            jackpotPayout: 6.0,
            options: [
                { id: 'rock',     label: '石頭', icon: '✊' },
                { id: 'paper',    label: '布',   icon: '✋' },
                { id: 'scissors', label: '剪刀', icon: '✌️' }
            ]
        },
        {
            id: 'wheel',
            name: '幸運輪盤',
            icon: '🎡',
            theme: '#a78bfa',
            desc: '八格輪盤任選一格。指針停在你選的格子即獲勝。',
            rule: '共 8 格，命中即為普通勝 ｜ 天選之格為大獎',
            betSteps: [100, 1000, 10000],
            betMin: 100,
            baseWin: 0.28,
            jackpotWin: 0.02,
            basePayout: 2.4,
            jackpotPayout: 8.0,
            options: [
                { id: 's1', label: '1', icon: '①' },
                { id: 's2', label: '2', icon: '②' },
                { id: 's3', label: '3', icon: '③' },
                { id: 's4', label: '4', icon: '④' },
                { id: 's5', label: '5', icon: '⑤' },
                { id: 's6', label: '6', icon: '⑥' },
                { id: 's7', label: '7', icon: '⑦' },
                { id: 's8', label: '8', icon: '⑧' }
            ]
        },
        {
            id: 'jade',
            name: '賭石開玉',
            icon: '💎',
            theme: '#34d399',
            desc: '挑一塊原石剖開。若有玉即獲勝，全憑眼力與運氣。',
            rule: '剖出玉為普通勝 ｜ 剖出帝王綠為大獎 ｜ 廢石則全損',
            betSteps: [500, 5000, 50000],
            betMin: 500,
            baseWin: 0.27,
            jackpotWin: 0.03,
            basePayout: 2.7,
            jackpotPayout: 7.0,
            options: [
                { id: 'a', label: '甲石', icon: '🪨' },
                { id: 'b', label: '乙石', icon: '🪨' },
                { id: 'c', label: '丙石', icon: '🪨' },
                { id: 'd', label: '丁石', icon: '🪨' },
                { id: 'e', label: '戊石', icon: '🪨' }
            ]
        },
        {
            id: 'rift',
            name: '時空裂隙',
            icon: '🌀',
            theme: '#c084fc',
            desc: '跳入一道時空裂隙。平安帶回寶藏即獲勝，迷失則全損。',
            rule: '安然返回為普通勝 ｜ 尋獲上古寶藏為大獎',
            betSteps: [1000, 10000, 100000],
            betMin: 1000,
            baseWin: 0.25,
            jackpotWin: 0.05,
            basePayout: 3.0,
            jackpotPayout: 4.5,
            options: [
                { id: 'r1', label: '裂隙一', icon: '①' },
                { id: 'r2', label: '裂隙二', icon: '②' },
                { id: 'r3', label: '裂隙三', icon: '③' },
                { id: 'r4', label: '裂隙四', icon: '④' },
                { id: 'r5', label: '裂隙五', icon: '⑤' },
                { id: 'r6', label: '裂隙六', icon: '⑥' }
            ]
        },
        {
            id: 'dragon',
            name: '龍門比點',
            icon: '🐉',
            theme: '#fbbf24',
            desc: '押注龍門或虎門，各抽兩張牌比點數總和，大者勝。',
            rule: '點數總和較大者勝 ｜ 天門同點為大獎',
            betSteps: [100, 1000, 10000],
            betMin: 100,
            baseWin: 0.27,
            jackpotWin: 0.03,
            basePayout: 2.6,
            jackpotPayout: 4.5,
            options: [
                { id: 'dragon', label: '龍門', icon: '🐉' },
                { id: 'tiger',  label: '虎門', icon: '🐅' }
            ]
        },
        {
            id: 'poker',
            name: '梭哈對決',
            icon: '🃏',
            theme: '#f87171',
            desc: '與黑市莊家各發五張牌。牌型較大者獲勝。',
            rule: '比牌型大小 ｜ 同花順、四條為大獎',
            betSteps: [500, 5000, 50000],
            betMin: 500,
            baseWin: 0.26,
            jackpotWin: 0.04,
            basePayout: 3.0,
            jackpotPayout: 5.0,
            options: [
                { id: 'allin', label: '梭哈', icon: '🔥' }
            ]
        }
    ];

    var GAME_MAP = {};
    GAMES.forEach(function (g) { GAME_MAP[g.id] = g; });

    // ═══════════════════════════════════════════════════════════
    //  ② 工具
    // ═══════════════════════════════════════════════════════════
    function fmt(n) { return Math.floor(n || 0).toLocaleString(); }
    function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function dieBox(face, color) {
        return '<span style="display:inline-flex;width:52px;height:52px;margin:0 5px;' +
            'background:linear-gradient(145deg,#ffffff,#dbe3ec);color:#111;' +
            'border-radius:9px;align-items:center;justify-content:center;' +
            'font-size:1.6rem;font-weight:bold;' +
            'box-shadow:0 3px 8px rgba(0,0,0,0.55),inset 0 0 0 2px ' + (color || '#94a3b8') + ';">' +
            String(face) + '</span>';
    }

    function symBox(icon, color) {
        return '<span style="display:inline-flex;width:52px;height:52px;margin:0 5px;' +
            'background:linear-gradient(145deg,#1f2937,#111827);' +
            'border-radius:9px;align-items:center;justify-content:center;' +
            'font-size:1.7rem;' +
            'box-shadow:0 3px 8px rgba(0,0,0,0.55),inset 0 0 0 2px ' + (color || '#475569') + ';">' +
            icon + '</span>';
    }

    // ═══════════════════════════════════════════════════════════
    //  ③ 各遊戲的結果產生 + 渲染
    //     每個 renderer 回傳 HTML 字串（只包含「遊戲桌面」部分）
    // ═══════════════════════════════════════════════════════════
    var RENDERERS = {

        // ── 骰寶大小 ──
        sicbo: function (win, jackpot, pickId) {
            var d1, d2, d3, sum, isTriple = false;

            if (jackpot) {
                var n = randInt(2, 6);
                d1 = d2 = d3 = n;
                isTriple = true;
            } else if (win) {
                var wantBig = (pickId === 'big');
                do {
                    d1 = randInt(1, 6); d2 = randInt(1, 6); d3 = randInt(1, 6);
                    sum = d1 + d2 + d3;
                    isTriple = (d1 === d2 && d2 === d3);
                } while (isTriple || (wantBig ? (sum < 11) : (sum > 10)));
            } else {
                // 輸：擲出相反區間，或三同號通殺
                if (Math.random() < 0.35) {
                    var n2 = randInt(1, 6);
                    d1 = d2 = d3 = n2;
                    isTriple = true;
                } else {
                    var wantSmall = (pickId === 'big'); // 押大就出小
                    do {
                        d1 = randInt(1, 6); d2 = randInt(1, 6); d3 = randInt(1, 6);
                        sum = d1 + d2 + d3;
                        isTriple = (d1 === d2 && d2 === d3);
                    } while (isTriple || (wantSmall ? (sum < 4 || sum > 10) : (sum < 11 || sum > 17)));
                }
            }
            sum = d1 + d2 + d3;
            isTriple = (d1 === d2 && d2 === d3);
            var color = isTriple ? '#f43f5e' : '#fbbf24';
            var label = isTriple ? '三同號（通殺）' : (sum <= 10 ? '小' : '大');

            return '<div style="text-align:center;padding:14px 0;">' +
                    dieBox(d1, color) + dieBox(d2, color) + dieBox(d3, color) +
                '</div>' +
                '<div style="text-align:center;font-size:0.92rem;color:#cbd5e1;">' +
                    '點數總和 <b style="color:' + color + ';font-size:1.35rem;">' + sum + '</b>' +
                    ' ｜ <b style="color:' + color + ';">' + label + '</b>' +
                '</div>';
        },

        // ── 魚蝦蟹 ──
        fishprawn: function (win, jackpot, pickId) {
            var g = GAME_MAP.fishprawn;
            var chosen = g.options.filter(function (o) { return o.id === pickId; })[0] || g.options[0];
            var rolls = [];

            if (jackpot) {
                rolls = [chosen, chosen, chosen];
            } else if (win) {
                // 出現 1~2 次
                var count = randInt(1, 2);
                var others = g.options.filter(function (o) { return o.id !== pickId; });
                for (var i = 0; i < count; i++) rolls.push(chosen);
                while (rolls.length < 3) {
                    var o = pickOne(others);
                    if (rolls.indexOf(o) === -1) rolls.push(o);
                    else if (rolls.length === 2) rolls.push(o); // 允許重複以填滿
                }
            } else {
                // 不出現
                var others2 = g.options.filter(function (o) { return o.id !== pickId; });
                while (rolls.length < 3) {
                    var o2 = pickOne(others2);
                    if (rolls.filter(function (x) { return x.id === o2.id; }).length < 2) rolls.push(o2);
                    else if (rolls.length === 2) rolls.push(pickOne(others2));
                }
            }
            // 洗牌
            rolls.sort(function () { return Math.random() - 0.5; });

            var count2 = rolls.filter(function (x) { return x.id === pickId; }).length;
            var color = jackpot ? '#f43f5e' : (count2 > 0 ? '#10b981' : '#64748b');

            var diceHtml = rolls.map(function (r) {
                return symBox(r.icon, r.id === pickId ? color : '#475569');
            }).join('');

            return '<div style="text-align:center;padding:14px 0;">' + diceHtml + '</div>' +
                '<div style="text-align:center;font-size:0.92rem;color:#cbd5e1;">' +
                    '你押 <b style="color:#fbbf24;">' + chosen.icon + ' ' + chosen.label + '</b>' +
                    ' ｜ 出現 <b style="color:' + color + ';font-size:1.15rem;">' + count2 + '</b> 次' +
                '</div>';
        },

        // ── 江湖猜拳 ──
        rps: function (win, jackpot, pickId) {
            var map = { rock: '✊', paper: '✋', scissors: '✌️' };
            var beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
            var loses = { rock: 'paper', paper: 'scissors', scissors: 'rock' };
            var nameMap = { rock: '石頭', paper: '布', scissors: '剪刀' };

            var npc;
            if (jackpot) {
                npc = loses[pickId];      // 玩家贏
            } else if (win) {
                npc = loses[pickId];
            } else {
                // 輸或平手
                npc = (Math.random() < 0.75) ? beats[pickId] : pickId;
            }

            var isDraw = (npc === pickId);
            var isWin = (beats[pickId] === npc);

            var handBox = function (icon, label, active, color) {
                return '<div style="text-align:center;flex:1;">' +
                    '<div style="font-size:3.2rem;line-height:1.1;">' + icon + '</div>' +
                    '<div style="font-size:0.82rem;margin-top:4px;color:' + (active ? color : '#94a3b8') + ';' +
                        (active ? 'font-weight:bold;' : '') + '">' + label + '</div>' +
                '</div>';
            };

            var resultLabel = isDraw ? '平手（退回本金）' : (isWin ? '你贏了' : '你輸了');
            var resultColor = isDraw ? '#94a3b8' : (isWin ? '#4ade80' : '#f87171');

            return '<div style="display:flex;align-items:center;gap:10px;padding:14px 10px;">' +
                    handBox(map[pickId], '你（' + nameMap[pickId] + '）', isWin || isDraw, '#4ade80') +
                    '<div style="font-size:1.6rem;color:#64748b;font-weight:bold;">VS</div>' +
                    handBox(map[npc], '對手（' + nameMap[npc] + '）', !isWin, '#f87171') +
                '</div>' +
                '<div style="text-align:center;font-size:1rem;font-weight:bold;color:' + resultColor + ';">' +
                    resultLabel +
                '</div>';
        },

        // ── 幸運輪盤 ──
        wheel: function (win, jackpot, pickId) {
            var landedId;
            if (win) {
                landedId = pickId;
            } else {
                var others = GAME_MAP.wheel.options.filter(function (o) { return o.id !== pickId; });
                landedId = pickOne(others).id;
            }

            var segs = GAME_MAP.wheel.options.map(function (o) {
                var isPick = (o.id === pickId);
                var isLand = (o.id === landedId);
                var bg, bd, fg;
                if (isLand && isPick)      { bg = 'rgba(74,222,128,0.25)'; bd = '#4ade80'; fg = '#4ade80'; }
                else if (isLand)           { bg = 'rgba(248,113,113,0.25)'; bd = '#f87171'; fg = '#f87171'; }
                else if (isPick)           { bg = 'rgba(167,139,250,0.18)'; bd = '#a78bfa'; fg = '#a78bfa'; }
                else                       { bg = '#18202c'; bd = '#334155'; fg = '#94a3b8'; }

                return '<div style="padding:9px 0;text-align:center;border:2px solid ' + bd + ';' +
                    'background:' + bg + ';color:' + fg + ';border-radius:6px;font-weight:bold;font-size:0.85rem;">' +
                    o.icon + ' ' + o.label +
                    (isLand ? ' <span style="font-size:0.7rem;">◀</span>' : '') +
                '</div>';
            }).join('');

            return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:14px 0;">' +
                    segs +
                '</div>' +
                '<div style="text-align:center;font-size:0.9rem;color:#cbd5e1;">' +
                    '指針停在 <b style="color:#fbbf24;font-size:1.1rem;">' + landedId.replace('s', '') + '</b>' +
                    ' ｜ 你押 <b>' + pickId.replace('s', '') + '</b>' +
                '</div>';
        },

        // ── 賭石開玉 ──
        jade: function (win, jackpot, pickId) {
            var g = GAME_MAP.jade;
            var blocks = g.options.map(function (o) {
                var isPick = (o.id === pickId);
                var opened = isPick;
                var inner, color, label;

                if (!opened) {
                    inner = '🪨'; color = '#64748b'; label = '未開';
                } else if (jackpot) {
                    inner = '💚'; color = '#34d399'; label = '帝王綠！';
                } else if (win) {
                    inner = '🟢'; color = '#4ade80'; label = '有玉';
                } else {
                    inner = '⬛'; color = '#475569'; label = '廢石';
                }

                return '<div style="text-align:center;padding:10px 4px;border:2px solid ' +
                    (isPick ? color : '#334155') + ';border-radius:8px;background:' +
                    (isPick ? 'rgba(0,0,0,0.35)' : '#18202c') + ';transition:all 0.3s;">' +
                    '<div style="font-size:2.4rem;line-height:1.1;">' + inner + '</div>' +
                    '<div style="font-size:0.75rem;color:' + color + ';margin-top:3px;font-weight:bold;">' + o.label + '</div>' +
                    '<div style="font-size:0.7rem;color:#94a3b8;">' + label + '</div>' +
                '</div>';
            }).join('');

            return '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding:14px 0;">' +
                    blocks +
                '</div>';
        },

        // ── 時空裂隙 ──
        rift: function (win, jackpot, pickId) {
            var g = GAME_MAP.rift;
            var rifts = g.options.map(function (o) {
                var isPick = (o.id === pickId);
                var opened = isPick;
                var inner, color, label;

                if (!opened) { inner = '🌀'; color = '#64748b'; label = '未探'; }
                else if (jackpot) { inner = '🏆'; color = '#fbbf24'; label = '上古寶藏！'; }
                else if (win)     { inner = '💰'; color = '#4ade80'; label = '平安返回'; }
                else              { inner = '💀'; color = '#f87171'; label = '迷失虛空'; }

                return '<div style="text-align:center;padding:12px 4px;border:2px solid ' +
                    (isPick ? color : '#334155') + ';border-radius:8px;background:' +
                    (isPick ? 'rgba(0,0,0,0.35)' : '#18202c') + ';transition:all 0.3s;">' +
                    '<div style="font-size:2.2rem;line-height:1.1;">' + inner + '</div>' +
                    '<div style="font-size:0.74rem;color:' + color + ';margin-top:3px;font-weight:bold;">' + o.label + '</div>' +
                    '<div style="font-size:0.68rem;color:#94a3b8;">' + label + '</div>' +
                '</div>';
            }).join('');

            return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:14px 0;">' +
                    rifts +
                '</div>';
        },

        // ── 龍門比點 ──
        dragon: function (win, jackpot, pickId) {
            var suit = ['♠', '♥', '♦', '♣'];
            function drawPair() {
                var c1 = randInt(1, 13), c2 = randInt(1, 13);
                return {
                    c1: c1, c2: c2, sum: c1 + c2,
                    s1: pickOne(suit), s2: pickOne(suit)
                };
            }

            var mine, dealer;
            var isDragon = (pickId === 'dragon');
            var tie = jackpot;   // jackpot = 天門同點

            if (tie) {
                mine = drawPair();
                dealer = { c1: mine.c1, c2: mine.c2, sum: mine.sum, s1: pickOne(suit), s2: pickOne(suit) };
            } else if (win) {
                mine = drawPair();
                do { dealer = drawPair(); } while (dealer.sum >= mine.sum);
            } else {
                dealer = drawPair();
                do { mine = drawPair(); } while (mine.sum >= dealer.sum);
            }

            var cardHtml = function (c, s, color) {
                return '<div style="display:inline-block;width:46px;height:64px;margin:0 4px;' +
                    'background:#f8fafc;border-radius:5px;color:' +
                    (s === '♥' || s === '♦' ? '#dc2626' : '#111827') + ';' +
                    'text-align:center;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,0.5);' +
                    'border:2px solid ' + color + ';">' +
                    '<div style="font-size:0.9rem;">' + s + '</div>' +
                    '<div style="font-size:1.5rem;font-weight:bold;line-height:1;">' + c + '</div>' +
                '</div>';
            };

            return '<div style="padding:14px 0;">' +
                    '<div style="text-align:center;margin-bottom:12px;">' +
                        '<div style="font-size:0.8rem;color:#fbbf24;margin-bottom:4px;">🐉 龍門（你押 ' + (isDragon ? '龍' : '虎') + '）</div>' +
                        cardHtml(mine.c1, mine.s1, win ? '#4ade80' : '#475569') +
                        cardHtml(mine.c2, mine.s2, win ? '#4ade80' : '#475569') +
                        '<div style="font-size:0.85rem;color:#cbd5e1;margin-top:4px;">合計 <b style="color:#fbbf24;">' + mine.sum + '</b></div>' +
                    '</div>' +
                    '<div style="text-align:center;">' +
                        '<div style="font-size:0.8rem;color:#f87171;margin-bottom:4px;">🐅 虎門（莊家）</div>' +
                        cardHtml(dealer.c1, dealer.s1, !win ? '#f87171' : '#475569') +
                        cardHtml(dealer.c2, dealer.s2, !win ? '#f87171' : '#475569') +
                        '<div style="font-size:0.85rem;color:#cbd5e1;margin-top:4px;">合計 <b style="color:#fbbf24;">' + dealer.sum + '</b>' +
                            (tie ? ' <span style="color:#f43f5e;">（天門同點！）</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>';
        },

        // ── 梭哈對決 ──
        poker: function (win, jackpot) {
            var rankChars = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            var suitChars = ['♠', '♥', '♦', '♣'];
            var handNames = ['散牌', '一對', '兩對', '三條', '順子', '同花', '葫蘆', '四條', '同花順'];

            function deal() {
                var cards = [];
                var used = {};
                while (cards.length < 5) {
                    var r = randInt(1, 13);
                    var s = pickOne(suitChars);
                    var key = s + r;
                    if (used[key]) continue;
                    used[key] = true;
                    cards.push({ rank: r, suit: s });
                }
                cards.sort(function (a, b) { return b.rank - a.rank; });

                // 計算牌型（簡化版）
                var counts = {};
                cards.forEach(function (c) { counts[c.rank] = (counts[c.rank] || 0) + 1; });
                var groups = Object.keys(counts).map(function (k) { return counts[k]; }).sort(function (a, b) { return b - a; });
                var isFlush = cards.every(function (c) { return c.suit === cards[0].suit; });
                var isStraight = true;
                for (var i = 1; i < 5; i++) if (cards[i].rank !== cards[i - 1].rank - 1) isStraight = false;

                var cat = 0;
                if (isFlush && isStraight) cat = 8;
                else if (groups[0] === 4) cat = 7;
                else if (groups[0] === 3 && groups[1] === 2) cat = 6;
                else if (isFlush) cat = 5;
                else if (isStraight) cat = 4;
                else if (groups[0] === 3) cat = 3;
                else if (groups[0] === 2 && groups[1] === 2) cat = 2;
                else if (groups[0] === 2) cat = 1;

                var score = cat * 1000000 + cards.reduce(function (a, c) { return a * 15 + c.rank; }, 0);
                return { cards: cards, cat: cat, name: handNames[cat], score: score };
            }

            var me, dealer;
            if (jackpot) {
                dealer = deal();
                do { me = deal(); } while (me.score < 8 * 1000000 || me.score <= dealer.score);
            } else if (win) {
                dealer = deal();
                do { me = deal(); } while (me.score <= dealer.score);
            } else {
                me = deal();
                do { dealer = deal(); } while (dealer.score <= me.score);
            }

            var cardHtml = function (c, highlight) {
                var isRed = (c.suit === '♥' || c.suit === '♦');
                return '<div style="display:inline-block;width:44px;height:62px;margin:0 3px;' +
                    'background:' + (highlight ? '#f0fdf4' : '#f8fafc') + ';border-radius:5px;' +
                    'color:' + (isRed ? '#dc2626' : '#111827') + ';text-align:center;padding:3px;' +
                    'box-shadow:0 2px 5px rgba(0,0,0,0.5);' +
                    'border:2px solid ' + (highlight ? '#4ade80' : '#475569') + ';">' +
                    '<div style="font-size:0.85rem;">' + c.suit + '</div>' +
                    '<div style="font-size:1.35rem;font-weight:bold;line-height:1;">' + rankChars[c.rank] + '</div>' +
                '</div>';
            };

            var meHtml = me.cards.map(function (c) { return cardHtml(c, win); }).join('');
            var dealerHtml = dealer.cards.map(function (c) { return cardHtml(c, !win); }).join('');

            return '<div style="padding:14px 0;">' +
                    '<div style="text-align:center;margin-bottom:12px;">' +
                        '<div style="font-size:0.8rem;color:#4ade80;margin-bottom:4px;">你 ｜ <b>' + me.name + '</b></div>' +
                        meHtml +
                    '</div>' +
                    '<div style="text-align:center;">' +
                        '<div style="font-size:0.8rem;color:#f87171;margin-bottom:4px;">莊家 ｜ <b>' + dealer.name + '</b></div>' +
                        dealerHtml +
                    '</div>' +
                '</div>';
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  ④ 主系統
    // ═══════════════════════════════════════════════════════════
    class GambleSystem {
        constructor(app) {
            this.app = app;
            this.currentGameId = null;
            this.currentPick = null;
            this.currentBet = 0;
            this.phase = 'pick';          // 'pick' | 'animating' | 'result'
            this.lastOutcome = null;
            this.modalEl = null;
            this.modalBodyEl = null;

            this.ensureState();
            this.injectStyles();
            this.hookMarketRender();
            this.buildModal();

            // 首次注入（若黑市已渲染）
            var self = this;
            setTimeout(function () {
                self.ensureDOM();
                self.renderGambleSection();
            }, 100);
        }

        // ── 狀態 ──
        ensureState() {
            var root = this.app.charSys.rootState;
            if (!root.gambleStats) {
                root.gambleStats = {
                    played: 0,
                    won: 0,
                    lost: 0,
                    totalBet: 0,
                    totalWin: 0,
                    biggestWin: 0,
                    jackpotPool: 0,
                    gameStats: {}
                };
            }
            var s = root.gambleStats;
            if (typeof s.jackpotPool !== 'number') s.jackpotPool = 0;
            if (typeof s.biggestWin !== 'number') s.biggestWin = 0;
            if (!s.gameStats || typeof s.gameStats !== 'object') s.gameStats = {};
        }

        getStats() { return this.app.charSys.rootState.gambleStats; }

        getGameStat(gameId) {
            var s = this.getStats();
            if (!s.gameStats[gameId]) {
                s.gameStats[gameId] = { played: 0, won: 0, lost: 0, net: 0, biggest: 0 };
            }
            return s.gameStats[gameId];
        }

        // ── 注入樣式 ──
        injectStyles() {
            if (document.getElementById('hy-gamble-style')) return;
            var st = document.createElement('style');
            st.id = 'hy-gamble-style';
            st.innerHTML =
                '.gamble-card { background:#121822; border:1px solid #2e3b4e; border-radius:6px; ' +
                    'padding:12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px; ' +
                    'transition:transform 0.12s, border-color 0.15s; cursor:pointer; }' +
                '.gamble-card:hover { transform:translateY(-2px); }' +
                '.gamble-card h4 { margin:0 0 4px 0; font-size:1rem; }' +
                '.gamble-card p { color:#94a3b8; font-size:0.8rem; line-height:1.4; margin:0; }' +
                '.gamble-opt-btn { cursor:pointer; padding:10px 6px; border-radius:6px; ' +
                    'border:2px solid #334155; background:#18202c; color:#cbd5e1; ' +
                    'font-family:inherit; font-size:0.85rem; transition:all 0.12s; text-align:center; }' +
                '.gamble-opt-btn:hover { border-color:#a78bfa; color:#e2e8f0; }' +
                '.gamble-opt-btn.active { border-color:#f472b6; color:#f9a8d4; ' +
                    'background:rgba(244,114,182,0.14); font-weight:bold; }' +
                '.gamble-bet-btn { cursor:pointer; padding:5px 11px; border-radius:5px; ' +
                    'border:1px solid #fbbf24; background:#18202c; color:#fbbf24; ' +
                    'font-family:inherit; font-size:0.8rem; transition:all 0.12s; }' +
                '.gamble-bet-btn:hover { background:rgba(251,191,36,0.15); }' +
                '@keyframes gamble-roll { 0%,100% { transform:rotate(0deg) scale(1); } ' +
                    '25% { transform:rotate(-12deg) scale(1.08); } 75% { transform:rotate(12deg) scale(1.08); } }' +
                '.gamble-rolling { animation:gamble-roll 0.28s linear infinite; }';
            document.head.appendChild(st);
        }

        // ── 掛鉤黑市渲染 ──
        hookMarketRender() {
            var uiMarket = this.app.uiEquipMarket;
            if (!uiMarket) return;
            var self = this;
            var orig = uiMarket.renderBlackMarketTab.bind(uiMarket);
            uiMarket.renderBlackMarketTab = function () {
                orig();
                self.ensureDOM();
                self.renderGambleSection();
            };
        }

        // ── 建立賭坊 DOM（一次性） ──
        ensureDOM() {
            var tab = document.getElementById('tab-blackmarket');
            if (!tab) return;
            if (document.getElementById('gamble-section')) return;

            var shopList = document.getElementById('shop-list');
            var sec = document.createElement('div');
            sec.id = 'gamble-section';
            sec.style.cssText = 'margin-top:26px; padding-top:16px; border-top:2px dashed #334155;';

            sec.innerHTML =
                '<div class="combat-header-row" style="border-color:#f472b6;">' +
                    '<div>' +
                        '<h3 style="color:#f472b6; margin:0;">🎰 時空賭坊</h3>' +
                        '<p style="font-size:0.82rem; color:#94a3b8; margin-top:4px;">' +
                            '八種博弈任你挑，<b style="color:#fbbf24;">勝率一律 30%</b>' +
                            '（普通勝 + 大獎），每次下注抽 3% 入彩池。' +
                        '</p>' +
                    '</div>' +
                    '<div id="gamble-pool-badge" style="background:#121822; border:1px solid #fbbf24; ' +
                            'border-radius:6px; padding:8px 14px; text-align:center;">' +
                        '<div style="font-size:0.72rem; color:#94a3b8;">💰 累積彩池</div>' +
                        '<strong id="gamble-pool-amount" style="font-size:1.15rem; color:#fbbf24;">0</strong>' +
                        '<div style="font-size:0.68rem; color:#64748b;">大獎可奪 40%</div>' +
                    '</div>' +
                '</div>' +
                '<div id="gamble-stats-bar" style="margin-bottom:12px;"></div>' +
                '<div id="gamble-game-grid" class="enemy-grid"></div>';

            if (shopList && shopList.parentNode === tab) {
                shopList.insertAdjacentElement('afterend', sec);
            } else {
                tab.appendChild(sec);
            }
        }

        // ── 渲染賭坊區塊 ──
        renderGambleSection() {
            this.ensureDOM();
            var grid = document.getElementById('gamble-game-grid');
            if (!grid) return;

            var self = this;
            var stats = this.getStats();
            var poolEl = document.getElementById('gamble-pool-amount');
            if (poolEl) poolEl.textContent = fmt(stats.jackpotPool);

            // 統計列
            var statsBar = document.getElementById('gamble-stats-bar');
            if (statsBar) {
                var winRate = stats.played > 0 ? ((stats.won / stats.played) * 100).toFixed(1) : '—';
                var net = stats.totalWin - stats.totalBet;
                var netColor = net >= 0 ? '#4ade80' : '#f87171';
                statsBar.innerHTML =
                    '<div style="display:flex; gap:14px; flex-wrap:wrap; background:#121822; ' +
                            'border:1px solid #2e3b4e; border-radius:5px; padding:8px 12px; font-size:0.78rem; color:#94a3b8;">' +
                        '<span>🎯 總局數 <b style="color:#e2e8f0;">' + fmt(stats.played) + '</b></span>' +
                        '<span>✅ 勝 <b style="color:#4ade80;">' + fmt(stats.won) + '</b></span>' +
                        '<span>❌ 敗 <b style="color:#f87171;">' + fmt(stats.lost) + '</b></span>' +
                        '<span>📊 勝率 <b style="color:#38bdf8;">' + winRate + '%</b></span>' +
                        '<span>💰 投入 <b style="color:#fbbf24;">' + fmt(stats.totalBet) + '</b></span>' +
                        '<span>🏆 最高單筆 <b style="color:#a78bfa;">' + fmt(stats.biggestWin) + '</b></span>' +
                        '<span>📈 淨損益 <b style="color:' + netColor + ';">' +
                            (net >= 0 ? '+' : '') + fmt(net) + '</b></span>' +
                    '</div>';
            }

            // 遊戲卡片
            grid.innerHTML = '';
            GAMES.forEach(function (g) {
                var gs = self.getGameStat(g.id);
                var evPercent = Math.round((g.baseWin * g.basePayout + g.jackpotWin * g.jackpotPayout) * 100);

                var card = document.createElement('div');
                card.className = 'gamble-card';
                card.style.borderColor = g.theme;
                card.innerHTML =
                    '<div>' +
                        '<h4 style="color:' + g.theme + ';">' + g.icon + ' ' + g.name + '</h4>' +
                        '<p>' + g.desc + '</p>' +
                        '<div style="margin-top:8px; font-size:0.75rem; line-height:1.6;">' +
                            '<div style="color:#94a3b8;">🎲 勝率 <b style="color:#fbbf24;">30%</b>' +
                                ' ｜ 普通 <b style="color:#38bdf8;">' + g.basePayout + '×</b>' +
                                ' ｜ 大獎 <b style="color:#f43f5e;">' + g.jackpotPayout + '×</b></div>' +
                            '<div style="color:#64748b;">📉 期望回報約 <b>' + evPercent + '%</b>' +
                                ' ｜ 最低注 <b>' + fmt(g.betMin) + '</b></div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                            'gap:6px; margin-top:6px;">' +
                        '<span style="font-size:0.72rem; color:#64748b;">' +
                            '已玩 ' + gs.played + ' ｜ 勝 ' + gs.won +
                        '</span>' +
                        '<button class="btn-primary" style="padding:5px 12px; font-size:0.8rem; ' +
                            'background:' + g.theme + '; color:#0f141c;">進入賭桌</button>' +
                    '</div>';

                card.addEventListener('click', function () { self.openTable(g.id); });
                grid.appendChild(card);
            });
        }

        // ── 建立賭桌 Modal ──
        buildModal() {
            if (document.getElementById('hy-gamble-modal')) return;

            var modal = document.createElement('div');
            modal.id = 'hy-gamble-modal';
            modal.className = 'hidden';
            modal.style.cssText =
                'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:95000; ' +
                'display:none; align-items:center; justify-content:center; padding:14px;';

            modal.innerHTML =
                '<div style="background:#0f141c; border:2px solid #f472b6; border-radius:10px; ' +
                        'max-width:620px; width:100%; max-height:92vh; display:flex; flex-direction:column; ' +
                        'box-shadow:0 0 34px rgba(244,114,182,0.3); color:#e2e8f0; ' +
                        'font-family:\'Microsoft JhengHei\',\'PingFang TC\',sans-serif;">' +
                    '<div id="gamble-modal-header" style="display:flex; justify-content:space-between; ' +
                            'align-items:center; padding:12px 16px; border-bottom:1px solid #2e3b4e; flex-shrink:0;"></div>' +
                    '<div id="gamble-modal-body" style="flex:1 1 auto; overflow-y:auto; padding:14px 16px;"></div>' +
                    '<div id="gamble-modal-footer" style="padding:10px 16px; border-top:1px solid #2e3b4e; ' +
                            'flex-shrink:0; text-align:right;"></div>' +
                '</div>';

            document.body.appendChild(modal);
            this.modalEl = modal;
            this.modalBodyEl = modal.querySelector('#gamble-modal-body');

            var self = this;
            modal.addEventListener('click', function (e) {
                if (e.target === modal) self.closeTable();
            });
        }

        // ── 開啟賭桌 ──
        openTable(gameId) {
            var g = GAME_MAP[gameId];
            if (!g) return;

            this.currentGameId = gameId;
            this.currentPick = g.options[0].id;
            this.currentBet = g.betMin;
            this.phase = 'pick';
            this.lastOutcome = null;

            this.renderModal();
            this.modalEl.classList.remove('hidden');
            this.modalEl.style.display = 'flex';
        }

        closeTable() {
            if (!this.modalEl) return;
            this.modalEl.classList.add('hidden');
            this.modalEl.style.display = 'none';
            this.renderGambleSection();
        }

        // ── 渲染 Modal ──
        renderModal() {
            var g = GAME_MAP[this.currentGameId];
            if (!g) return;

            var self = this;
            var gold = this.app.charSys.rootState.gold;
            var stats = this.getStats();

            // ── Header ──
            var hdr = this.modalEl.querySelector('#gamble-modal-header');
            hdr.innerHTML =
                '<div>' +
                    '<h3 style="margin:0; color:' + g.theme + '; font-size:1.05rem;">' + g.icon + ' ' + g.name + '</h3>' +
                    '<div style="font-size:0.74rem; color:#94a3b8; margin-top:2px;">' + g.rule + '</div>' +
                '</div>' +
                '<button id="gamble-modal-close" class="action-btn" style="padding:4px 12px;">✖ 關閉</button>';
            hdr.querySelector('#gamble-modal-close').addEventListener('click', function () { self.closeTable(); });

            // ── Body ──
            var html = '';

            // 資金列
            html +=
                '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                        'background:#121822; border-radius:5px; padding:7px 11px; margin-bottom:12px; font-size:0.8rem;">' +
                    '<span>🪙 持有紋銀：<b style="color:#fbbf24; font-size:1rem;">' + fmt(gold) + '</b></span>' +
                    '<span>💰 彩池：<b style="color:#fbbf24;">' + fmt(stats.jackpotPool) + '</b></span>' +
                '</div>';

            // ── 階段：選項 + 下注 ──
            if (this.phase === 'pick') {
                html += '<div style="font-size:0.82rem; color:#94a3b8; margin-bottom:6px;">① 選擇下注選項</div>';
                html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(76px, 1fr)); ' +
                        'gap:7px; margin-bottom:14px;">';
                g.options.forEach(function (o) {
                    var active = (self.currentPick === o.id);
                    html += '<button class="gamble-opt-btn' + (active ? ' active' : '') + '" ' +
                        'data-opt="' + o.id + '">' +
                        '<div style="font-size:1.4rem; line-height:1.1;">' + o.icon + '</div>' +
                        '<div style="margin-top:3px;">' + o.label + '</div>' +
                    '</button>';
                });
                html += '</div>';

                html += '<div style="font-size:0.82rem; color:#94a3b8; margin-bottom:6px;">② 設定下注金額</div>';
                html += '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px;">' +
                    '<input type="number" id="gamble-bet-input" value="' + self.currentBet + '" min="' + g.betMin + '" ' +
                        'style="width:150px; background:#0d1219; color:#fbbf24; border:1px solid #334155; ' +
                        'border-radius:5px; padding:7px 10px; font-size:0.95rem; font-family:monospace;">';
                g.betSteps.forEach(function (s) {
                    html += '<button class="gamble-bet-btn" data-bet="' + s + '">' + fmt(s) + '</button>';
                });
                html += '<button class="gamble-bet-btn" data-bet="max" style="border-color:#f43f5e; color:#f87171;">全部</button>';
                html += '</div>';

                html += '<div style="font-size:0.75rem; color:#64748b; margin-bottom:12px;">' +
                    '⚠️ 最低下注 <b style="color:#fbbf24;">' + fmt(g.betMin) + '</b>' +
                    ' ｜ 本局若獲勝可得 <b style="color:#4ade80;">' + fmt(self.currentBet * g.basePayout) + '</b> ~ ' +
                    '<b style="color:#f43f5e;">' + fmt(self.currentBet * g.jackpotPayout) + '</b>' +
                '</div>';
            }

            // ── 階段：動畫中 ──
            if (this.phase === 'animating') {
                html += '<div style="text-align:center; padding:56px 0;">' +
                    '<div class="gamble-rolling" style="font-size:4.5rem; line-height:1;">' + g.icon + '</div>' +
                    '<div style="color:#94a3b8; margin-top:14px; font-size:0.9rem;">擲骰中…</div>' +
                '</div>';
            }

            // ── 階段：結果 ──
            if (this.phase === 'result' && this.lastOutcome) {
                var r = this.lastOutcome;
                var renderer = RENDERERS[g.id];
                if (renderer) {
                    html += renderer(r.win, r.jackpot, r.pick);
                }
            }

            this.modalBodyEl.innerHTML = html;

            // ── 綁定事件（pick 階段） ──
            if (this.phase === 'pick') {
                this.modalBodyEl.querySelectorAll('.gamble-opt-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        self.currentPick = btn.dataset.opt;
                        self.renderModal();
                    });
                });
                this.modalBodyEl.querySelectorAll('.gamble-bet-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var v = btn.dataset.bet;
                        var amt;
                        if (v === 'max') {
                            amt = self.app.charSys.rootState.gold;
                        } else {
                            amt = parseInt(v, 10) || g.betMin;
                        }
                        if (amt < g.betMin) amt = g.betMin;
                        self.currentBet = amt;
                        self.renderModal();
                    });
                });
                var inp = this.modalBodyEl.querySelector('#gamble-bet-input');
                if (inp) {
                    inp.addEventListener('change', function () {
                        var v = parseInt(inp.value, 10);
                        if (isNaN(v) || v < g.betMin) v = g.betMin;
                        self.currentBet = v;
                        // 不重繪（避免游標跳動），只更新下方預覽
                    });
                    inp.addEventListener('blur', function () {
                        var v = parseInt(inp.value, 10);
                        if (isNaN(v) || v < g.betMin) v = g.betMin;
                        self.currentBet = v;
                        self.renderModal();
                    });
                }
            }

            // ── Footer ──
            var ftr = this.modalEl.querySelector('#gamble-modal-footer');
            if (this.phase === 'pick') {
                ftr.innerHTML = '<button id="gamble-play-btn" class="btn-primary" ' +
                    'style="padding:10px 32px; font-size:1rem; background:linear-gradient(180deg,#f472b6,#be185d);">' +
                    '🎲 開始下注（' + fmt(this.currentBet) + ' 兩）</button>';
                ftr.querySelector('#gamble-play-btn').addEventListener('click', function () { self.play(); });
            } else if (this.phase === 'animating') {
                ftr.innerHTML = '<span style="color:#64748b; font-size:0.85rem;">請稍候…</span>';
            } else {
                ftr.innerHTML =
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                        '<span style="font-size:0.8rem; color:#94a3b8;">' +
                            '再玩一局或關閉視窗' +
                        '</span>' +
                        '<div>' +
                            '<button id="gamble-again-btn" class="btn-primary" ' +
                                'style="padding:9px 22px; margin-right:8px;">🔄 再來一局</button>' +
                            '<button id="gamble-close-btn" class="action-btn" style="padding:9px 18px;">關閉賭桌</button>' +
                        '</div>' +
                    '</div>';
                ftr.querySelector('#gamble-again-btn').addEventListener('click', function () {
                    self.phase = 'pick';
                    self.lastOutcome = null;
                    self.renderModal();
                });
                ftr.querySelector('#gamble-close-btn').addEventListener('click', function () {
                    self.closeTable();
                });
            }
        }

        // ── 下注 ──
        play() {
            var g = GAME_MAP[this.currentGameId];
            if (!g) return;

            var bet = this.currentBet;
            var gold = this.app.charSys.rootState.gold;

            if (bet < g.betMin) {
                alert('最低下注 ' + fmt(g.betMin) + ' 兩');
                return;
            }
            if (gold < bet) {
                alert('紋銀不足！你只有 ' + fmt(gold) + ' 兩。');
                return;
            }

            // 扣款
            this.app.charSys.rootState.gold -= bet;

            // 統計
            var stats = this.getStats();
            var gs = this.getGameStat(g.id);
            stats.played += 1;
            stats.totalBet += bet;
            gs.played += 1;

            // 彩池
            stats.jackpotPool = (stats.jackpotPool || 0) + Math.floor(bet * 0.03);

            // 決定結果（固定 30% 勝率）
            var r = Math.random();
            var win = false, jackpot = false;
            if (r < g.jackpotWin) {
                win = true; jackpot = true;
            } else if (r < g.jackpotWin + g.baseWin) {
                win = true; jackpot = false;
            }

            // 派彩
            var payout = 0;
            if (win) {
                payout = Math.floor(bet * (jackpot ? g.jackpotPayout : g.basePayout));
                if (jackpot && stats.jackpotPool > 0) {
                    var poolBonus = Math.floor(stats.jackpotPool * 0.4);
                    payout += poolBonus;
                    stats.jackpotPool -= poolBonus;
                }
                this.app.charSys.rootState.gold += payout;
                stats.totalWin += payout;
                stats.won += 1;
                gs.won += 1;
                gs.net += (payout - bet);
                if (payout > (stats.biggestWin || 0)) stats.biggestWin = payout;
                if (payout > (gs.biggest || 0)) gs.biggest = payout;
            } else {
                stats.lost += 1;
                gs.lost += 1;
                gs.net -= bet;
            }

            this.lastOutcome = {
                win: win,
                jackpot: jackpot,
                pick: this.currentPick,
                bet: bet,
                payout: payout
            };
            this.phase = 'animating';
            this.renderModal();

            var self = this;
            setTimeout(function () {
                self.phase = 'result';
                self.renderModal();
                // 結果標題
                var banner = '';
                if (jackpot) {
                    banner = '<div style="text-align:center; margin-bottom:10px; padding:10px; ' +
                        'background:linear-gradient(90deg,rgba(244,63,94,0.22),rgba(251,191,36,0.22),rgba(244,63,94,0.22)); ' +
                        'border:2px solid #fbbf24; border-radius:8px; font-size:1.15rem; font-weight:bold; color:#fbbf24;">' +
                        '🎉 大獎！！！ +' + fmt(payout) + ' 兩</div>';
                } else if (win) {
                    banner = '<div style="text-align:center; margin-bottom:10px; padding:9px; ' +
                        'background:rgba(74,222,128,0.12); border:1px solid #4ade80; border-radius:8px; ' +
                        'font-size:1rem; font-weight:bold; color:#4ade80;">' +
                        '✅ 你贏了！ +' + fmt(payout) + ' 兩</div>';
                } else {
                    banner = '<div style="text-align:center; margin-bottom:10px; padding:9px; ' +
                        'background:rgba(248,113,113,0.10); border:1px solid #f87171; border-radius:8px; ' +
                        'font-size:1rem; font-weight:bold; color:#f87171;">' +
                        '❌ 本局失利，-' + fmt(bet) + ' 兩</div>';
                }
                // 把 banner 插到 body 最前面
                var body = self.modalBodyEl;
                if (body) {
                    var div = document.createElement('div');
                    div.innerHTML = banner;
                    body.insertBefore(div.firstChild, body.firstChild);
                }
                self.renderGambleSection();
            }, 900);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ⑤ 啟動
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game && game.uiEquipMarket) {
                window.HY.gambleSys = new GambleSystem(game);
            }
        }, 200);
    });

    window.HY.GambleSystem = GambleSystem;
    window.HY.GAMBLE_GAMES = GAMES;

})();