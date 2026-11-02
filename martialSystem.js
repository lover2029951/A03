// js/martialSystem.js  (v32)
// 外功／心法／輕功(身法)／專精／經脈 的升級與門派隔離
//
// v32 修正：
//   ⭐ ensureState 初始化 sectFeature / _battle（特色狀態容器）
//   ⭐ 拜師切換時清除舊門派的特色狀態
//   ⭐ 三個獨立篩選狀態（categoryFilter / xinfaFilter / qinggongFilter）
window.HY = window.HY || {};

(function () {
    var SP_COST_MULT = 20;

    class MartialSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;

            this.categoryFilter  = 'all';
            this.xinfaFilter     = 'all';
            this.qinggongFilter  = 'all';
        }

        ensureState() {
            var c = this.charSys.state;
            if (!c.xinfa) c.xinfa = {};
            if (c.activeXinfa === undefined) c.activeXinfa = null;
            if (!c.qinggong) c.qinggong = {};
            if (c.activeQinggong === undefined) c.activeQinggong = null;
            if (!c.meridians) c.meridians = {};
            if (!c.sectFeature) c.sectFeature = {};
            if (!c._battle) c._battle = {};
            this.purgeInvalidSectSkills(c);
        }

        // 門派技能隔離：外功 / 心法 / 身法 三類皆檢查
        purgeInvalidSectSkills(charObj) {
            var Data = window.HY.Data;
            if (!charObj || !Data) return;

            // 1. 外功
            if (charObj.skills && Data.MARTIAL_ARTS) {
                Object.keys(charObj.skills).forEach(function (sId) {
                    var art = Data.MARTIAL_ARTS[sId];
                    if (!art || (art.sectReq && art.sectReq !== charObj.sect)) {
                        delete charObj.skills[sId];
                    }
                });
                if (!charObj.skills.basic_punch) charObj.skills.basic_punch = 1;
            }

            // 2. 心法
            if (charObj.xinfa && Data.XINFA) {
                Object.keys(charObj.xinfa).forEach(function (xId) {
                    var xf = Data.XINFA[xId];
                    if (!xf || (xf.sectReq && xf.sectReq !== charObj.sect)) {
                        delete charObj.xinfa[xId];
                        if (charObj.activeXinfa === xId) charObj.activeXinfa = null;
                    }
                });
            }

            // 3. 身法（含武道專精：MASTERY 無 sectReq）
            if (charObj.qinggong) {
                var defMap = {};
                (Data.QINGGONG || []).forEach(function (q) { defMap[q.id] = q; });
                (Data.MASTERY || []).forEach(function (m) { defMap[m.id] = m; });

                Object.keys(charObj.qinggong).forEach(function (qId) {
                    var def = defMap[qId];
                    if (!def) { delete charObj.qinggong[qId]; return; }
                    if (def.sectReq && def.sectReq !== charObj.sect) {
                        delete charObj.qinggong[qId];
                    }
                });

                if (charObj.activeQinggong && !charObj.qinggong[charObj.activeQinggong]) {
                    charObj.activeQinggong = null;
                }
                var activeDef = charObj.activeQinggong ? defMap[charObj.activeQinggong] : null;
                if (activeDef && activeDef.sectReq && activeDef.sectReq !== charObj.sect) {
                    charObj.activeQinggong = null;
                }
            }
        }

        canUseSkill(charObj, skillId) {
            var Data = window.HY.Data;
            var art = Data.MARTIAL_ARTS[skillId];
            if (!art) return false;
            if (!charObj.skills || !charObj.skills[skillId]) return false;
            if (art.sectReq && charObj.sect !== art.sectReq) return false;
            return true;
        }

        // ================= 1. 外功招式 =================
        getSkillUpgradeCost(skillId) {
            var Data = window.HY.Data;
            var art = Data.MARTIAL_ARTS[skillId];
            if (!art) return 999999;
            var currentLv = this.charSys.state.skills[skillId] || 0;
            return Math.floor(art.spCost * SP_COST_MULT * Math.pow(1.4, currentLv));
        }

        getSkillReqLv(skillId) {
            var Data = window.HY.Data;
            var art = Data.MARTIAL_ARTS[skillId];
            if (!art) return 1;
            var currentLv = this.charSys.state.skills[skillId] || 0;
            return (art.reqLv || 1) + currentLv * 2;
        }

        upgradeSkill(skillId) {
            var Data = window.HY.Data;
            var art = Data.MARTIAL_ARTS[skillId];
            if (!art) return false;

            if (art.sectReq && this.charSys.state.sect !== art.sectReq) {
                var reqSectName = Data.SECTS[art.sectReq] ? Data.SECTS[art.sectReq].name : '對應門派';
                this.logger.add('🚫 門派禁令！《' + art.name + '》乃【' + reqSectName + '】不傳之秘，非本門弟子不可修習！', 'system');
                return false;
            }

            var needLv = this.getSkillReqLv(skillId);
            if (this.charSys.state.lv < needLv) {
                this.logger.add('🔒 境界不足！【' + this.charSys.state.name + '】需達到 Lv.' + needLv + ' 才能修煉《' + art.name + '》下一重！', 'system');
                return false;
            }

            var cost = this.getSkillUpgradeCost(skillId);
            if (this.charSys.state.sp < cost) {
                this.logger.add('❌ 武學點數不足！修煉《' + art.name + '》需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                return false;
            }

            this.charSys.state.sp -= cost;
            var currentLv = this.charSys.state.skills[skillId] || 0;
            this.charSys.state.skills[skillId] = currentLv + 1;

            this.logger.add('🗡️ 【' + this.charSys.state.name + '】消耗 ' + cost.toLocaleString() + ' 武點，外功《' + art.name + '》修煉至第 ' + (currentLv + 1) + ' 重！', 'gain');
            return true;
        }

        getSkillPower(skillId, charObj) {
            var Data = window.HY.Data;
            var c = charObj || this.charSys.state;
            var art = Data.MARTIAL_ARTS[skillId];
            if (!art) return 1.0;
            var lv = (c.skills && c.skills[skillId]) || 1;
            return art.baseMult + (lv - 1) * 0.14;
        }

        // ================= 2. 內功心法 =================
        getXinfaCost(xinfaId) {
            this.ensureState();
            var Data = window.HY.Data;
            var xf = Data.XINFA[xinfaId];
            if (!xf) return 999999;
            var lv = this.charSys.state.xinfa[xinfaId] || 0;
            return Math.floor(xf.spCost * SP_COST_MULT * Math.pow(1.4, lv));
        }

        getXinfaReqLv(xinfaId) {
            this.ensureState();
            var Data = window.HY.Data;
            var xf = Data.XINFA[xinfaId];
            if (!xf) return 1;
            var lv = this.charSys.state.xinfa[xinfaId] || 0;
            return (xf.reqLv || 1) + lv * 2;
        }

        upgradeXinfa(xinfaId) {
            this.ensureState();
            var Data = window.HY.Data;
            var xf = Data.XINFA[xinfaId];
            if (!xf) return false;

            if (xf.sectReq && this.charSys.state.sect !== xf.sectReq) {
                var reqSectName = Data.SECTS[xf.sectReq] ? Data.SECTS[xf.sectReq].name : '對應門派';
                this.logger.add('🚫 門派禁令！內功《' + xf.name + '》僅限【' + reqSectName + '】弟子參悟！', 'system');
                return false;
            }

            var needLv = this.getXinfaReqLv(xinfaId);
            if (this.charSys.state.lv < needLv) {
                this.logger.add('🔒 境界不足！【' + this.charSys.state.name + '】需達到 Lv.' + needLv + ' 才能參悟《' + xf.name + '》！', 'system');
                return false;
            }

            var cost = this.getXinfaCost(xinfaId);
            if (this.charSys.state.sp < cost) {
                this.logger.add('❌ 武點不足！參悟內功《' + xf.name + '》需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                return false;
            }

            this.charSys.state.sp -= cost;
            var curLv = this.charSys.state.xinfa[xinfaId] || 0;
            this.charSys.state.xinfa[xinfaId] = curLv + 1;

            if (!this.charSys.state.activeXinfa) {
                this.charSys.state.activeXinfa = xinfaId;
            }

            this.charSys.clampVitals();
            var featTag = xf.featBoost ? '（' + xf.activeEffectDesc + '）' : '';
            this.logger.add('🔥 【' + this.charSys.state.name + '】消耗 ' + cost.toLocaleString() + ' 武點，內功《' + xf.name + '》突破至第 ' + (curLv + 1) + ' 層！' + featTag, 'gain');
            return true;
        }

        setActiveXinfa(xinfaId) {
            this.ensureState();
            var Data = window.HY.Data;
            var xf = Data.XINFA[xinfaId];
            if (!xf || !this.charSys.state.xinfa[xinfaId]) return false;
            if (xf.sectReq && this.charSys.state.sect !== xf.sectReq) return false;

            this.charSys.state.activeXinfa = xinfaId;
            this.charSys.clampVitals();
            this.logger.add('☯️ 【' + this.charSys.state.name + '】已將《' + xf.name + '》設為當前主運心法！', 'system');
            return true;
        }

        getActiveXinfaInfo() {
            this.ensureState();
            var Data = window.HY.Data;
            var id = this.charSys.state.activeXinfa;
            if (!id || !Data.XINFA[id]) return null;
            var xf = Data.XINFA[id];
            if (xf.sectReq && this.charSys.state.sect !== xf.sectReq) return null;

            var lv = this.charSys.state.xinfa[id] || 1;
            return {
                id: xf.id, name: xf.name, lv: lv,
                effectType: xf.effectType,
                activeEffectDesc: xf.activeEffectDesc
            };
        }

        // ================= 3. 輕功身法 =================
        findQinggong(qgId) {
            var Data = window.HY.Data;
            return (Data.QINGGONG || []).find(function (item) { return item.id === qgId; }) || null;
        }

        getQinggongCost(qgId) {
            this.ensureState();
            var qg = this.findQinggong(qgId);
            if (!qg) return 999999;
            var lv = this.charSys.state.qinggong[qgId] || 0;
            return Math.floor(qg.spCost * SP_COST_MULT * Math.pow(1.4, lv));
        }

        getQinggongReqLv(qgId) {
            this.ensureState();
            var qg = this.findQinggong(qgId);
            if (!qg) return 1;
            var lv = this.charSys.state.qinggong[qgId] || 0;
            return (qg.reqLv || 1) + lv * 2;
        }

        upgradeQinggong(qgId) {
            this.ensureState();
            var Data = window.HY.Data;
            var qg = this.findQinggong(qgId);
            if (!qg) return false;

            if (qg.sectReq && this.charSys.state.sect !== qg.sectReq) {
                var reqSectName = Data.SECTS[qg.sectReq] ? Data.SECTS[qg.sectReq].name : '對應門派';
                this.logger.add('🚫 門派禁令！《' + qg.name + '》乃【' + reqSectName + '】專屬身法，非本門弟子不可修習！', 'system');
                return false;
            }

            var needLv = this.getQinggongReqLv(qgId);
            if (this.charSys.state.lv < needLv) {
                this.logger.add('🔒 境界不足！【' + this.charSys.state.name + '】需達到 Lv.' + needLv + ' 才能修習《' + qg.name + '》！', 'system');
                return false;
            }

            var cost = this.getQinggongCost(qgId);
            if (this.charSys.state.sp < cost) {
                this.logger.add('❌ 武點不足！修煉輕功《' + qg.name + '》需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                return false;
            }

            this.charSys.state.sp -= cost;
            var lv = (this.charSys.state.qinggong[qgId] || 0) + 1;
            this.charSys.state.qinggong[qgId] = lv;

            if (!this.charSys.state.activeQinggong) {
                this.charSys.state.activeQinggong = qgId;
            }

            this.charSys.clampVitals();
            this.logger.add('🍃 【' + this.charSys.state.name + '】輕功《' + qg.name + '》修煉至第 ' + lv + ' 境！', 'gain');
            return true;
        }

        setActiveQinggong(qgId) {
            this.ensureState();
            var Data = window.HY.Data;
            var qg = this.findQinggong(qgId);
            if (!qg || !this.charSys.state.qinggong[qgId]) return false;
            if (qg.sectReq && this.charSys.state.sect !== qg.sectReq) return false;

            this.charSys.state.activeQinggong = qgId;
            this.charSys.clampVitals();
            this.logger.add('🍃 【' + this.charSys.state.name + '】已將《' + qg.name + '》設為當前常駐身法！（每人限常駐 1 門）', 'system');
            return true;
        }

        getActiveQinggongInfo() {
            this.ensureState();
            var id = this.charSys.state.activeQinggong;
            if (!id) return null;
            var qg = this.findQinggong(id);
            if (!qg) return null;
            if (qg.sectReq && this.charSys.state.sect !== qg.sectReq) return null;
            return {
                id: qg.id, name: qg.name, lv: this.charSys.state.qinggong[id] || 1,
                category: qg.category || '江湖共通'
            };
        }

        // ================= 3.5 武道專精（18 門） =================
        findMasteryOrQinggong(id) {
            var Data = window.HY.Data;
            var found = (Data.QINGGONG || []).find(function (item) { return item.id === id; });
            if (!found && Data.MASTERY) {
                found = Data.MASTERY.find(function (item) { return item.id === id; });
            }
            return found || null;
        }

        getMasteryCost(mId) {
            this.ensureState();
            var item = this.findMasteryOrQinggong(mId);
            if (!item) return 999999;
            var lv = this.charSys.state.qinggong[mId] || 0;
            return Math.floor(item.spCost * SP_COST_MULT * Math.pow(1.4, lv));
        }

        getMasteryReqLv(mId) {
            this.ensureState();
            var item = this.findMasteryOrQinggong(mId);
            if (!item) return 1;
            var lv = this.charSys.state.qinggong[mId] || 0;
            return (item.reqLv || 1) + lv * 2;
        }

        upgradeMastery(mId) {
            this.ensureState();
            var item = this.findMasteryOrQinggong(mId);
            if (!item) return false;

            var needLv = this.getMasteryReqLv(mId);
            if (this.charSys.state.lv < needLv) {
                this.logger.add('🔒 境界不足！【' + this.charSys.state.name + '】需達到 Lv.' + needLv + ' 才能修習專精《' + item.name + '》！', 'system');
                return false;
            }

            var cost = this.getMasteryCost(mId);
            if (this.charSys.state.sp < cost) {
                this.logger.add('❌ 武點不足！修煉專精《' + item.name + '》需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                return false;
            }

            this.charSys.state.sp -= cost;
            var lv = (this.charSys.state.qinggong[mId] || 0) + 1;
            this.charSys.state.qinggong[mId] = lv;
            this.charSys.clampVitals();
            this.logger.add('🎯 【' + this.charSys.state.name + '】武道專精《' + item.name + '》提升至第 ' + lv + ' 境！', 'gain');
            return true;
        }

        // ================= 4. 十四經脈 =================
        getMeridianCost(meridianId) {
            this.ensureState();
            var Data = window.HY.Data;
            var m = (Data.MERIDIANS || []).find(function (item) { return item.id === meridianId; });
            if (!m) return 999999;
            var lv = this.charSys.state.meridians[meridianId] || 0;
            return Math.floor(m.spCost * SP_COST_MULT * Math.pow(1.65, lv));
        }

        getMeridianReqLv(meridianId) {
            this.ensureState();
            var Data = window.HY.Data;
            var m = (Data.MERIDIANS || []).find(function (item) { return item.id === meridianId; });
            if (!m) return 1;
            var lv = this.charSys.state.meridians[meridianId] || 0;
            return (m.reqLv || 1) + lv * 3;
        }

        upgradeMeridian(meridianId) {
            this.ensureState();
            var Data = window.HY.Data;
            var m = (Data.MERIDIANS || []).find(function (item) { return item.id === meridianId; });
            if (!m) return false;

            var needLv = this.getMeridianReqLv(meridianId);
            if (this.charSys.state.lv < needLv) {
                this.logger.add('🔒 經脈承受力不足！【' + this.charSys.state.name + '】需達到 Lv.' + needLv + ' 才能衝擊【' + m.name + '】下一周天！', 'system');
                return false;
            }

            var cost = this.getMeridianCost(meridianId);
            if (this.charSys.state.sp < cost) {
                this.logger.add('❌ 武點不足！衝擊【' + m.name + '】需要 ' + cost.toLocaleString() + ' 點武點。', 'system');
                return false;
            }

            this.charSys.state.sp -= cost;
            this.charSys.state.meridians[meridianId] = (this.charSys.state.meridians[meridianId] || 0) + 1;
            this.charSys.restoreVitals(50, 35);
            this.logger.add('🧘 真氣貫通！【' + this.charSys.state.name + '】成功將【' + m.name + '】提升至第 ' + this.charSys.state.meridians[meridianId] + ' 周天！', 'gain');
            return true;
        }
    }

    window.HY.MartialSystem = MartialSystem;
})();