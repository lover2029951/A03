// js/rosterSystem.js  (v28)
// 5 角色欄管理
//
// v28 修正：
//   ⭐ PRESET_NAMES 統一讀 Data.PRESET_NAMES；首角色命名邏輯與 getDefaultRootState 對齊
window.HY = window.HY || {};

(function () {
    class RosterSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
            this.MAX_CHARS = 5;
        }

        // ⭐ 統一由 Data.PRESET_NAMES 取得（partyData.js），避免雙份定義
        get PRESET_NAMES() {
            var Data = window.HY.Data;
            if (Data && Array.isArray(Data.PRESET_NAMES) && Data.PRESET_NAMES.length > 0) {
                return Data.PRESET_NAMES;
            }
            return [
                '時空浪人・壹',
                '少帥傳人・貳',
                '慈航劍客・叁',
                '天魔行者・肆',
                '尋秦太傅・伍'
            ];
        }

        ensureState() {
            var root = this.charSys.rootState;
            if (!root.roster || !Array.isArray(root.roster) || root.roster.length === 0) {
                var firstChar = this.charSys.createSingleCharTemplate('char_1', '時空浪人・壹');
                root.roster = [firstChar];
                root.activeCharIndex = 0;
            }
            if (root.activeCharIndex === undefined || root.activeCharIndex >= root.roster.length) {
                root.activeCharIndex = 0;
            }
            this.charSys.syncActivePointer();
        }

        getAllCharacters() {
            this.ensureState();
            return this.charSys.rootState.roster;
        }

        getActiveCharacter() {
            this.ensureState();
            var root = this.charSys.rootState;
            return root.roster[root.activeCharIndex];
        }

        selectCharacter(index) {
            this.ensureState();
            var root = this.charSys.rootState;
            if (index < 0 || index >= root.roster.length) return false;

            root.activeCharIndex = index;
            this.charSys.syncActivePointer();
            var cur = root.roster[index];
            this.logger.add('👤 已切換主控角色為：【' + cur.name + ' (Lv.' + cur.lv + ')】！', 'system');
            return true;
        }

        createNewCharacter(customName) {
            this.ensureState();
            var root = this.charSys.rootState;

            if (root.roster.length >= this.MAX_CHARS) {
                this.logger.add('⚠️ 角色欄已達上限（最高可創建並操作 5 名時空行者）！', 'system');
                return false;
            }

            var nextIdx = root.roster.length + 1;
            var charId = 'char_' + Date.now() + '_' + nextIdx;
            var presets = this.PRESET_NAMES;
            var defaultName = (customName && customName.trim())
                ? customName.trim()
                : (presets[nextIdx - 1] || ('時空行者・' + nextIdx));

            var newChar = this.charSys.createSingleCharTemplate(charId, defaultName);
            root.roster.push(newChar);

            var partySys = window.HY.game && window.HY.game.partySys;
            if (partySys) {
                partySys.addMember(charId);
            }

            this.logger.add('🌟 馬博士啟動時空傳送！新角色【' + defaultName + '】已加入角色欄並編入隊伍！', 'gain');
            return true;
        }

        renameCharacter(index, newName) {
            this.ensureState();
            var root = this.charSys.rootState;
            if (!root.roster[index] || !newName || !newName.trim()) return false;
            var oldName = root.roster[index].name;
            root.roster[index].name = newName.trim();
            this.logger.add('✏️ 角色【' + oldName + '】已改名為【' + root.roster[index].name + '】。', 'system');
            return true;
        }
    }

    window.HY.RosterSystem = RosterSystem;
})();