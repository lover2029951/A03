// js/levelExpSystem.js  (v49)
// 升級經驗曲線 + 十四經脈成功率 + 三個門派篩選器
//
// v49 修正（收尾整理）：
//   ⭐ 經脈成功率改讀 GameConfig.martial.meridianSuccessRate（原本硬寫 0.10）
//   ⭐ decorateMeridianButtons 依 config 動態生成「成功率 X%」
window.HY = window.HY || {};

(function () {
    var SP_COST_MULT = 20;
    var SHOW_LV_GAP_PENALTY_TAG = false;

    function readMeridianSuccessRate() {
        var G = window.HY && window.HY.GameConfig;
        if (G && G.martial && typeof G.martial.meridianSuccessRate === 'number') {
            return G.martial.meridianSuccessRate;
        }
        return 0.10;
    }
    function meridianSuccessPctText() {
        return Math.round(readMeridianSuccessRate() * 100) + '%';
    }

    class LevelExpSystem {
        constructor(app) {
            this.app = app;
            this.MERIDIAN_SUCCESS_RATE = readMeridianSuccessRate();

            this.patchExpAndLevelPenalty();
            this.patchMeridians();
            this.buildSectFilterUI();
            this.hookMartialRender();
        }

        calculateRequiredExpForLevel(lv) {
            var level = Math.max(1, lv || 1);
            var tierIndex = Math.floor((level - 1) / 30);
            var tierMult = Math.pow(1.55, tierIndex);
            var baseCurve = 40 * Math.pow(level, 1.8) + level * 60;
            return Math.max(80, Math.floor(baseCurve * tierMult));
        }

        patchExpAndLevelPenalty() {
            var charSys = this.app.charSys;
            var combat = this.app.combatSys;
            var self = this;

            charSys.gainRewards = function (rawExp, rawSp, rawGold) {
                var adjSp = Math.max(1, Math.floor(rawSp * charSys.rewardRate));
                var adjGold = Math.max(1, Math.floor(rawGold * charSys.rewardRate));

                charSys.rootState.sp += adjSp;
                charSys.rootState.gold += adjGold;

                var partySys = window.HY.game && window.HY.game.partySys;
                var partyMembers = partySys ? partySys.getPartyMembers() : [charSys.state];

                var enemyLv = (combat && combat.lastEnemyTemplate && combat.lastEnemyTemplate.lv) || null;

                charSys.logger.add('💰 戰利品結算：武點 +' + adjSp.toLocaleString() + ' | 紋銀 +' + adjGold.toLocaleString() + ' 兩', 'wealth');

                partyMembers.forEach(function (member) {
                    if (member.lv >= charSys.MAX_LEVEL) { member.exp = 0; return; }

                    var memberExp = rawExp;
                    var penaltyTag = '';

                    if (enemyLv !== null && Math.abs(member.lv - enemyLv) >= 5) {
                        memberExp = Math.max(1, Math.floor(rawExp * 0.30));
                        if (SHOW_LV_GAP_PENALTY_TAG) {
                            penaltyTag = ' [⚠️與Lv.' + enemyLv + '怪差距≥5等・經驗-70%]';
                        }
                    }

                    member.exp += memberExp;
                    member.maxExp = self.calculateRequiredExpForLevel(member.lv);

                    charSys.logger.add('📈 【' + member.name + ' (Lv.' + member.lv + ')】獲得經驗 +' + memberExp.toLocaleString() + penaltyTag, 'wealth');

                    while (member.exp >= member.maxExp && member.lv < charSys.MAX_LEVEL) {
                        member.exp -= member.maxExp;
                        member.lv += 1;
                        member.freePoints += 5;
                        member.maxExp = self.calculateRequiredExpForLevel(member.lv);

                        var d = charSys.getDerivedStatsForChar(member);
                        member.currentHp = d.maxHp;
                        member.currentMp = d.maxMp;

                        var tierNum = Math.floor(member.lv / 30);
                        var tierNote = (member.lv % 30 === 0)
                            ? ' 🔥【邁入 Lv.' + member.lv + ' 大境界！後續升級經驗提高 1.55 倍 (累計 ' + Math.pow(1.55, tierNum).toFixed(1) + ' 倍)】'
                            : '';

                        charSys.logger.add('🎉 【' + member.name + '】升至 Lv.' + member.lv + '！獲 5 點潛能！' + tierNote, 'system');
                    }
                });
            };
        }

        patchMeridians() {
            var martialSys = this.app.martialSys;
            var charSys = this.app.charSys;
            var self = this;

            martialSys.getMeridianCost = function (meridianId) {
                martialSys.ensureState();
                var Data = window.HY.Data;
                var m = Data.MERIDIANS.find(function (item) { return item.id === meridianId; });
                if (!m) return 999999;
                var lv = charSys.state.meridians[meridianId] || 0;
                return Math.floor(m.spCost * SP_COST_MULT * Math.pow(1.65, lv));
            };

            martialSys.getMeridianReqLv = function (meridianId) {
                martialSys.ensureState();
                var Data = window.HY.Data;
                var m = Data.MERIDIANS.find(function (item) { return item.id === meridianId; });
                if (!m) return 1;
                var lv = charSys.state.meridians[meridianId] || 0;
                return (m.reqLv || 1) + lv * 3;
            };

            martialSys.upgradeMeridian = function (meridianId) {
                martialSys.ensureState();
                var Data = window.HY.Data;
                var m = Data.MERIDIANS.find(function (item) { return item.id === meridianId; });
                if (!m) return false;

                var needLv = martialSys.getMeridianReqLv(meridianId);
                if (charSys.state.lv < needLv) {
                    charSys.logger.add('🔒 境界不足！【' + charSys.state.name + '】需達到 Lv.' + needLv + ' 才能衝擊【' + m.name + '】下一重！', 'system');
                    return false;
                }

                var cost = martialSys.getMeridianCost(meridianId);
                if (charSys.rootState.sp < cost) {
                    charSys.logger.add('❌ 武點不足！衝擊【' + m.name + '】需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                    return false;
                }

                charSys.rootState.sp -= cost;

                // ⭐ v49：速率每次讀取（可在遊戲中即時調整 GameConfig）
                var rate = readMeridianSuccessRate();
                var pctText = Math.round(rate * 100) + '%';

                if (Math.random() < rate) {
                    var newLv = (charSys.state.meridians[meridianId] || 0) + 1;
                    charSys.state.meridians[meridianId] = newLv;
                    charSys.restoreVitals(80, 50);
                    charSys.clampVitals();
                    charSys.logger.add('🌟 [衝脈大成功・' + pctText + '機率] 【' + charSys.state.name + '】消耗 ' + cost.toLocaleString() + ' 武點，成功貫通【' + m.name + '】至第 ' + newLv + ' 周天！', 'wealth');
                } else {
                    charSys.logger.add('💨 [衝脈失敗] 【' + charSys.state.name + '】消耗 ' + cost.toLocaleString() + ' 武點衝擊【' + m.name + '】，真氣潰散未能突破（成功率 ' + pctText + '）...', 'combat');
                }
                return true;
            };
        }

        buildSectFilterUI() {
            var Data = window.HY.Data;
            var self = this;
            if (!Data || !Data.SECTS) return;

            var sectOptions = Object.values(Data.SECTS).map(function (s) {
                return '<option value="' + s.id + '">⛩️ 【' + s.name + '】</option>';
            }).join('');

            function buildSelectHtml(selId, labelText, color) {
                return '<label style="font-size:0.78rem; color:#94a3b8; margin-right:4px; white-space:nowrap;">' + labelText + '</label>' +
                    '<select id="' + selId + '" style="background:#121822; color:' + color + '; border:1px solid ' + color + '; padding:5px 10px; border-radius:4px; font-weight:bold; font-size:0.8rem;">' +
                        '<option value="all">📋 顯示全部</option>' +
                        '<option value="my_sect">⭐ 只顯示當前門派 + 共通</option>' +
                        '<option value="common">🗡️ 江湖共通</option>' +
                        sectOptions +
                    '</select>';
            }

            var configs = [
                { slotId: 'skills-sect-filter-slot',   selId: 'sel-tlbb-sect-filter',     key: 'categoryFilter', label: '🗡️ 外功門派：', color: '#00e5ff', legacyQuery: '#sub-skills .m-cat-btn' },
                { slotId: 'xinfa-sect-filter-slot',    selId: 'sel-xinfa-sect-filter',    key: 'xinfaFilter',    label: '🔥 心法門派：', color: '#f59e0b', legacyQuery: null },
                { slotId: 'qinggong-sect-filter-slot', selId: 'sel-qinggong-sect-filter', key: 'qinggongFilter', label: '🍃 身法門派：', color: '#10b981', legacyQuery: null }
            ];

            configs.forEach(function (cfg) {
                var slot = document.getElementById(cfg.slotId);
                if (!slot && cfg.legacyQuery) {
                    var firstBtn = document.querySelector(cfg.legacyQuery);
                    slot = firstBtn && firstBtn.parentNode;
                }
                if (!slot) return;

                slot.innerHTML = buildSelectHtml(cfg.selId, cfg.label, cfg.color);

                var sel = document.getElementById(cfg.selId);
                if (!sel) return;

                sel.value = self.app.martialSys[cfg.key] || 'all';
                sel.addEventListener('change', function (e) {
                    self.app.martialSys[cfg.key] = e.target.value;
                    self.app.uiMartialSect.renderMartialTab();
                });
            });
        }

        hookMartialRender() {
            var uiMartial = this.app.uiMartialSect;
            if (!uiMartial || uiMartial.__v49wrapped) return;
            uiMartial.__v49wrapped = true;

            var self = this;
            var origRender = uiMartial.renderMartialTab.bind(uiMartial);

            uiMartial.renderMartialTab = function () {
                origRender();
                self.applyMartialFilter();
                self.decorateMeridianButtons();
            };
        }

        applyMartialFilter() {
            var Data = window.HY.Data;
            var mList = document.getElementById('martial-list');
            if (!mList || !Data.MARTIAL_ARTS) return;

            var filter = this.app.martialSys.categoryFilter || 'all';
            var charSect = this.app.charSys.state.sect;

            mList.querySelectorAll('.card-item').forEach(function (card) {
                var artId = card.dataset ? card.dataset.artId : card.getAttribute('data-art-id');
                var art = artId ? Data.MARTIAL_ARTS[artId] : null;
                if (!art) { card.style.display = 'flex'; return; }

                var show = true;
                if (filter === 'common') {
                    show = (art.sectReq === null || art.sectReq === undefined);
                } else if (filter === 'my_sect') {
                    show = (!art.sectReq || art.sectReq === charSect);
                } else if (filter !== 'all') {
                    show = (art.sectReq === filter);
                }
                card.style.display = show ? 'flex' : 'none';
            });
        }

        // ⭐ v49：uiMartialSect 的經脈按鈕已自帶「成功率 X%」。
        //          此處僅作為 fallback（若按鈕文字缺漏時補上）。
        decorateMeridianButtons() {
            var merList = document.getElementById('meridian-list');
            if (!merList) return;
            var suffix = ' [成功率' + meridianSuccessPctText() + ']';
            merList.querySelectorAll('.card-item button').forEach(function (btn) {
                if (!btn.disabled && btn.textContent.indexOf('成功率') === -1) {
                    btn.textContent += suffix;
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var game = window.HY.game;
            if (game) {
                game.levelExpSys = new window.HY.LevelExpSystem(game);
                game.renderAll();
            }
        }, 140);
    });

    window.HY.LevelExpSystem = LevelExpSystem;
})();