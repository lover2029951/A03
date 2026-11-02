// js/lotterySystem.js  (v5)
// ═══════════════════════════════════════════════════════════════════════════
//  🎟️ 大樂透核心系統（仿台灣大樂透）
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ 【這個檔案負責什麼】                                                  │
//  │   • 期別循環（每 30 分鐘開獎一次，使用「真實時間」不受遊戲加速影響）      │
//  │   • 玩家購票（自選 6 碼 / 電腦選號，單價 100 兩）                       │
//  │   • 虛擬名人自動購買（每期 10~30 位，全額注入彩池）                      │
//  │   • 開獎、對獎、派彩、彩池累積                                          │
//  │   • 開獎前 1 分鐘提醒（僅在玩家本期有購票時）                            │
//  │   • 完整狀態存取（含離線期間的補開獎）                                   │
//  │                                                                     │
//  │ 【這個檔案「不」負責什麼】                                              │
//  │   • 任何 DOM 操作 → 由 uiLottery.js 負責                              │
//  │   • 名人資料本體 → 由 lotteryCelebData.js / 2.js / 3.js 提供            │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  【版本沿革】
//    v5  每期名人數改為 10~30 位（原 4~10）；全檔補註解
//    v4  getBuyers() 改「時間序」+ 穩定 key（修名單跳動）
//    v3  名人資料合併三批（360 位）；全部買過自動重置
//    v2  補上實例化（v1 只匯出類別 → UI 拿不到實例）
// ═══════════════════════════════════════════════════════════════════════════

window.HY = window.HY || {};

