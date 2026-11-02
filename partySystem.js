// js/partySystem.js  (v51)
// 五人組隊與修仙陣法系統
//
// v51 修正：
//   ⭐ 陣法改為「修仙十五大陣法」，須滿足靈根需求方可啟動
//   ⭐ 需求樣式依存檔種子（formationSeed）隨機分配，同階內打亂
//   ⭐ 提供 getAllFormations()：含需求、是否符合、缺少何種靈根
//   ⭐ getActiveFormation() 未達需求時自動失效（回傳 none）
window.HY = window.HY || {};

(function () {
    var NONE_FORMATION = {
        id: 'none',
        name: '自由散陣',
        icon: '🚩',
        tier: 0,
        desc: '無特殊陣法約束，各憑本事迎敵。',
        bonus: {}
    };

    class PartySystem {
        constructor(charSys, rosterSys, logger) {
            this.charSys = charSys;
            this.rosterSys = rosterSys;
            this.logger = logger;
            this.MAX_PARTY_SIZE = 5;
            this._assignCache = null;
            this._assignSeedCache = null;
        }

        // ══════════════════════════════════════════════
        // 種子與對應表
        // ══════════════════════════════════════════════
        getSeed() {
            var root = this.charSys.rootState;
            if (!root) return 1;
            if (typeof root.formationSeed !== 'number' || root.formationSeed <= 0) {
                root.formationSeed = Math.floor(Math.random() * 2147483646) + 1;
            }
            return root.formationSeed;
        }

        getAssignment() {
            var seed = this.getSeed();
            if (this._assignSeedCache === seed && this._assignCache) return this._assignCache;
            var Data = window.HY.Data;
            var map = (Data && typeof Data.buildFormationAssignment === 'function')
                ? Data.buildFormationAssignment(seed)
                : {};
            this._assignSeedCache = seed;
            this._assignCache = map;
            return map;
        }

        // 重骰種子（供玩家付費重置）
        rerollSeed() {
            this.charSys.rootState.formationSeed = Math.floor(Math.random() * 2147483646) + 1;
            this._assignCache = null;
            this._assignSeedCache = null;
            return this.charSys.rootState.formationSeed;
        }

        // ══════════════════════════════════════════════
        // 隊伍靈根統計
        // ══════════════════════════════════════════════
        getPartyRootCounts() {
            var counts = {};
            this.getPartyMembers().forEach(function (m) {
                if (!m || !m.spiritRoot) return;
                counts[m.spiritRoot] = (counts[m.spiritRoot] || 0) + 1;
            });
            return counts;
        }

        // ══════════════════════════════════════════════
        // 取得全部陣法（含需求與狀態）
        // ══════════════════════════════════════════════
        getAllFormations() {
            var Data = window.HY.Data;
            var assign = this.getAssignment();
            var counts = this.getPartyRootCounts();
            var out = [];

            out.push({
                id: 'none',
                formation: NONE_FORMATION,
                pattern: null,
                req: null,
                activatable: true,
                missing: [],
                active: (this.charSys.rootState.formation === 'none')
            });

            var list = (Data && Data.XIANXIA_FORMATIONS) ? Data.XIANXIA_FORMATIONS : [];
            var cur = this.charSys.rootState.formation;

            list.forEach(function (f) {
                var pat = assign[f.id] || null;
                var req = pat ? pat.req : null;
                var activatable = true;
                var missing = [];

                if (req && typeof Data.canSatisfyPattern === 'function') {
                    activatable = Data.canSatisfyPattern(req, counts);
                    if (!activatable && typeof Data.getMissingFromPattern === 'function') {
                        missing = Data.getMissingFromPattern(req, counts);
                    }
                }

                out.push({
                    id: f.id,
                    formation: f,
                    pattern: pat,
                    req: req,
                    activatable: activatable,
                    missing: missing,
                    active: (cur === f.id)
                });
            });

            return out;
        }

        // 相容舊介面：id → formation
        getFormationsMap() {
            var map = { none: NONE_FORMATION };
            var Data = window.HY.Data;
            if (Data && Data.XIANXIA_FORMATIONS) {
                Data.XIANXIA_FORMATIONS.forEach(function (f) { map[f.id] = f; });
            }
            return map;
        }

        get FORMATIONS() { return this.getFormationsMap(); }

        // ══════════════════════════════════════════════
        // 基本狀態
        // ══════════════════════════════════════════════
        ensureState() {
            this.rosterSys.ensureState();
            var root = this.charSys.rootState;

            if (!root.party || !Array.isArray(root.party) || root.party.length === 0) {
                root.party = [root.roster[0].id];
            }

            this.getSeed();

            var map = this.getFormationsMap();
            if (!root.formation || !map[root.formation]) {
                root.formation = 'none';
            }

            var validIds = root.roster.map(function (c) { return c.id; });
            root.party = root.party.filter(function (id) {
                return validIds.indexOf(id) !== -1;
            });
            if (root.party.length === 0 && root.roster.length > 0) {
                root.party.push(root.roster[0].id);
            }
        }

        isInParty(charId) {
            this.ensureState();
            return this.charSys.rootState.party.indexOf(charId) !== -1;
        }

        addMember(charId) {
            this.ensureState();
            var party = this.charSys.rootState.party;
            if (party.indexOf(charId) !== -1) return false;
            if (party.length >= this.MAX_PARTY_SIZE) {
                this.logger.add('⚠️ 隊伍人數已達上限（5人）！', 'system');
                return false;
            }
            party.push(charId);
            return true;
        }

        togglePartyMember(charId) {
            this.ensureState();
            var root = this.charSys.rootState;
            var idx = root.party.indexOf(charId);
            var targetChar = root.roster.find(function (c) { return c.id === charId; });
            if (!targetChar) return false;

            if (idx !== -1) {
                if (root.party.length <= 1) {
                    this.logger.add('⚠️ 出戰隊伍至少需要保留 1 名時空行者！', 'system');
                    return false;
                }
                root.party.splice(idx, 1);
                this.logger.add('⛺ 【' + targetChar.name + '】已退下休整（目前上場人數：' + root.party.length + ' 人）。', 'system');
            } else {
                if (root.party.length >= this.MAX_PARTY_SIZE) {
                    this.logger.add('⚠️ 隊伍最多只能同時上陣 5 名角色！', 'system');
                    return false;
                }
                root.party.push(charId);
                this.logger.add('🚩 【' + targetChar.name + '】已加入出戰隊伍（目前上場人數：' + root.party.length + ' 人，將遭遇 ' + root.party.length + ' 名敵人）！', 'gain');
            }

            this._revalidateFormation();
            return true;
        }

        deployAll() {
            this.ensureState();
            var root = this.charSys.rootState;
            root.party = root.roster.slice(0, this.MAX_PARTY_SIZE).map(function (c) { return c.id; });
            this.logger.add('🚩 全軍出擊！目前已上陣 ' + root.party.length + ' 名角色，戰鬥將遭遇 ' + root.party.length + ' 名對手！', 'gain');
            this._revalidateFormation();
            return true;
        }

        // ══════════════════════════════════════════════
        // 陣法設定（含靈根需求驗證）
        // ══════════════════════════════════════════════
        setFormation(formId) {
            this.ensureState();
            var Data = window.HY.Data;

            if (formId === 'none' || !formId) {
                this.charSys.rootState.formation = 'none';
                this.logger.add('🚩 已切換為【自由散陣】（無加成）。', 'system');
                return true;
            }

            var all = this.getAllFormations();
            var entry = all.filter(function (e) { return e.id === formId; })[0];
            if (!entry || !entry.formation) return false;

            if (!entry.activatable) {
                var missText = entry.missing.map(function (m) {
                    var meta = (Data && Data.ELEMENTS && Data.ELEMENTS[m.element]) ? Data.ELEMENTS[m.element] : null;
                    var cnts = this.getPartyRootCounts();
                    var have = cnts[m.element] || 0;
                    return (meta ? meta.icon + meta.name : m.element) + ' 需 ' + m.need + '（現有 ' + have + '）';
                }, this).join('、');
                this.logger.add('🚫 【' + entry.formation.name + '】靈根不足！缺少：' + missText, 'system');
                return false;
            }

            this.charSys.rootState.formation = formId;
            this.logger.add('☯️ 隊伍陣法已切換為：【' + entry.formation.icon + ' ' + entry.formation.name + '】！', 'system');
            return true;
        }

        // 若當前陣法失效（成員變動導致靈根不足）→ 自動退回自由散陣
        _revalidateFormation() {
            var cur = this.charSys.rootState.formation;
            if (!cur || cur === 'none') return;

            var counts = this.getPartyRootCounts();
            var assign = this.getAssignment();
            var pat = assign[cur];
            var Data = window.HY.Data;
            if (!pat || !Data.canSatisfyPattern) return;

            if (!Data.canSatisfyPattern(pat.req, counts)) {
                this.charSys.rootState.formation = 'none';
                this.logger.add('⚠️ 隊伍靈根變動，已自動退回【自由散陣】。', 'system');
            }
        }

        getActiveFormation() {
            this.ensureState();
            var root = this.charSys.rootState;
            var cur = root.formation;
            if (!cur || cur === 'none') return NONE_FORMATION;

            var assign = this.getAssignment();
            var pat = assign[cur];
            var Data = window.HY.Data;
            var counts = this.getPartyRootCounts();

            if (!pat || !Data.canSatisfyPattern) {
                return NONE_FORMATION;
            }
            if (!Data.canSatisfyPattern(pat.req, counts)) {
                return NONE_FORMATION;
            }

            var f = this.getFormationsMap()[cur];
            if (!f) return NONE_FORMATION;

            return {
                id: f.id, name: f.name, icon: f.icon, tier: f.tier,
                desc: f.desc, color: f.color, bonus: f.bonus || {},
                pattern: pat, req: pat.req
            };
        }

        // ══════════════════════════════════════════════
        // 隊伍成員
        // ══════════════════════════════════════════════
        getPartyMembers() {
            this.ensureState();
            var root = this.charSys.rootState;
            var members = [];
            root.party.forEach(function (charId) {
                var found = root.roster.find(function (c) { return c.id === charId; });
                if (found) members.push(found);
            });
            return members;
        }

        getPartySize() {
            return this.getPartyMembers().length;
        }
    }

    window.HY.PartySystem = PartySystem;
})();