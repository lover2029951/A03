// js/saveSystem.js  (v50)
// Logger（三通道分診）+ SaveSystem
//
// v50 修正（收尾整理）：
//   ⭐ 匯出 SAVE_KEY 至 window.HY.SaveSystem.SAVE_KEY
//      —— 讓 offlineIdleSystem 等其他模組不再硬寫 key
//   ⭐ save(silent) 靜默存檔（自動存檔不灌日誌）
//   ⭐ 手動存檔訊息走「💰 武點銀兩面板」
//   ⭐ 10 秒內同頻道相同訊息去重
window.HY = window.HY || {};

(function () {
    const SAVE_KEY = 'HUANGYI_WEB_RPG_SAVE_V2';
    const DEDUP_WINDOW_MS = 10000;

    class Logger {
        constructor(combatLogId, lootLogId, wealthLogId) {
            this._lastMsg = { combat: null, loot: null, wealth: null };
            this.bindContainers(
                combatLogId || 'game-log',
                lootLogId || 'loot-log',
                wealthLogId || 'wealth-log'
            );
        }

        bindContainers(combatLogId, lootLogId, wealthLogId) {
            this.combatContainer = document.getElementById(combatLogId);
            this.lootContainer = document.getElementById(lootLogId);
            this.wealthContainer = document.getElementById(wealthLogId);
        }

        detectTargetChannel(message, type) {
            if (
                type === 'wealth' ||
                message.indexOf('戰利品結算') !== -1 ||
                message.indexOf('獲得歷練獎勵') !== -1 ||
                message.indexOf('典當') !== -1 ||
                message.indexOf('存檔') !== -1 ||
                (message.indexOf('武點') !== -1 && (message.indexOf('消耗') !== -1 || message.indexOf('獲得') !== -1)) ||
                (message.indexOf('兩紋銀') !== -1 && message.indexOf('花費') !== -1)
            ) {
                return 'wealth';
            }

            if (
                type === 'loot' ||
                message.indexOf('戰利品搜括') !== -1 ||
                message.indexOf('神兵掉落') !== -1 ||
                message.indexOf('裝備掉落') !== -1 ||
                message.indexOf('通貨掉落') !== -1 ||
                message.indexOf('掉落了') !== -1 ||
                message.indexOf('搜出【') !== -1 ||
                message.indexOf('購入了') !== -1 ||
                message.indexOf('搶購成功') !== -1 ||
                message.indexOf('開啟奇珍匣') !== -1 ||
                message.indexOf('成功穿戴') !== -1
            ) {
                return 'loot';
            }

            return 'combat';
        }

        _containerOf(channel) {
            if (channel === 'wealth') return this.wealthContainer;
            if (channel === 'loot') return this.lootContainer;
            return this.combatContainer;
        }

        add(message, type) {
            type = type || 'system';

            if (!this.combatContainer) this.combatContainer = document.getElementById('game-log');
            if (!this.lootContainer) this.lootContainer = document.getElementById('loot-log');
            if (!this.wealthContainer) this.wealthContainer = document.getElementById('wealth-log');

            var channel = this.detectTargetChannel(message, type);
            var target = this._containerOf(channel);
            if (!target) return;

            var now = Date.now();
            var last = this._lastMsg[channel];
            if (last && last.msg === message && (now - last.ts) < DEDUP_WINDOW_MS) {
                return;
            }
            this._lastMsg[channel] = { msg: message, ts: now };

            const entry = document.createElement('div');
            entry.className = 'log-entry log-' + (type === 'loot' || type === 'wealth' ? 'gain' : type);
            entry.innerHTML = message;

            target.prepend(entry);

            while (target.children.length > 50) {
                target.removeChild(target.lastChild);
            }
        }

        clearChannel(channel) {
            if (channel === 'combat' && this.combatContainer) this.combatContainer.innerHTML = '';
            if (channel === 'loot' && this.lootContainer) this.lootContainer.innerHTML = '';
            if (channel === 'wealth' && this.wealthContainer) this.wealthContainer.innerHTML = '';
            if (channel) this._lastMsg[channel] = null;
        }

        clear() {
            if (this.combatContainer) this.combatContainer.innerHTML = '';
            if (this.lootContainer) this.lootContainer.innerHTML = '';
            if (this.wealthContainer) this.wealthContainer.innerHTML = '';
            this._lastMsg = { combat: null, loot: null, wealth: null };
        }
    }

    class SaveSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
        }

        save(silent) {
            try {
                const data = JSON.stringify(this.charSys.rootState);
                localStorage.setItem(SAVE_KEY, data);
                if (!silent) {
                    this.logger.add('💾 全隊角色與時空進度已成功寫入本地存檔。', 'wealth');
                }
            } catch (err) {
                this.logger.add('❌ 存檔失敗：瀏覽器儲存空間受限。', 'system');
            }
        }

        load() {
            try {
                const raw = localStorage.getItem(SAVE_KEY);
                if (!raw) return false;
                const parsed = JSON.parse(raw);
                this.charSys.rootState = Object.assign(this.charSys.getDefaultRootState(), parsed);
                this.charSys.syncActivePointer();
                this.logger.add('📂 成功讀取上次的時空小隊歷練紀錄！', 'system');
                return true;
            } catch (err) {
                return false;
            }
        }

        reset() {
            localStorage.removeItem(SAVE_KEY);
            this.charSys.rootState = this.charSys.getDefaultRootState();
            this.charSys.syncActivePointer();
            this.logger.clear();
            this.logger.add('🔄 時空機器重啟完畢！你再次回到了大唐雙龍傳的起點——揚州城。', 'time');
        }
    }

    // ⭐ v50：對外匯出 SAVE_KEY（供 offlineIdleSystem 等模組統一取用）
    SaveSystem.SAVE_KEY = SAVE_KEY;

    window.HY.Logger = Logger;
    window.HY.SaveSystem = SaveSystem;
    window.HY.SAVE_KEY = SAVE_KEY;      // 便捷存取
})();