(function () {

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  ① 可調設定                                                       ║
    // ║     改這裡就能調整玩法；Console 可用 HY.game.lotterySys.cfg 檢視    ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    var DEFAULT_CFG = {

        // ── 總開關 ──
        enabled: true,                  // false = 完全停用（不產生名人購買、不開獎）

        // ── 彩券規格 ──
        ticketPrice: 100,               // 每張彩券價格（兩紋銀）
        pickCount: 6,                   // 每張選幾個號碼
        numberMax: 49,                  // 號碼範圍 1 ~ N

        // ── 時間軸 ──
        drawIntervalMs: 30 * 60 * 1000, // 開獎週期（30 分鐘 = 1,800,000 ms）
        remindBeforeMs: 60 * 1000,      // 開獎前多久彈提醒（1 分鐘）

        // ── 彩池 ──
        poolContributionPct: 0.60,      // 玩家購票時，票價的多少比例注入彩池
                                        //   0.60 = 60%（其餘 40% 視為莊家抽成）
                                        //   ⚠️ 名人購買為 100% 全額注入，不受此設定影響

        // ── ⭐ v5：虛擬名人購買頻率 ──
        //    每一期（30 分鐘）隨機抽 N 位名人購買
        //    10~30 位 → 名單會快速填充，故 UI 改為方形磁磚呈現
        npcPerRoundMin: 10,             // 每期最少幾位名人
        npcPerRoundMax: 30,             // 每期最多幾位名人

        // ── 名人重複規則 ──
        npcRepeatable: false,           // false = 每位名人「一生只買一次」（預設）
                                        // true  = 可重複購買（等同無限名人池）

        // ⭐ v5：全部買過後自動重置
        //   360 位 × 每期 10~30 位 → 約 12~36 期就會全部買完
        //   開啟此項 → 買完後自動開啟新一輪，彩池持續成長不會停滯
        npcRecycleWhenExhausted: true,

        // ── 歷史紀錄 ──
        historyKeep: 20,                // 最多保留幾期開獎紀錄（供 UI 歷史面板）

        // ── 彩池分配比例 ──
        //   頭獎 + 貳獎 = 100%（其餘獎項為固定金額，不佔彩池）
        jackpotPctOfPool: 0.85,         // 頭獎從彩池拿走 85%
        secondPctOfPool: 0.15           // 貳獎從彩池拿走 15%
                                        // ⚠️ 頭獎無人中獎時，該期彩池「完整保留」不發放
    };

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  ② 獎項表                                                         ║
    // ║     由上而下依序判定，先中先得（6碼全中 → 頭獎，不再往下判定）        ║
    // ║     欄位說明：                                                     ║
    // ║       match       = 需對中幾個「正取號碼」                           ║
    // ║       needSpecial = 是否還需對中「特別號」                           ║
    // ║       type 'pool'  = 獎金由彩池按比例分配（多人中獎則均分）           ║
    // ║       type 'fixed' = 固定金額                                       ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    var PRIZE_TABLE = [
        { key: 'jackpot', label: '🏆 頭獎', desc: '對中 6 碼',
          match: 6, needSpecial: false, type: 'pool',  color: '#f43f5e' },

        { key: 'second',  label: '🥈 貳獎', desc: '對中 5 碼+特別號',
          match: 5, needSpecial: true,  type: 'pool',  color: '#fbbf24' },

        { key: 'third',   label: '🥉 參獎', desc: '對中 5 碼',
          match: 5, needSpecial: false, type: 'fixed', amount: 20000, color: '#f97316' },

        { key: 'fourth',  label: '🎖️ 肆獎', desc: '對中 4 碼+特別號',
          match: 4, needSpecial: true,  type: 'fixed', amount: 8000,  color: '#a78bfa' },

        { key: 'fifth',   label: '🎖️ 伍獎', desc: '對中 4 碼',
          match: 4, needSpecial: false, type: 'fixed', amount: 2000,  color: '#38bdf8' },

        { key: 'sixth',   label: '🎗️ 陸獎', desc: '對中 3 碼+特別號',
          match: 3, needSpecial: true,  type: 'fixed', amount: 800,   color: '#34d399' },

        { key: 'seventh', label: '🎗️ 柒獎', desc: '對中 2 碼+特別號',
          match: 2, needSpecial: true,  type: 'fixed', amount: 400,   color: '#4ade80' },

        { key: 'consol',  label: '🍀 普獎', desc: '對中 3 碼',
          match: 3, needSpecial: false, type: 'fixed', amount: 400,   color: '#94a3b8' }
    ];

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  ③ 通用工具                                                       ║
    // ╚═══════════════════════════════════════════════════════════════════╝

    // 取 [min, max] 範圍內的隨機整數（含頭尾）
    function randInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    // 千分位數字格式化（1,234,567）
    function fmt(n) {
        return Math.floor(n || 0).toLocaleString();
    }

    // 兩位數補零（7 → "07"）
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    // Fisher–Yates 原地洗牌（比 sort(()=>Math.random()-0.5) 均勻）
    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  ④ 主系統                                                         ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    class LotterySystem {

        // ────────────────────────────────────────────
        //  建構子
        // ────────────────────────────────────────────
        constructor(app) {
            // app = GameApp 實例（用於 charSys / logger）
            this.app = app;

            // 複製預設設定（避免外部直接改到 DEFAULT_CFG）
            this.cfg = Object.assign({}, DEFAULT_CFG);

            this.timer = null;              // 秒級心跳計時器
            this.TICK_MS = 1000;            // 心跳間隔（1 秒）

            // ── 三個 UI 回呼（由 uiLottery.js 註冊）──
            this.onChange = null;           // 狀態變動（名人購買 / 購票）
                                            //   ⚠️ v4 起 UI 改走局部更新，不重建 DOM
            this.onDraw = null;             // 開獎完成（含完整紀錄物件）
            this.onRemind = null;           // 開獎前提醒（傳入剩餘毫秒）

            // 初始化
            this.ensureState();             // 確保存檔欄位齊全
            this.ensureRound();             // 確保期別正確（含離線補開）
            this.startTicker();             // 啟動心跳

            var total = this.getAllCelebs().length;
            console.log('[lotterySystem] ✓ 已啟動（每 ' +
                Math.round(this.cfg.drawIntervalMs / 60000) + ' 分鐘開獎，單價 ' +
                this.cfg.ticketPrice + ' 兩，名人池 ' + total + ' 位，每期 ' +
                this.cfg.npcPerRoundMin + '~' + this.cfg.npcPerRoundMax + ' 位）');
        }

        // ────────────────────────────────────────────
        //  ⭐ 取得全部名人（合併三批資料檔）
        //     資料來源：
        //       HY.Data.LOTTERY_CELEBS     ← lotteryCelebData.js  （60 位）
        //       HY.Data.LOTTERY_CELEBS_V2  ← lotteryCelebData2.js （150 位，中華）
        //       HY.Data.LOTTERY_CELEBS_V3  ← lotteryCelebData3.js （150 位，西洋）
        //     合計 360 位
        // ────────────────────────────────────────────
        getAllCelebs() {
            var Data = window.HY.Data;
            if (!Data) return [];
            var out = [];
            if (Array.isArray(Data.LOTTERY_CELEBS))    out = out.concat(Data.LOTTERY_CELEBS);
            if (Array.isArray(Data.LOTTERY_CELEBS_V2)) out = out.concat(Data.LOTTERY_CELEBS_V2);
            if (Array.isArray(Data.LOTTERY_CELEBS_V3)) out = out.concat(Data.LOTTERY_CELEBS_V3);
            return out;
        }

        // ────────────────────────────────────────────
        //  狀態初始化 / 正規化
        //  存放位置：charSys.rootState.lottery
        //  隨存檔一起保存
        // ────────────────────────────────────────────
        ensureState() {
            var root = this.app.charSys.rootState;
            if (!root.lottery || typeof root.lottery !== 'object') root.lottery = {};
            var L = root.lottery;

            // ── 時間戳 ──
            if (typeof L.nextDrawTs !== 'number') L.nextDrawTs = 0;         // 下期開獎時間
            if (typeof L.lastDrawTs !== 'number') L.lastDrawTs = 0;         // 上期開獎時間

            // ── 彩池 ──
            if (typeof L.pool !== 'number') L.pool = 0;                     // 目前累積彩池（兩）

            // ── 提醒去重（避免同一期重複彈窗）──
            if (typeof L.remindedDrawTs !== 'number') L.remindedDrawTs = 0;

            // ── 陣列欄位 ──
            if (!Array.isArray(L.tickets)) L.tickets = [];                  // 玩家彩券（跨期暫存）
            if (!Array.isArray(L.npcEntries)) L.npcEntries = [];            // 本期已購買名人
            if (!Array.isArray(L.npcSchedule)) L.npcSchedule = [];          // 本期待購買排程
            if (!Array.isArray(L.npcBoughtIds)) L.npcBoughtIds = [];        // 歷史已買過的名人 id
            if (!Array.isArray(L.history)) L.history = [];                  // 開獎歷史（倒序）

            // ── 統計 ──
            if (!L.stats || typeof L.stats !== 'object') L.stats = {};
            ['spent', 'won', 'bought', 'jackpots', 'best'].forEach(function (k) {
                if (typeof L.stats[k] !== 'number') L.stats[k] = 0;
            });
            // spent    = 累計投入（兩）
            // won      = 累計贏得（兩）
            // bought   = 累計購買張數
            // jackpots = 累計中頭獎次數
            // best     = 單張最高獎金（兩）

            return L;
        }

        // 取得狀態（供 UI 讀取）
        getState() { return this.ensureState(); }

        // 取得距離開獎剩餘毫秒
        getCountdown() {
            return Math.max(0, this.ensureState().nextDrawTs - Date.now());
        }

        // 取得獎項表（供 UI 渲染）
        getPrizes() { return PRIZE_TABLE; }

        // ────────────────────────────────────────────
        //  期別管理
        //  處理「離線期間該開而未開的獎」
        // ────────────────────────────────────────────
        ensureRound() {
            var L = this.ensureState();
            var now = Date.now();

            // ① 首次進入（尚無期別）→ 直接開新局
            if (!L.nextDrawTs || L.nextDrawTs <= 0) {
                this.startNewRound(now, true);
                return;
            }

            // ② 計算有幾期已過期（上限 50 期，避免極端離線卡死）
            var pending = 0;
            var t = L.nextDrawTs;
            while (t <= now && pending < 50) { pending++; t += this.cfg.drawIntervalMs; }

            // ③ 逐期補開（只有最後一期會寫日誌與彈窗，中間的靜默處理）
            for (var i = 0; i < pending; i++) {
                var quiet = (pending > 1 && i < pending - 1);
                this.doDraw(L.nextDrawTs, quiet);
            }

            // ④ 極端情況：離線超過 50 期 → 強制跳到最近的期別
            if (L.nextDrawTs <= now) {
                var missed = Math.floor((now - L.nextDrawTs) / this.cfg.drawIntervalMs) + 1;
                L.nextDrawTs += missed * this.cfg.drawIntervalMs;
                L.npcEntries = [];
                L.npcSchedule = [];
                L.tickets = [];
                this.startNewRound(L.nextDrawTs - this.cfg.drawIntervalMs, true);
            }
        }

        // ────────────────────────────────────────────
        //  開始新一期
        //    fromTs : 上一期開獎時間（新期別 = fromTs + 週期）
        //    silent : true = 不觸發 onChange（用於初始化 / 開獎內部呼叫）
        // ────────────────────────────────────────────
        startNewRound(fromTs, silent) {
            var L = this.ensureState();

            L.nextDrawTs = fromTs + this.cfg.drawIntervalMs;   // 下期開獎時刻
            L.npcEntries = [];                                 // 清空本期名人購買
            L.remindedDrawTs = 0;                              // 重設提醒去重標記

            // 保留「未過期」的彩券（理論上應為空，防禦性處理）
            L.tickets = L.tickets.filter(function (t) {
                return t.drawTs > fromTs;
            });

            // 產生本期名人購買排程
            L.npcSchedule = this.buildNpcSchedule(fromTs, L.nextDrawTs);

            if (!silent && typeof this.onChange === 'function') this.onChange();
        }

        // ────────────────────────────────────────────
        //  ⭐ 建立名人購買時程
        //
        //  ① 從「尚未購買」的名人中隨機抽 N 位
        //     N = npcPerRoundMin ~ npcPerRoundMax（v5：10 ~ 30）
        //     若全部都買過 → 依 npcRecycleWhenExhausted 決定是否重置
        //
        //  ② 為每位名人決定：
        //     - 金額（依其身價 spend: [min, max] 隨機）
        //     - 購買時刻 atTs（散布在 [startTs, endTs] 的 4%~94% 區間）
        //     - 隨機 6 碼（僅供開獎對照顯示，不參與派彩）
        //
        //  ③ 依 atTs 升序排列，讓 schedule 天然就是時間序
        // ────────────────────────────────────────────
        buildNpcSchedule(startTs, endTs) {
            var L = this.ensureState();
            var celebs = this.getAllCelebs();
            if (celebs.length === 0) return [];

            // ── 可用名人池 ──
            var available;
            if (this.cfg.npcRepeatable) {
                // 允許重複 → 直接用全部
                available = celebs;
            } else {
                // 不可重複 → 過濾掉已買過的
                available = celebs.filter(function (c) {
                    return L.npcBoughtIds.indexOf(c.id) === -1;
                });

                // ⭐ 全部買完 → 自動重置（開啟新一輪贊助）
                if (available.length === 0 && this.cfg.npcRecycleWhenExhausted) {
                    L.npcBoughtIds = [];
                    available = celebs.slice();
                    this.app.logger.add('🎟️ 【大樂透】世界名人完成一輪贊助，開始新一輪搶購！', 'wealth');
                }
            }
            if (available.length === 0) return [];

            // ── 洗牌後取前 N 位 ──
            shuffle(available);

            var n = randInt(this.cfg.npcPerRoundMin, this.cfg.npcPerRoundMax);
            n = Math.max(0, Math.min(n, available.length));

            // ── 時間散布區間 ──
            var span = Math.max(1, endTs - startTs);

            var out = [];
            for (var i = 0; i < n; i++) {
                var c = available[i];
                var lo = (c.spend && c.spend[0]) ? c.spend[0] : 100;   // 身價下限
                var hi = (c.spend && c.spend[1]) ? c.spend[1] : 1000;  // 身價上限

                out.push({
                    celebId: c.id,
                    name:    c.name,
                    icon:    c.icon,
                    title:   c.title,
                    amount:  randInt(lo, hi),
                    // 落在期別的 4% ~ 94% 之間（避免一開期就全買完）
                    atTs:    startTs + Math.floor(span * (0.04 + Math.random() * 0.90)),
                    numbers: this.pickNumbers()
                });
            }

            // 依購買時刻升序（讓 UI 名單天然時間序）
            out.sort(function (a, b) { return a.atTs - b.atTs; });
            return out;
        }

        // ────────────────────────────────────────────
        //  處理到期的名人購買
        //    nowTs    : 現在時刻
        //    forceAll : true = 忽略 atTs，全部立即執行（開獎前結算用）
        //  回傳本次執行幾筆
        // ────────────────────────────────────────────
        processNpcSchedule(nowTs, forceAll) {
            var L = this.ensureState();
            if (!L.npcSchedule || L.npcSchedule.length === 0) return 0;

            var remaining = [];
            var done = 0;

            for (var i = 0; i < L.npcSchedule.length; i++) {
                var e = L.npcSchedule[i];
                if (forceAll || e.atTs <= nowTs) {
                    // 移到「已購買」清單
                    L.npcEntries.push({
                        id: e.celebId,
                        name: e.name,
                        icon: e.icon,
                        title: e.title,
                        amount: e.amount,
                        atTs: e.atTs,
                        numbers: e.numbers
                    });

                    // ⭐ 全額注入彩池（名人不受 poolContributionPct 影響）
                    L.pool += e.amount;

                    // 記錄「已買過」（用於不可重複模式）
                    if (L.npcBoughtIds.indexOf(e.celebId) === -1) {
                        L.npcBoughtIds.push(e.celebId);
                    }
                    done++;
                } else {
                    remaining.push(e);
                }
            }

            L.npcSchedule = remaining;
            return done;
        }

        // ────────────────────────────────────────────
        //  號碼產生
        // ────────────────────────────────────────────

        // 產生一組不重複的 pickCount 個號碼（已排序）
        pickNumbers() {
            var max = this.cfg.numberMax;
            var count = this.cfg.pickCount;
            var out = [];
            var used = {};
            var guard = 0;

            while (out.length < count && guard < 2000) {
                guard++;
                var n = randInt(1, max);
                if (used[n]) continue;
                used[n] = true;
                out.push(n);
            }

            out.sort(function (a, b) { return a - b; });
            return out;
        }

        // 產生特別號（不與正取號碼重複）
        pickSpecial(drawn) {
            var n = 0, guard = 0;
            do {
                n = randInt(1, this.cfg.numberMax);
                guard++;
            } while (drawn.indexOf(n) !== -1 && guard < 500);
            return n;
        }

        // 計算一張彩券對中幾個正取號碼
        countMatch(ticketNumbers, drawn) {
            var c = 0;
            for (var i = 0; i < ticketNumbers.length; i++) {
                if (drawn.indexOf(ticketNumbers[i]) !== -1) c++;
            }
            return c;
        }

        // 依「對中數 + 是否有特別號」查出獎項
        //   回傳 PRIZE_TABLE 的項目，或 null（未中獎）
        resolvePrize(match, hasSpecial) {
            for (var i = 0; i < PRIZE_TABLE.length; i++) {
                var p = PRIZE_TABLE[i];
                if (p.match !== match) continue;
                if (p.needSpecial && !hasSpecial) continue;
                return p;
            }
            return null;
        }

        // ────────────────────────────────────────────
        //  玩家購票
        // ────────────────────────────────────────────

        // 取得「本期」的玩家彩券
        getMyTickets() {
            var L = this.ensureState();
            var drawTs = L.nextDrawTs;
            return L.tickets.filter(function (t) { return t.drawTs === drawTs; });
        }

        // 檢查某期玩家是否有購票（用於提醒判定）
        hasPlayerTicketForDraw(drawTs) {
            return this.ensureState().tickets.some(function (t) {
                return t.drawTs === drawTs;
            });
        }

        // 購買彩券
        //   回傳 { ok:true, ticket, contribution }
        //   或   { ok:false, reason:'...' }（reason 供 UI 顯示對應提示）
        buyTicket(numbers) {
            var L = this.ensureState();
            var cfg = this.cfg;

            if (!cfg.enabled) return { ok: false, reason: 'disabled' };

            // ── 驗證號碼 ──
            if (!numbers || numbers.length !== cfg.pickCount) {
                return { ok: false, reason: 'need_numbers' };
            }

            var seen = {};
            for (var i = 0; i < numbers.length; i++) {
                var n = numbers[i];
                if (typeof n !== 'number' || n < 1 || n > cfg.numberMax) {
                    return { ok: false, reason: 'bad_number' };
                }
                if (seen[n]) return { ok: false, reason: 'duplicate' };
                seen[n] = true;
            }

            var nums = numbers.slice().sort(function (a, b) { return a - b; });

            // ── 驗證銀兩 ──
            var gold = this.app.charSys.rootState.gold;
            if (gold < cfg.ticketPrice) {
                return { ok: false, reason: 'no_gold', need: cfg.ticketPrice, have: gold };
            }

            // ── 扣款 ──
            this.app.charSys.rootState.gold -= cfg.ticketPrice;

            // ── 注入彩池（玩家為部分比例）──
            var contribution = Math.floor(cfg.ticketPrice * cfg.poolContributionPct);
            L.pool += contribution;

            // ── 建立彩券並存入 ──
            var ticket = {
                uid:      'lt_' + Date.now() + '_' + randInt(10000, 99999),
                numbers:  nums,
                drawTs:   L.nextDrawTs,       // 所屬期別
                boughtTs: Date.now(),         // 購買時刻（供名單時間序用）
                price:    cfg.ticketPrice
            };
            L.tickets.push(ticket);

            // ── 統計 ──
            L.stats.spent += cfg.ticketPrice;
            L.stats.bought += 1;

            // ── 日誌 ──
            this.app.logger.add(
                '🎟️ 購買大樂透彩券（' + fmt(cfg.ticketPrice) + ' 兩）：' +
                nums.map(pad2).join(' ') +
                '（' + fmt(contribution) + ' 兩已注入彩池）',
                'wealth'
            );

            // ── 通知 UI（局部更新，不重建 DOM）──
            if (typeof this.onChange === 'function') this.onChange();

            return { ok: true, ticket: ticket, contribution: contribution };
        }

        // ────────────────────────────────────────────
        //  ⭐ 開獎（核心流程）
        //    drawTs : 開獎時刻
        //    quiet  : true = 不寫日誌、不觸發 onDraw（離線補開用）
        // ────────────────────────────────────────────
        doDraw(drawTs, quiet) {
            var self = this;
            var L = this.ensureState();

            // ── ① 先結算本期所有名人購買（含離線期間未執行的）──
            this.processNpcSchedule(drawTs, true);

            // ── ② 抽出 6 個正取號碼 + 1 個特別號 ──
            var numbers = this.pickNumbers();
            var special = this.pickSpecial(numbers);

            // ── ③ 取出本期玩家彩券，並從 tickets 移除 ──
            var myTickets = L.tickets.filter(function (t) { return t.drawTs === drawTs; });
            L.tickets = L.tickets.filter(function (t) { return t.drawTs !== drawTs; });

            // ── ④ 對獎 ──
            var evaluated = myTickets.map(function (t) {
                var m = self.countMatch(t.numbers, numbers);
                var hasSpecial = t.numbers.indexOf(special) !== -1;
                return {
                    uid:        t.uid,
                    numbers:    t.numbers.slice(),
                    match:      m,
                    hasSpecial: hasSpecial,
                    prize:      self.resolvePrize(m, hasSpecial),   // null = 未中獎
                    payout:     0                                    // 稍後填入
                };
            });

            // ── ⑤ 統計頭獎 / 貳獎得主數（用於均分彩池）──
            var jackpotCount = 0, secondCount = 0;
            evaluated.forEach(function (e) {
                if (!e.prize) return;
                if (e.prize.key === 'jackpot') jackpotCount++;
                else if (e.prize.key === 'second') secondCount++;
            });

            // ── ⑥ 彩池分配計算 ──
            var poolBefore = L.pool;
            var jackpotShare = Math.floor(L.pool * this.cfg.jackpotPctOfPool);
            var secondShare  = Math.floor(L.pool * this.cfg.secondPctOfPool);
            var perJackpot = jackpotCount > 0 ? Math.floor(jackpotShare / jackpotCount) : 0;
            var perSecond  = secondCount  > 0 ? Math.floor(secondShare  / secondCount)  : 0;

            // ── ⑦ 逐張派彩 ──
            var totalPayout = 0;
            evaluated.forEach(function (e) {
                if (!e.prize) return;
                var amount = (e.prize.type === 'pool')
                    ? ((e.prize.key === 'jackpot') ? perJackpot : perSecond)
                    : (e.prize.amount || 0);
                e.payout = amount;
                totalPayout += amount;
                if (e.payout > L.stats.best) L.stats.best = e.payout;
            });

            // ⚠️ 頭獎無人中獎時：該期彩池完整保留（poolBefore 不減）
            L.pool = Math.max(0, L.pool - totalPayout);

            // ── ⑧ 加錢 + 統計 ──
            if (totalPayout > 0) {
                this.app.charSys.rootState.gold += totalPayout;
                L.stats.won += totalPayout;
            }
            L.stats.jackpots += jackpotCount;

            // ── ⑨ 名人對獎（僅供顯示，不派彩）──
            var npcResults = L.npcEntries.map(function (e) {
                var m = self.countMatch(e.numbers, numbers);
                return {
                    id: e.id, name: e.name, icon: e.icon, title: e.title,
                    amount: e.amount, atTs: e.atTs, numbers: e.numbers.slice(),
                    match: m,
                    hasSpecial: e.numbers.indexOf(special) !== -1
                };
            });

            var npcTotal = L.npcEntries.reduce(function (a, e) { return a + (e.amount || 0); }, 0);

            // ── ⑩ 組出當期紀錄物件（供歷史 / 彈窗使用）──
            var record = {
                drawTs:      drawTs,
                numbers:     numbers,
                special:     special,
                poolBefore:  poolBefore,
                poolAfter:   L.pool,
                myTickets:   evaluated,
                npcEntries:  npcResults,
                npcTotal:    npcTotal,
                totalPayout: totalPayout,
                jackpotCount: jackpotCount
            };

            // ── ⑪ 寫入歷史（靜默補開且無玩家彩券時不記錄，避免洗掉歷史）──
            if (!quiet || evaluated.length > 0) {
                L.history.unshift(record);
                if (L.history.length > this.cfg.historyKeep) {
                    L.history.length = this.cfg.historyKeep;
                }
            }

            // ── ⑫ 寫日誌（僅非靜默）──
            if (!quiet) {
                var timeText = new Date(drawTs).toLocaleTimeString('zh-TW', { hour12: false });
                this.app.logger.add(
                    '🎟️ 【大樂透開獎 ' + timeText + '】' +
                    numbers.map(pad2).join(' ') + ' ｜ 特別號 ' + pad2(special),
                    'wealth'
                );

                if (totalPayout > 0) {
                    var prizeNames = evaluated
                        .filter(function (e) { return e.payout > 0; })
                        .map(function (e) { return e.prize.label; })
                        .join('、');
                    this.app.logger.add(
                        '🎉 你的樂透中獎 ' + prizeNames + '，獲得 ' + fmt(totalPayout) + ' 兩！',
                        'wealth'
                    );
                } else if (evaluated.length > 0) {
                    this.app.logger.add(
                        '😢 本期你的 ' + evaluated.length + ' 張彩券未中獎，再接再厲！',
                        'wealth'
                    );
                }

                if (jackpotCount > 0) {
                    this.app.logger.add(
                        '🏆 恭喜獨得頭獎！彩池 ' + fmt(poolBefore) + ' 兩已入袋！',
                        'wealth'
                    );
                }
            }

            // ── ⑬ 開新一期 ──
            L.lastDrawTs = drawTs;
            this.startNewRound(drawTs, true);

            // ── ⑭ 通知 UI（彈出開獎結果視窗）──
            if (typeof this.onDraw === 'function') this.onDraw(record);

            return record;
        }

        // ────────────────────────────────────────────
        //  開獎前提醒
        //   條件：剩餘時間 ≤ remindBeforeMs
        //        且「本期玩家有購票」
        //        且「本期尚未提醒過」
        // ────────────────────────────────────────────
        checkReminder(now) {
            var L = this.ensureState();
            var remain = L.nextDrawTs - now;

            if (remain <= 0) return;                              // 已開獎
            if (remain > this.cfg.remindBeforeMs) return;         // 還沒到提醒時機
            if (L.remindedDrawTs === L.nextDrawTs) return;        // 本期已提醒過

            // ⭐ 沒買票就不提醒
            if (!this.hasPlayerTicketForDraw(L.nextDrawTs)) return;

            L.remindedDrawTs = L.nextDrawTs;
            if (typeof this.onRemind === 'function') this.onRemind(remain);
        }

        // ────────────────────────────────────────────
        //  心跳計時器（每秒）
        // ────────────────────────────────────────────
        startTicker() {
            var self = this;
            if (this.timer) clearInterval(this.timer);
            this.timer = setInterval(function () { self.tick(); }, this.TICK_MS);
        }

        tick() {
            if (!this.cfg.enabled) return;
            var now = Date.now();

            // ① 執行到期的名人購買
            var bought = this.processNpcSchedule(now, false);

            // ② 若已到期則開獎（上限 10 次防呆）
            var L = this.ensureState();
            var drew = false;
            var guard = 0;
            while (L.nextDrawTs <= now && guard < 10) {
                this.doDraw(L.nextDrawTs, false);
                drew = true;
                guard++;
            }

            // ③ 若本期沒開獎，檢查提醒
            if (!drew) this.checkReminder(now);

            // ④ 有名人購買 → 通知 UI 局部更新
            if (bought > 0 && typeof this.onChange === 'function') this.onChange();
        }

        // ────────────────────────────────────────────
        //  ⭐ v4：取得「本期購買名單」
        //
        //  設計要點：
        //   ① 每筆附帶穩定 key：
        //        玩家 = 'p'
        //        名人 = 'n:<id>:<atTs>'
        //      → 讓 UI 可做簽章比對，名單不變時完全不碰 DOM
        //
        //   ② 改為「時間序（早 → 晚）」排序
        //      原按「金額」排序會讓新買家插到最前面 → 整份名單重排（跳動）
        //      時間序下，新買家一律 append 到最後 → 既有項目永不移動
        //
        //   ③ 玩家項目以「最早購票時間」定位
        //      之後加購只更新 amount / count，不會換位置
        // ────────────────────────────────────────────
        getBuyers() {
            var L = this.ensureState();
            var list = [];

            // ① 玩家（合併本期所有彩券為一筆）
            var myTickets = this.getMyTickets();
            if (myTickets.length > 0) {
                var myTotal = 0;
                var firstTs = Infinity;

                myTickets.forEach(function (t) {
                    myTotal += (t.price || 0);
                    var ts = t.boughtTs || 0;
                    if (ts > 0 && ts < firstTs) firstTs = ts;
                });
                if (!isFinite(firstTs)) firstTs = Date.now();

                list.push({
                    key:       'p',                 // 穩定 key
                    isPlayer:  true,
                    icon:      '👤',
                    name:      '你（玩家）',
                    title:     '時空浪人',
                    amount:    myTotal,
                    count:     myTickets.length,    // 本期買了幾張
                    atTs:      firstTs
                });
            }

            // ② 名人（每位一筆）
            L.npcEntries.forEach(function (e) {
                list.push({
                    key:      'n:' + e.id + ':' + e.atTs,   // 穩定 key
                    isPlayer: false,
                    icon:     e.icon,
                    name:     e.name,
                    title:    e.title,
                    amount:   e.amount,
                    count:    1,
                    atTs:     e.atTs
                });
            });

            // ③ ⭐ 時間序（早 → 晚）
            //    同時以 key 做次要排序，確保「同一毫秒」時順序也穩定
            list.sort(function (a, b) {
                var ta = a.atTs || 0;
                var tb = b.atTs || 0;
                if (ta !== tb) return ta - tb;
                return (a.key < b.key) ? -1 : ((a.key > b.key) ? 1 : 0);
            });

            return list;
        }

        // ────────────────────────────────────────────
        //  本期售出統計（供 UI 顯示）
        // ────────────────────────────────────────────
        getTotalSold() {
            var L = this.ensureState();
            var npcTotal = L.npcEntries.reduce(function (a, e) {
                return a + (e.amount || 0);
            }, 0);
            var myTotal = this.getMyTickets().reduce(function (a, t) {
                return a + (t.price || 0);
            }, 0);

            return {
                amount:    npcTotal + myTotal,
                count:     L.npcEntries.length + this.getMyTickets().length,
                npcAmount: npcTotal,
                myAmount:  myTotal
            };
        }

        // ────────────────────────────────────────────
        //  名人購買進度（UI 已不使用，保留供 Console 查詢）
        // ────────────────────────────────────────────
        getCelebProgress() {
            var L = this.ensureState();
            var total = this.getAllCelebs().length;
            return { bought: L.npcBoughtIds.length, total: total };
        }
    }

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  ⑤ 實例化（⭐ 這是 v1 的致命缺漏：只匯出類別，UI 拿不到實例）          ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    function bootLottery() {
        var game = window.HY.game;
        if (!game) { setTimeout(bootLottery, 200); return; }

        if (!game.lotterySys && window.HY.LotterySystem) {
            try {
                game.lotterySys = new window.HY.LotterySystem(game);
            } catch (e) {
                console.error('[lotterySystem] ✗ 實例化失敗：', e, e && e.stack);
            }
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(bootLottery, 280);
    });
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(bootLottery, 300);
    }

    // ── 對外匯出 ──
    window.HY.LotterySystem  = LotterySystem;
    window.HY.LotteryPrizes  = PRIZE_TABLE;
    window.HY.LotteryDefaults = DEFAULT_CFG;
})();