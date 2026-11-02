// js/uiLottery.js  (v5)
// ═══════════════════════════════════════════════════════════════════════
//  黑市分區折疊 + 大樂透面板 + 開獎前提醒彈窗
//
//  v5 修正：
//    ⭐【購買名單】由「長條形」改為「小方形磁磚」格狀排列
//       → grid-template-columns: repeat(auto-fill, minmax(86px, 1fr))
//       → 每位購買者只佔一小格，大幅減少垂直空間浪費
//       → 完整資訊（稱號／時間）改置於 title 提示，滑鼠移上去可見
//  v4 修正：
//    ⭐【名單跳動】捲動容器加上獨立 id #lot-buyers-scroll
//      → 原程式對「非捲動容器」還原 scrollTop，等於沒還原
//    ⭐【名單跳動】refreshLive 改用「簽章比對」
//      → 名單沒變就完全不碰 DOM（零閃爍）
//      → 有變才重建，並依「原本位置」決定還原策略：
//         在底部 → 跟隨新底部；在頂端 → 停在頂端；中間 → 保留偏移
//    ⭐ 移除「你的彩券」每 5 秒的無意義 innerHTML
//  v3：獎項說明不再彈回；名單可折疊；移除「名人已購 X/N」
// ═══════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {
    var BM_KEY = 'HY_BM_OPEN_V1';
    var SEC_KEY = 'HY_LOT_SEC_OPEN_V1';
    var LAYOUT_FLAG = '3';

    var LOT_SECS = [
        { key: 'mytickets', def: true },
        { key: 'buyers',    def: true },
        { key: 'prizes',    def: false },
        { key: 'history',   def: false }
    ];

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmt(n) { return Math.floor(n || 0).toLocaleString(); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    class UILottery {
        constructor(app) {
            this.app = app;

            if (!app.lotterySys && window.HY.LotterySystem) {
                try {
                    app.lotterySys = new window.HY.LotterySystem(app);
                    console.log('[uiLottery] ✓ 已補建 game.lotterySys');
                } catch (e) {
                    console.error('[uiLottery] ✗ 無法建立 lotterySys：', e);
                }
            }
            this.sys = app.lotterySys || null;

            this.picked = [];
            this.remindEl = null;
            this._lastCountdown = '';
            this._liveCounter = 0;
            this._booted = false;

            // ⭐ v4：局部更新用簽章
            this._buyerSig = null;
            this._myTicketSig = null;

            this.injectStyles();
            this.bindSystem();
            this.hookMarketRender();

            var self = this;
            setTimeout(function () { self.boot(); }, 60);
        }

        // ══════════════════════════════════════════════
        //  樣式
        // ══════════════════════════════════════════════
        injectStyles() {
            if (document.getElementById('hy-lottery-style')) return;
            var st = document.createElement('style');
            st.id = 'hy-lottery-style';
            st.innerHTML =
                '.bm-details { background:#121822; border-radius:6px; margin-bottom:12px; overflow:hidden; }' +
                '.bm-details > summary {' +
                    'list-style:none; outline:none; cursor:pointer; user-select:none;' +
                    'padding:11px 14px; display:flex; justify-content:space-between;' +
                    'align-items:center; gap:10px; background:#18202c;' +
                    'font-weight:bold; font-size:0.95rem; transition:background 0.15s;' +
                '}' +
                '.bm-details > summary::-webkit-details-marker { display:none; }' +
                '.bm-details > summary::marker { content:""; }' +
                '.bm-details > summary:hover { background:#1f2937; }' +
                '.bm-chev { color:#64748b; font-size:0.72rem; flex:0 0 auto;' +
                    'transition:transform 0.18s ease; display:inline-block; }' +
                '.bm-details[open] .bm-chev { transform:rotate(180deg); }' +
                '.bm-body { padding:12px 14px; }' +

                '.lot-sec {' +
                    'background:#121822; border:1px solid #2e3b4e; border-radius:6px;' +
                    'margin-bottom:12px; overflow:hidden;' +
                '}' +
                '.lot-sec > summary {' +
                    'list-style:none; outline:none; cursor:pointer; user-select:none;' +
                    'padding:9px 12px; display:flex; justify-content:space-between;' +
                    'align-items:center; gap:8px; background:#18202c;' +
                    'font-size:0.85rem; font-weight:bold; transition:background 0.15s;' +
                '}' +
                '.lot-sec > summary::-webkit-details-marker { display:none; }' +
                '.lot-sec > summary::marker { content:""; }' +
                '.lot-sec > summary:hover { background:#1f2937; }' +
                '.lot-chev { color:#64748b; font-size:0.68rem; flex:0 0 auto;' +
                    'transition:transform 0.18s ease; display:inline-block; }' +
                '.lot-sec[open] .lot-chev { transform:rotate(180deg); }' +
                '.lot-sec-body { padding:10px 12px; }' +

                '.lot-num {' +
                    'cursor:pointer; padding:8px 0; border-radius:5px; text-align:center;' +
                    'border:1px solid #334155; background:#0d1219; color:#94a3b8;' +
                    'font-family:monospace; font-size:0.85rem; font-weight:bold;' +
                    'transition:all 0.12s; user-select:none;' +
                '}' +
                '.lot-num:hover { border-color:#38bdf8; color:#7dd3fc; }' +
                '.lot-num.picked {' +
                    'background:linear-gradient(180deg,#b45309,#92400e);' +
                    'border-color:#fbbf24; color:#fff;' +
                    'box-shadow:0 0 8px rgba(251,191,36,0.55);' +
                '}' +

                '.lot-ball {' +
                    'display:inline-flex; width:30px; height:30px; margin:0 3px 3px 0;' +
                    'border-radius:50%; align-items:center; justify-content:center;' +
                    'font-family:monospace; font-size:0.8rem; font-weight:bold;' +
                    'background:#1a2434; border:1px solid #475569; color:#cbd5e1;' +
                '}' +
                '.lot-ball.hit { background:linear-gradient(180deg,#b45309,#92400e); border-color:#fbbf24; color:#fff; }' +
                '.lot-ball.special { border-color:#f43f5e; color:#fca5a5; }' +
                '.lot-ball.special.hit { background:linear-gradient(180deg,#9f1239,#7f1d1d); border-color:#f43f5e; color:#fff; }' +

                // ⭐ v5：購買名單 → 小方形磁磚
                '.lot-buyer {' +
                    'position:relative;' +
                    'display:flex; flex-direction:column; align-items:center; justify-content:center;' +
                    'gap:1px; min-height:82px; padding:6px 4px;' +
                    'background:#0d1219; border:1px solid #2e3b4e; border-top:3px solid #334155;' +
                    'border-radius:5px; text-align:center; overflow:hidden; box-sizing:border-box;' +
                '}' +
                '.lot-buyer.me {' +
                    'border-color:#00e5ff; border-top-color:#00e5ff;' +
                    'background:rgba(0,229,255,0.07);' +
                '}' +
                '.lot-buyer .lb-icon { font-size:1.15rem; line-height:1.15; }' +
                '.lot-buyer .lb-name {' +
                    'font-size:0.73rem; color:#e2e8f0; font-weight:bold;' +
                    'width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' +
                '}' +
                '.lot-buyer .lb-sub {' +
                    'font-size:0.64rem; color:#64748b;' +
                    'width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' +
                '}' +
                '.lot-buyer .lb-amt {' +
                    'font-size:0.70rem; color:#fbbf24; font-family:monospace; font-weight:bold;' +
                    'white-space:nowrap;' +
                '}' +
                '.lot-buyer .lb-cnt {' +
                    'position:absolute; top:2px; right:2px;' +
                    'font-size:0.60rem; font-weight:bold; color:#38bdf8;' +
                    'background:rgba(56,189,248,0.16); border-radius:2px; padding:0 3px; line-height:1.4;' +
                '}' +

                // ⭐ v5：名單容器 → 格狀排列（auto-fill 自動依寬度塞滿）
                '#lot-buyers-scroll {' +
                    'display:grid;' +
                    'grid-template-columns:repeat(auto-fill, minmax(86px, 1fr));' +
                    'gap:5px; align-content:start;' +
                    'max-height:300px; overflow-y:auto; overflow-anchor:none;' +
                '}' +
                '#lot-buyers-scroll::-webkit-scrollbar { width:6px; }' +
                '#lot-buyers-scroll::-webkit-scrollbar-track { background:transparent; }' +
                '#lot-buyers-scroll::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }' +
                '.lb-empty { grid-column:1/-1; color:#64748b; font-size:0.78rem; padding:6px 0; }';

            document.head.appendChild(st);
        }

        // ══════════════════════════════════════════════
        //  系統回呼
        // ══════════════════════════════════════════════
        bindSystem() {
            var self = this;
            if (!this.sys) { console.warn('[uiLottery] ⚠️ lotterySys 不存在'); return; }

            this.sys.onChange = function () { self.refreshLive(); };
            this.sys.onRemind = function (remainMs) { self.showRemind(remainMs); };
            this.sys.onDraw = function (record) {
                self.picked = [];
                self._buyerSig = null;
                self._myTicketSig = null;
                self.render();
                self.showDrawResult(record);
            };
        }

        hookMarketRender() {
            var uiMarket = this.app.uiEquipMarket;
            if (!uiMarket) { console.warn('[uiLottery] ⚠️ uiEquipMarket 不存在'); return; }
            var self = this;
            var orig = uiMarket.renderBlackMarketTab.bind(uiMarket);
            uiMarket.renderBlackMarketTab = function () {
                orig();
                self.ensureLayout();
                self.attachGamble();
                if (document.getElementById('lottery-panel')) self.render();
            };
        }

        // ══════════════════════════════════════════════
        //  啟動
        // ══════════════════════════════════════════════
        boot() {
            if (this._booted) return;
            var self = this;
            var tries = 0;

            function attempt() {
                tries++;
                var ok = self.ensureLayout();
                self.attachGamble();
                if (ok) {
                    self._booted = true;
                    self.render();
                    self.startTicker();
                    console.log('[uiLottery] ✓ 黑市折疊版面已建立');
                    return;
                }
                if (tries < 40) setTimeout(attempt, 150);
                else console.warn('[uiLottery] ✗ 版面建立失敗（重試 ' + tries + ' 次）');
            }
            attempt();
        }

        // ══════════════════════════════════════════════
        //  黑市版面重構
        // ══════════════════════════════════════════════
        ensureLayout() {
            var tab = document.getElementById('tab-blackmarket');
            if (!tab) return false;
            if (tab.getAttribute('data-hy-bm') === LAYOUT_FLAG) {
                return !!document.getElementById('lottery-panel');
            }

            var specialList = document.getElementById('market-special-list');
            var shopList = document.getElementById('shop-list');
            if (!specialList || !shopList) return false;
            if (specialList.closest('#bm-details-special')) return true;

            var specialHeader = specialList.previousElementSibling;
            var shopHeader = shopList.previousElementSibling;
            var gambleSec = document.getElementById('gamble-section');

            if (!specialHeader || specialHeader.tagName !== 'DIV') specialHeader = null;
            if (!shopHeader || shopHeader.tagName !== 'H3') shopHeader = null;

            var cfg = (this.sys && this.sys.cfg) ? this.sys.cfg
                : { drawIntervalMs: 1800000, ticketPrice: 100, numberMax: 49 };
            var intervalMin = Math.round(cfg.drawIntervalMs / 60000);

            var dSpecial = this.buildBM('bm-details-special', '🏪 神秘商人・限時特價丹藥', '#a78bfa', true);
            var dShop    = this.buildBM('bm-details-shop',    '🏪 時空黑市常駐丹藥鋪', '#10b981', false);
            var dGamble  = this.buildBM('bm-details-gamble',  '🎰 時空賭坊・八種博弈（勝率 30%）', '#f472b6', false);
            var dLottery = this.buildBM('bm-details-lottery', '🎟️ 大樂透・每 ' + intervalMin + ' 分鐘開獎', '#fbbf24', false);

            var bSpecial = dSpecial.querySelector('.bm-body');
            var bShop    = dShop.querySelector('.bm-body');
            var bGamble  = dGamble.querySelector('.bm-body');
            var bLottery = dLottery.querySelector('.bm-body');

            bLottery.innerHTML =
                '<div id="lottery-panel"></div>' +
                '<div id="lottery-history-box" style="margin-top:14px;"></div>';
            bGamble.innerHTML = '<div id="bm-gamble-host"></div>';

            if (specialHeader) bSpecial.appendChild(specialHeader);
            bSpecial.appendChild(specialList);

            if (shopHeader) bShop.appendChild(shopHeader);
            bShop.appendChild(shopList);

            if (gambleSec) bGamble.querySelector('#bm-gamble-host').appendChild(gambleSec);

            while (tab.firstChild) tab.removeChild(tab.firstChild);
            tab.appendChild(dSpecial);
            tab.appendChild(dShop);
            tab.appendChild(dGamble);
            tab.appendChild(dLottery);
            tab.setAttribute('data-hy-bm', LAYOUT_FLAG);

            this.applyBMState();
            this.bindBMToggle();

            return true;
        }

        buildBM(id, title, color, defaultOpen) {
            var d = document.createElement('details');
            d.id = id;
            d.className = 'bm-details';
            d.style.border = '1px solid ' + color;
            if (defaultOpen) d.open = true;
            d.innerHTML =
                '<summary style="color:' + color + ';">' +
                    '<span>' + title + '</span>' +
                    '<span class="bm-chev">▼</span>' +
                '</summary>' +
                '<div class="bm-body"></div>';
            return d;
        }

        attachGamble() {
            var sec = document.getElementById('gamble-section');
            var host = document.getElementById('bm-gamble-host');
            if (!sec || !host) return;
            if (sec.parentNode === host) return;
            this.hideGambleDupTitle(sec);
            host.appendChild(sec);
        }

        hideGambleDupTitle(sec) {
            if (sec.__titleHidden) return;
            sec.__titleHidden = true;
            var h3 = sec.querySelector('h3');
            if (h3) {
                var box = h3.parentNode;
                if (box && box.tagName === 'DIV') box.style.display = 'none';
                else h3.style.display = 'none';
            }
            var p = sec.querySelector('p');
            if (p) p.style.display = 'none';
        }

        readBM() {
            try {
                var o = JSON.parse(localStorage.getItem(BM_KEY) || '{}');
                return (o && typeof o === 'object') ? o : {};
            } catch (e) { return {}; }
        }

        applyBMState() {
            var saved = this.readBM();
            ['special', 'shop', 'gamble', 'lottery'].forEach(function (k) {
                var d = document.getElementById('bm-details-' + k);
                if (!d) return;
                if (typeof saved[k] === 'boolean') d.open = saved[k];
            });
        }

        bindBMToggle() {
            ['special', 'shop', 'gamble', 'lottery'].forEach(function (k) {
                var d = document.getElementById('bm-details-' + k);
                if (!d || d.__bmBound) return;
                d.__bmBound = true;
                d.addEventListener('toggle', function () {
                    try {
                        var s = JSON.parse(localStorage.getItem(BM_KEY) || '{}') || {};
                        s[k] = d.open;
                        localStorage.setItem(BM_KEY, JSON.stringify(s));
                    } catch (e) {}
                });
            });
        }

        readSec() {
            try {
                var o = JSON.parse(localStorage.getItem(SEC_KEY) || '{}');
                return (o && typeof o === 'object') ? o : {};
            } catch (e) { return {}; }
        }

        applySecState() {
            var saved = this.readSec();
            LOT_SECS.forEach(function (s) {
                var d = document.getElementById('lot-sec-' + s.key);
                if (!d) return;
                d.open = (typeof saved[s.key] === 'boolean') ? saved[s.key] : s.def;
            });
        }

        bindSecToggle() {
            LOT_SECS.forEach(function (s) {
                var d = document.getElementById('lot-sec-' + s.key);
                if (!d || d.__secBound) return;
                d.__secBound = true;
                d.addEventListener('toggle', function () {
                    try {
                        var o = JSON.parse(localStorage.getItem(SEC_KEY) || '{}') || {};
                        o[s.key] = d.open;
                        localStorage.setItem(SEC_KEY, JSON.stringify(o));
                    } catch (e) {}
                });
            });
        }

        captureSecState() {
            var out = {};
            LOT_SECS.forEach(function (s) {
                var d = document.getElementById('lot-sec-' + s.key);
                if (d) out[s.key] = d.open;
            });
            return out;
        }

        restoreSecState(snap) {
            if (!snap) { this.applySecState(); return; }
            LOT_SECS.forEach(function (s) {
                var d = document.getElementById('lot-sec-' + s.key);
                if (!d) return;
                d.open = (typeof snap[s.key] === 'boolean') ? snap[s.key] : s.def;
            });
            this.bindSecToggle();
        }

        rebuild() {
            var tab = document.getElementById('tab-blackmarket');
            if (tab) tab.removeAttribute('data-hy-bm');
            var sp = document.getElementById('market-special-list');
            var sh = document.getElementById('shop-list');
            var gm = document.getElementById('gamble-section');
            if (sp && tab) tab.appendChild(sp);
            if (sh && tab) tab.appendChild(sh);
            if (gm && tab) tab.appendChild(gm);
            var ok = this.ensureLayout();
            this.attachGamble();
            this.render();
            console.log('[uiLottery] ' + (ok ? '✓ 版面已重建' : '✗ 重建失敗'));
            return ok;
        }

        // ══════════════════════════════════════════════
        //  計時器
        // ══════════════════════════════════════════════
        startTicker() {
            var self = this;
            setInterval(function () {
                if (!self.sys || !self.sys.cfg.enabled) return;

                var el = document.getElementById('lot-countdown');
                if (el) {
                    var txt = self.formatCountdown(self.sys.getCountdown());
                    if (txt !== self._lastCountdown) {
                        self._lastCountdown = txt;
                        el.textContent = txt;
                    }
                }

                self._liveCounter++;
                if (self._liveCounter >= 5) {
                    self._liveCounter = 0;
                    self.refreshLive();
                }
            }, 1000);
        }

        formatCountdown(ms) {
            var total = Math.max(0, Math.floor(ms / 1000));
            var h = Math.floor(total / 3600);
            var m = Math.floor((total % 3600) / 60);
            var s = total % 60;
            if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
            return pad2(m) + ':' + pad2(s);
        }

        // ══════════════════════════════════════════════
        //  ⭐ v4：局部更新（零閃爍）
        // ══════════════════════════════════════════════
        refreshLive() {
            var tab = document.getElementById('tab-blackmarket');
            if (!tab || !tab.classList.contains('active')) return;
            if (!this.sys) return;
            if (!document.getElementById('lottery-panel')) return;
            if (!document.getElementById('lot-countdown')) return;

            var sys = this.sys;
            var L = sys.getState();
            var gold = this.app.charSys.rootState.gold;
            var myTickets = sys.getMyTickets();
            var buyers = sys.getBuyers();
            var sold = sys.getTotalSold();

            var set = function (id, txt) {
                var e = document.getElementById(id);
                if (e && e.textContent !== txt) e.textContent = txt;
            };

            set('lot-pool', fmt(L.pool) + ' 兩');
            set('lot-my-count', myTickets.length + ' 張');
            set('lot-gold', fmt(gold) + ' 兩');
            set('lot-sold', '本期售出 ' + fmt(sold.amount) + ' 兩');
            set('lot-buyers-title', '👥 本期購買名單（' + buyers.length + ' 人）');
            set('lot-mytickets-badge', myTickets.length + ' 張');

            // ① 你的彩券（簽章比對）
            var mtSig = myTickets.map(function (t) { return t.uid; }).join('|') || '0';
            if (mtSig !== this._myTicketSig) {
                this._myTicketSig = mtSig;
                var mt = document.getElementById('lot-mytickets-body');
                if (mt) mt.innerHTML = this.myTicketsHtml(myTickets);
            }

            // ② 購買名單（簽章比對 + 捲動位置保護）
            var sc = document.getElementById('lot-buyers-scroll');
            if (!sc) return;

            var bSig = this.buyersSig(buyers);
            if (bSig === this._buyerSig) return;   // ⭐ 名單沒變 → 完全不碰 DOM
            this._buyerSig = bSig;

            var prevTop = sc.scrollTop;
            var prevMax = Math.max(0, sc.scrollHeight - sc.clientHeight);
            var wasAtBottom = (prevMax <= 0) || (prevTop >= prevMax - 8);
            var wasAtTop = (prevTop <= 8);

            sc.innerHTML = this.buyersHtml(buyers);

            var newMax = Math.max(0, sc.scrollHeight - sc.clientHeight);
            if (wasAtBottom)      sc.scrollTop = newMax;                    // 跟隨新底部
            else if (wasAtTop)    sc.scrollTop = 0;                         // 停在頂端
            else                  sc.scrollTop = Math.min(prevTop, newMax); // 保留偏移
        }

        // ⭐ v4：名單簽章（key + 金額 + 張數）
        buyersSig(buyers) {
            if (!buyers || buyers.length === 0) return '0';
            return buyers.map(function (b) {
                return b.key + ':' + b.amount + ':' + b.count;
            }).join('|');
        }

        // ══════════════════════════════════════════════
        //  片段產生器
        // ══════════════════════════════════════════════
        myTicketsHtml(myTickets) {
            if (!myTickets || myTickets.length === 0) {
                return '<div style="color:#64748b; font-size:0.78rem; padding:6px 0;">尚未購買本期彩券。</div>';
            }
            return myTickets.map(function (t) {
                return '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                        'background:#0d1219; border-left:3px solid #00e5ff; border-radius:4px; ' +
                        'padding:5px 9px; margin-bottom:4px;">' +
                    '<span style="font-family:monospace; color:#7dd3fc; font-size:0.82rem;">' +
                        t.numbers.map(pad2).join(' ') + '</span>' +
                    '<span style="color:#64748b; font-size:0.72rem;">' + fmt(t.price) + ' 兩</span>' +
                '</div>';
            }).join('');
        }
        // ⭐ v5：小方形磁磚（每位購買者只佔一格）
        //   磁磚內容：圖示 / 姓名 / 稱號 / 金額（+ 右上角張數徽章）
        //   完整資訊（含時間）放在 title 提示，滑鼠移上去可見
        buyersHtml(buyers) {
            if (!buyers || buyers.length === 0) {
                return '<div class="lb-empty">本期尚無人購買。</div>';
            }

            return buyers.map(function (b) {
                var timeText = b.atTs
                    ? new Date(b.atTs).toLocaleTimeString('zh-TW', {
                        hour12: false, hour: '2-digit', minute: '2-digit'
                    })
                    : '';

                // 滑鼠移上去的完整提示
                var tip = b.name +
                    (b.title ? '（' + b.title + '）' : '') +
                    ' ｜ ' + fmt(b.amount) + ' 兩' +
                    (b.count > 1 ? ' ｜ ' + b.count + ' 張' : '') +
                    (timeText ? ' ｜ ' + timeText : '');

                return '<div class="lot-buyer' + (b.isPlayer ? ' me' : '') + '" ' +
                        'data-bkey="' + esc(b.key) + '" ' +
                        'title="' + esc(tip) + '">' +
                    (b.count > 1 ? '<span class="lb-cnt">x' + b.count + '</span>' : '') +
                    '<div class="lb-icon">' + esc(b.icon) + '</div>' +
                    '<div class="lb-name">' + esc(b.name) + '</div>' +
                    '<div class="lb-sub">' + esc(b.title || '') + '</div>' +
                    '<div class="lb-amt">' + fmt(b.amount) + '</div>' +
                '</div>';
            }).join('');
        }

        buildSec(key, titleHtml, color, bodyInner) {
            return '<details id="lot-sec-' + key + '" class="lot-sec" style="border-color:' + color + ';">' +
                '<summary style="color:' + color + ';">' +
                    '<span>' + titleHtml + '</span>' +
                    '<span class="lot-chev">▼</span>' +
                '</summary>' +
                '<div class="lot-sec-body" id="lot-' + key + '-body">' + bodyInner + '</div>' +
            '</details>';
        }

        // ══════════════════════════════════════════════
        //  主渲染（僅在初始 / 開獎 / 進分頁時執行）
        // ══════════════════════════════════════════════
        render() {
            var panel = document.getElementById('lottery-panel');
            if (!panel) return;

            var sys = this.sys;
            if (!sys) {
                panel.innerHTML = '<p style="color:#f87171;">⚠️ 樂透系統未載入（lotterySys 不存在）。</p>';
                return;
            }

            var secSnap = this.captureSecState();

            var cfg = sys.cfg;
            var L = sys.getState();
            var gold = this.app.charSys.rootState.gold;

            var remain = sys.getCountdown();
            var myTickets = sys.getMyTickets();
            var buyers = sys.getBuyers();
            var sold = sys.getTotalSold();
            var last = (L.history && L.history.length > 0) ? L.history[0] : null;

            // 選號盤
            var gridHtml = '';
            for (var n = 1; n <= cfg.numberMax; n++) {
                gridHtml += '<div class="lot-num' +
                    (this.picked.indexOf(n) !== -1 ? ' picked' : '') +
                    '" data-num="' + n + '">' + pad2(n) + '</div>';
            }

            // 上一期
            var lastHtml;
            if (!last) {
                lastHtml = '<div style="color:#64748b; font-size:0.78rem;">尚無開獎紀錄。</div>';
            } else {
                var myResultHtml = (last.myTickets && last.myTickets.length > 0)
                    ? last.myTickets.map(function (t) {
                        var prizeTxt = t.prize
                            ? '<span style="color:' + t.prize.color + '; font-weight:bold;">' +
                                t.prize.label + ' +' + fmt(t.payout) + ' 兩</span>'
                            : '<span style="color:#64748b;">未中獎</span>';
                        return '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:0.78rem;">' +
                            '<span style="font-family:monospace; color:#94a3b8;">' +
                                t.numbers.map(pad2).join(' ') +
                                ' <span style="color:#64748b;">(中 ' + t.match + ' 碼' + (t.hasSpecial ? '+特' : '') + ')</span>' +
                            '</span><span>' + prizeTxt + '</span></div>';
                    }).join('')
                    : '<div style="color:#64748b; font-size:0.76rem;">本期你未購票。</div>';

                var winnersHtml = last.jackpotCount > 0
                    ? '<div style="color:#f43f5e; font-weight:bold; font-size:0.82rem; margin-top:6px;">' +
                        '🏆 頭獎得主：你！（彩池 ' + fmt(last.poolBefore) + ' 兩）</div>'
                    : '<div style="color:#64748b; font-size:0.76rem; margin-top:6px;">頭獎無人中獎，彩池累積至下期。</div>';

                lastHtml =
                    '<div style="background:#0d1219; border:1px solid #334155; border-radius:5px; padding:10px;">' +
                        '<div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px;">' +
                            '開獎時間：' + new Date(last.drawTs).toLocaleString('zh-TW', { hour12: false }) + '</div>' +
                        '<div style="margin-bottom:8px;">' + this.ballsHtml(last.numbers, last.special, null, false) + '</div>' +
                        '<div style="border-top:1px dashed #334155; padding-top:6px;">' + myResultHtml + '</div>' +
                        winnersHtml +
                    '</div>';
            }

            // 歷史
            var histHtml = '';
            if (L.history && L.history.length > 1) {
                histHtml = L.history.slice(1).map(function (h) {
                    return '<div style="display:flex; justify-content:space-between; padding:4px 0; ' +
                            'border-top:1px dashed #1e293b; font-size:0.75rem;">' +
                        '<span style="font-family:monospace; color:#94a3b8;">' +
                            h.numbers.map(pad2).join(' ') + ' ｜ 特 ' + pad2(h.special) + '</span>' +
                        '<span style="color:' + (h.totalPayout > 0 ? '#4ade80' : '#64748b') + ';">' +
                            (h.totalPayout > 0 ? '+' + fmt(h.totalPayout) + ' 兩' : '未中') + '</span>' +
                    '</div>';
                }).join('');
            } else {
                histHtml = '<div style="color:#64748b; font-size:0.78rem;">尚無更多歷史紀錄。</div>';
            }

            // 獎項表
            var prizeRowsHtml = sys.getPrizes().map(function (p) {
                var prizeAmt;
                if (p.type === 'pool') {
                    var pct = (p.key === 'jackpot') ? cfg.jackpotPctOfPool : cfg.secondPctOfPool;
                    prizeAmt = Math.round(pct * 100) + '% 彩池';
                } else {
                    prizeAmt = fmt(p.amount) + ' 兩';
                }
                return '<div style="display:flex; justify-content:space-between; gap:8px; ' +
                        'background:#121822; border-left:3px solid ' + p.color + '; ' +
                        'border-radius:3px; padding:4px 8px;">' +
                    '<span style="color:' + p.color + '; font-weight:bold; white-space:nowrap;">' + p.label + '</span>' +
                    '<span style="color:#94a3b8; font-size:0.72rem; flex:1;">' + p.desc + '</span>' +
                    '<span style="color:#fbbf24; font-family:monospace; white-space:nowrap;">' + prizeAmt + '</span>' +
                '</div>';
            }).join('');

            var prizesInner =
                '<div style="color:#94a3b8; line-height:1.7; margin-bottom:8px;">' +
                    '• 每張彩券選 <b>' + cfg.pickCount + '</b> 個號碼（1~' + cfg.numberMax +
                        '），單價 <b>' + fmt(cfg.ticketPrice) + '</b> 兩<br>' +
                    '• 開獎抽出 6 個正取號碼 + 1 個特別號<br>' +
                    '• 每 <b>' + Math.round(cfg.drawIntervalMs / 60000) + ' 分鐘</b>開獎一次（真實時間）<br>' +
                    '• 玩家購票的 <b>' + Math.round(cfg.poolContributionPct * 100) + '%</b> 注入彩池<br>' +
                    '• 世界名人隨機贊助（每人只買一次，全額進彩池）<br>' +
                    '• <b style="color:#f472b6;">名人僅贊助彩池，不參與派彩</b>，頭獎必由玩家獨得<br>' +
                    '• 頭獎無人中獎時，彩池<b style="color:#4ade80;">完整累積至下一期</b>' +
                '</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:5px;">' +
                    prizeRowsHtml +
                '</div>' +
                '<div style="margin-top:10px; padding-top:8px; border-top:1px dashed #334155; color:#94a3b8;">' +
                    '📊 <b>你的樂透統計</b>：購買 <b style="color:#00e5ff;">' + L.stats.bought + '</b> 張 ｜ ' +
                    '投入 <b style="color:#f87171;">' + fmt(L.stats.spent) + '</b> 兩 ｜ ' +
                    '贏得 <b style="color:#4ade80;">' + fmt(L.stats.won) + '</b> 兩 ｜ ' +
                    '單張最高 <b style="color:#fbbf24;">' + fmt(L.stats.best) + '</b> 兩 ｜ ' +
                    '頭獎次數 <b style="color:#f43f5e;">' + L.stats.jackpots + '</b>' +
                '</div>';

            // ⭐ v4：更新簽章（避免 render 後立刻觸發一次多餘的局部更新）
            this._myTicketSig = myTickets.map(function (t) { return t.uid; }).join('|') || '0';
            this._buyerSig = this.buyersSig(buyers);

            // ── 主組裝 ──
            panel.innerHTML =
                // ① 狀態橫幅
                '<div style="background:linear-gradient(135deg,#1a1a12,#241c08); border:1px solid #fbbf24; ' +
                        'border-radius:8px; padding:14px; margin-bottom:14px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                            'flex-wrap:wrap; gap:14px;">' +
                        '<div style="text-align:center; min-width:110px;">' +
                            '<div style="font-size:0.74rem; color:#94a3b8;">距離開獎倒數</div>' +
                            '<div id="lot-countdown" style="font-size:1.7rem; font-weight:bold; ' +
                                    'color:#fbbf24; font-family:monospace; letter-spacing:1px; line-height:1.3;">' +
                                this.formatCountdown(remain) + '</div>' +
                        '</div>' +
                        '<div style="text-align:center; min-width:110px;">' +
                            '<div style="font-size:0.74rem; color:#94a3b8;">💰 累積彩池</div>' +
                            '<div id="lot-pool" style="font-size:1.35rem; font-weight:bold; ' +
                                    'color:#4ade80; line-height:1.3;">' + fmt(L.pool) + ' 兩</div>' +
                            '<div style="font-size:0.66rem; color:#64748b;">頭獎獨得 ' +
                                Math.round(cfg.jackpotPctOfPool * 100) + '%</div>' +
                        '</div>' +
                        '<div style="text-align:center; min-width:110px;">' +
                            '<div style="font-size:0.74rem; color:#94a3b8;">🎟️ 你的彩券</div>' +
                            '<div id="lot-my-count" style="font-size:1.35rem; font-weight:bold; ' +
                                    'color:#00e5ff; line-height:1.3;">' + myTickets.length + ' 張</div>' +
                            '<div style="font-size:0.66rem; color:#64748b;">單價 ' + fmt(cfg.ticketPrice) + ' 兩</div>' +
                        '</div>' +
                        '<div style="text-align:center; min-width:110px;">' +
                            '<div style="font-size:0.74rem; color:#94a3b8;">🪙 你的紋銀</div>' +
                            '<div id="lot-gold" style="font-size:1.35rem; font-weight:bold; ' +
                                    'color:#fbbf24; line-height:1.3;">' + fmt(gold) + ' 兩</div>' +
                            '<div id="lot-sold" style="font-size:0.66rem; color:#64748b;">' +
                                '本期售出 ' + fmt(sold.amount) + ' 兩</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // ② 選號區
                '<div style="background:#121822; border:1px solid #2e3b4e; border-radius:6px; ' +
                        'padding:12px; margin-bottom:14px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                            'flex-wrap:wrap; gap:8px; margin-bottom:9px;">' +
                        '<strong style="color:#fbbf24; font-size:0.9rem;">' +
                            '🎯 選號區（自選 ' + cfg.pickCount + ' 個號碼 1~' + cfg.numberMax + '）</strong>' +
                        '<span style="font-size:0.8rem; color:' +
                            (this.picked.length === cfg.pickCount ? '#4ade80' : '#94a3b8') + ';">' +
                            '已選 ' + this.picked.length + ' / ' + cfg.pickCount + '</span>' +
                    '</div>' +
                    '<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:5px; margin-bottom:11px;">' +
                        gridHtml + '</div>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<button id="lot-btn-random" class="action-btn" ' +
                                'style="border-color:#38bdf8; color:#7dd3fc;">🎲 電腦選號</button>' +
                        '<button id="lot-btn-clear" class="action-btn">🧹 清除重選</button>' +
                        '<button id="lot-btn-buy" class="btn-primary" style="padding:8px 20px;" ' +
                            (this.picked.length === cfg.pickCount ? '' : 'disabled') + '>' +
                            '🎟️ 購買彩券（' + fmt(cfg.ticketPrice) + ' 兩）</button>' +
                    '</div>' +
                '</div>' +

                // ③ 可折疊：你的彩券
                this.buildSec('mytickets',
                    '<span id="lot-mytickets-title">🎫 你的彩券（本期）</span>' +
                    ' <span id="lot-mytickets-badge" style="color:#00e5ff; font-size:0.78rem;">' +
                        myTickets.length + ' 張</span>',
                    '#00e5ff',
                    this.myTicketsHtml(myTickets)
                ) +

                // ④ 可折疊：購買名單（⭐ 捲動容器固定 id）
                this.buildSec('buyers',
                    '<span id="lot-buyers-title">👥 本期購買名單（' + buyers.length + ' 人）</span>',
                    '#c084fc',
                    '<div id="lot-buyers-scroll">' + this.buyersHtml(buyers) + '</div>'
                ) +

                // ⑤ 上一期
                '<div style="background:#121822; border:1px solid #2e3b4e; border-radius:6px; ' +
                        'padding:12px; margin-bottom:14px;">' +
                    '<div style="font-size:0.85rem; color:#fbbf24; font-weight:bold; margin-bottom:8px;">' +
                        '📣 上一期開獎結果</div>' + lastHtml +
                '</div>' +

                // ⑥ 可折疊：獎項與規則
                this.buildSec('prizes', '📋 獎項與規則說明', '#94a3b8', prizesInner) +

                // ⑦ 可折疊：歷史
                this.buildSec('history',
                    '📜 歷史開獎紀錄（共 ' + (L.history ? L.history.length : 0) + ' 期）',
                    '#64748b', histHtml);

            this.restoreSecState(secSnap);
            this.bindPanelEvents(panel, cfg, sys);
        }

        bindPanelEvents(panel, cfg, sys) {
            var self = this;

            panel.querySelectorAll('.lot-num').forEach(function (el) {
                el.addEventListener('click', function () {
                    var n = parseInt(el.getAttribute('data-num'), 10);
                    var idx = self.picked.indexOf(n);
                    if (idx !== -1) {
                        self.picked.splice(idx, 1);
                    } else {
                        if (self.picked.length >= cfg.pickCount) {
                            self.flash('⚠️ 最多只能選 ' + cfg.pickCount + ' 個號碼', '#fbbf24');
                            return;
                        }
                        self.picked.push(n);
                    }
                    self.picked.sort(function (a, b) { return a - b; });
                    self.render();
                });
            });

            var b1 = panel.querySelector('#lot-btn-random');
            if (b1) b1.addEventListener('click', function () {
                self.picked = sys.pickNumbers(); self.render();
            });

            var b2 = panel.querySelector('#lot-btn-clear');
            if (b2) b2.addEventListener('click', function () {
                self.picked = []; self.render();
            });

            var b3 = panel.querySelector('#lot-btn-buy');
            if (b3) b3.addEventListener('click', function () { self.doBuy(); });
        }

        // ⭐ v4：購票後只在必要時重建一次（避免 render 兩次造成閃爍）
        doBuy() {
            var cfg = this.sys.cfg;
            if (this.picked.length !== cfg.pickCount) {
                this.flash('⚠️ 請先選滿 ' + cfg.pickCount + ' 個號碼', '#fbbf24');
                return;
            }
            var res = this.sys.buyTicket(this.picked);
            if (res.ok) {
                this.flash('✅ 購票成功！+' + fmt(res.contribution) + ' 兩已注入彩池', '#4ade80');
                if (this.app.renderAll) {
                    this.app.renderAll();   // 會連帶觸發本面板的 render()
                } else {
                    this.render();
                }
            } else if (res.reason === 'no_gold') {
                this.flash('❌ 紋銀不足（需 ' + fmt(res.need) + ' 兩，你有 ' + fmt(res.have) + ' 兩）', '#f87171');
            } else {
                this.flash('⚠️ 購票失敗（' + res.reason + '）', '#f87171');
            }
        }

        ballsHtml(numbers, special, hitSet, specialHit) {
            var out = numbers.map(function (n) {
                var hit = hitSet && hitSet.indexOf(n) !== -1;
                return '<span class="lot-ball' + (hit ? ' hit' : '') + '">' + pad2(n) + '</span>';
            }).join('');
            if (typeof special === 'number') {
                out += '<span style="color:#64748b; margin:0 6px; font-size:0.78rem;">+ 特別號</span>';
                out += '<span class="lot-ball special' + (specialHit ? ' hit' : '') + '">' + pad2(special) + '</span>';
            }
            return out;
        }

        // ══════════════════════════════════════════════
        //  提醒彈窗
        // ══════════════════════════════════════════════
        showRemind(remainMs) {
            if (this.remindEl) return;
            var L = this.sys.getState();
            var myTickets = this.sys.getMyTickets();
            var sec = Math.max(1, Math.ceil(remainMs / 1000));

            var el = document.createElement('div');
            el.id = 'hy-lottery-remind';
            el.style.cssText =
                'position:fixed; inset:0; background:rgba(0,0,0,0.82); z-index:100002; ' +
                'display:flex; align-items:center; justify-content:center; padding:16px;';

            el.innerHTML =
                '<div style="background:#0f141c; border:2px solid #fbbf24; border-radius:10px; ' +
                        'max-width:460px; width:100%; padding:22px; text-align:center; ' +
                        'box-shadow:0 0 40px rgba(251,191,36,0.5); ' +
                        'font-family:\'Microsoft JhengHei\',\'PingFang TC\',sans-serif; color:#e2e8f0;">' +
                    '<div style="font-size:3rem; line-height:1.1; margin-bottom:8px;">🎟️</div>' +
                    '<h3 style="margin:0 0 8px; color:#fbbf24; font-size:1.2rem;">大樂透即將開獎！</h3>' +
                    '<p style="margin:0 0 14px; font-size:0.9rem; color:#cbd5e1; line-height:1.6;">' +
                        '距離開獎只剩 <strong id="hy-lot-remind-sec" style="color:#f43f5e; font-size:1.15rem;">' +
                            sec + '</strong> 秒<br>' +
                        '你本期已購買 <strong style="color:#00e5ff;">' + myTickets.length + '</strong> 張彩券</p>' +
                    '<div style="background:#121822; border-radius:6px; padding:10px; margin-bottom:14px;">' +
                        '<div style="font-size:0.76rem; color:#94a3b8; margin-bottom:4px;">💰 目前彩池</div>' +
                        '<div style="font-size:1.3rem; font-weight:bold; color:#4ade80;">' + fmt(L.pool) + ' 兩</div>' +
                    '</div>' +
                    '<button id="hy-lot-remind-close" class="btn-primary" style="padding:9px 26px;">知道了</button>' +
                    '<div style="font-size:0.7rem; color:#64748b; margin-top:10px;">（此視窗 20 秒後自動關閉）</div>' +
                '</div>';

            document.body.appendChild(el);
            this.remindEl = el;

            var self = this;
            var cdEl = el.querySelector('#hy-lot-remind-sec');
            var cdTimer = setInterval(function () {
                var r = self.sys.getCountdown();
                if (r <= 0) { clearInterval(cdTimer); self.closeRemind(); return; }
                if (cdEl) cdEl.textContent = Math.ceil(r / 1000);
            }, 500);

            el.querySelector('#hy-lot-remind-close').addEventListener('click', function () {
                clearInterval(cdTimer); self.closeRemind();
            });
            setTimeout(function () { clearInterval(cdTimer); self.closeRemind(); }, 20000);
        }

        closeRemind() {
            if (!this.remindEl) return;
            if (this.remindEl.parentNode) this.remindEl.parentNode.removeChild(this.remindEl);
            this.remindEl = null;
        }

        // ══════════════════════════════════════════════
        //  開獎結果彈窗
        // ══════════════════════════════════════════════
        showDrawResult(record) {
            if (!record) return;
            var win = record.totalPayout > 0;
            var titleColor = win ? '#4ade80' : '#94a3b8';
            var titleIcon = record.jackpotCount > 0 ? '🏆' : (win ? '🎉' : '😢');
            var titleText = record.jackpotCount > 0 ? '頭獎！！！' : (win ? '恭喜中獎' : '本期未中獎');

            var myResult = (record.myTickets && record.myTickets.length > 0)
                ? record.myTickets.map(function (t) {
                    var prizeTxt = t.prize
                        ? '<span style="color:' + t.prize.color + '; font-weight:bold;">' +
                            t.prize.label + ' +' + fmt(t.payout) + ' 兩</span>'
                        : '<span style="color:#64748b;">未中獎</span>';
                    return '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:0.8rem;">' +
                        '<span style="font-family:monospace; color:#94a3b8;">' +
                            t.numbers.map(pad2).join(' ') +
                            ' <span style="color:#64748b;">(中 ' + t.match + ' 碼' + (t.hasSpecial ? '+特' : '') + ')</span>' +
                        '</span><span>' + prizeTxt + '</span></div>';
                }).join('')
                : '<div style="color:#64748b; font-size:0.78rem;">本期你未購票。</div>';

            var el = document.createElement('div');
            el.id = 'hy-lottery-result';
            el.style.cssText =
                'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:100002; ' +
                'display:flex; align-items:center; justify-content:center; padding:16px;';

            el.innerHTML =
                '<div style="background:#0f141c; border:2px solid ' + titleColor + '; border-radius:10px; ' +
                        'max-width:500px; width:100%; padding:22px; ' +
                        'box-shadow:0 0 40px rgba(' + (win ? '74,222,128' : '100,116,139') + ',0.4); ' +
                        'font-family:\'Microsoft JhengHei\',\'PingFang TC\',sans-serif; color:#e2e8f0;">' +
                    '<div style="text-align:center; margin-bottom:14px;">' +
                        '<div style="font-size:2.6rem; line-height:1.1;">' + titleIcon + '</div>' +
                        '<h3 style="margin:6px 0 0; color:' + titleColor + '; font-size:1.15rem;">' + titleText + '</h3>' +
                    '</div>' +
                    '<div style="background:#121822; border-radius:6px; padding:11px; margin-bottom:12px; text-align:center;">' +
                        '<div style="font-size:0.76rem; color:#94a3b8; margin-bottom:6px;">本期開獎號碼</div>' +
                        this.ballsHtml(record.numbers, record.special, null, false) +
                    '</div>' +
                    '<div style="background:#121822; border-radius:6px; padding:11px; margin-bottom:12px;">' +
                        '<div style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px;">🎫 你的彩券</div>' +
                        myResult + '</div>' +
                    '<div style="text-align:center; font-size:0.82rem; padding:8px; ' +
                            'background:#0d1219; border-radius:5px;">' +
                        '💰 彩池結餘：<strong style="color:#fbbf24;">' + fmt(record.poolAfter) + '</strong> 兩</div>' +
                    '<div style="text-align:center; margin-top:16px;">' +
                        '<button id="hy-lot-result-close" class="btn-primary" style="padding:9px 30px;">知道了</button>' +
                    '</div>' +
                '</div>';

            document.body.appendChild(el);
            el.querySelector('#hy-lot-result-close').addEventListener('click', function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            el.addEventListener('click', function (e) {
                if (e.target === el && el.parentNode) el.parentNode.removeChild(el);
            });
        }

        // ══════════════════════════════════════════════
        //  小提示
        // ══════════════════════════════════════════════
        flash(text, color) {
            var old = document.getElementById('hy-lot-flash');
            if (old && old.parentNode) old.parentNode.removeChild(old);

            var el = document.createElement('div');
            el.id = 'hy-lot-flash';
            el.style.cssText =
                'position:fixed; left:50%; top:80px; transform:translateX(-50%); z-index:100003; ' +
                'background:rgba(15,20,28,0.96); border:1px solid ' + (color || '#4ade80') + '; ' +
                'border-radius:6px; padding:9px 18px; font-size:0.86rem; color:' + (color || '#4ade80') + '; ' +
                'font-family:\'Microsoft JhengHei\',\'PingFang TC\',sans-serif; ' +
                'box-shadow:0 0 18px rgba(0,0,0,0.6); pointer-events:none;';
            el.textContent = text;
            document.body.appendChild(el);
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
        }
    }

    function bootUI() {
        var game = window.HY.game;
        if (!game) { setTimeout(bootUI, 200); return; }

        if (!game.lotterySys && window.HY.LotterySystem) {
            try { game.lotterySys = new window.HY.LotterySystem(game); }
            catch (e) { console.error('[uiLottery] ✗ 補建 lotterySys 失敗：', e); }
        }
        if (!window.HY.uiLottery && window.HY.UILottery) {
            window.HY.uiLottery = new window.HY.UILottery(game);
        }
    }

    window.addEventListener('DOMContentLoaded', function () { setTimeout(bootUI, 340); });
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(bootUI, 360);
    }

    window.HY.UILottery = UILottery;
})();