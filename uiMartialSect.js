// js/uiMartialSect.js  (v48)
// 外功／心法／身法／專精／經脈 UI
//
// v48 修正（收尾整理）：
//   ⭐ NO_UNIT 加入 atkSpd（原本顯示成「攻速 +0.25%」，語意錯誤 —— 它是平面值）
//   ⭐ 經脈成功率改讀 GameConfig.martial.meridianSuccessRate（原本硬寫「10%」）
//   ⭐ LABEL_MAP 的 atkSpd 統一為「出手攻速」（與 qinggongData 一致）
window.HY = window.HY || {};

(function () {
    var MARTIAL_DIV  = 4;
    var MASTERY_DIV  = 5;

    var LABEL_MAP = {
        atk: '攻擊', def: '防禦', maxHp: '氣血', maxMp: '內力',
        hit: '命中', eva: '閃避', crit: '會心', critRes: '暴抗',
        atkSpd: '出手攻速'
    };
    // ⭐ v48：atkSpd 為平面值，不帶 % 單位
    var NO_UNIT = { atk: 1, def: 1, maxHp: 1, maxMp: 1, atkSpd: 1 };

    function getMeridianSuccessPct() {
        var G = window.HY && window.HY.GameConfig;
        var rate = (G && G.martial && typeof G.martial.meridianSuccessRate === 'number')
            ? G.martial.meridianSuccessRate
            : 0.10;
        return Math.round(rate * 100);
    }

    class UIMartialSect {
        constructor(app) { this.app = app; }

        sectName(sectId) {
            var Data = window.HY.Data || {};
            if (!sectId) return '江湖共通';
            var s = Data.SECTS && Data.SECTS[sectId];
            return (s && s.name) ? s.name : '江湖共通';
        }

        featOf(sectId) {
            var Data = window.HY.Data || {};
            return (Data.SECTS && Data.SECTS[sectId]) ? Data.SECTS[sectId].feature : null;
        }

        shouldShow(def, filter, charSect) {
            if (!filter || filter === 'all') return true;
            var req = def.sectReq;
            if (filter === 'common') return (req === null || req === undefined);
            if (filter === 'my_sect') return (!req || req === charSect);
            return req === filter;
        }

        // 僅處理「數字」屬性；物件型（elAtk/elDef）一律跳過
        formatScaledBonus(bonus, div) {
            if (!bonus) return '';
            var out = [];
            Object.keys(bonus).forEach(function (k) {
                var v = bonus[k];
                if (typeof v !== 'number') return;
                var eff = v / div;
                if (eff === 0) return;
                var shown = (Math.abs(eff) < 1) ? eff.toFixed(2) : Math.floor(eff);
                if (Number(shown) === 0) return;
                out.push((LABEL_MAP[k] || k) + ' +' + shown + (NO_UNIT[k] ? '' : '%'));
            });
            return out.join('、');
        }

        formatElementChips(elAtk, elDef) {
            var Data = window.HY.Data;
            if (!Data || !Data.ELEMENTS) return '';
            var out = [];

            function push(obj, suffix) {
                if (!obj || typeof obj !== 'object') return;
                Object.keys(obj).forEach(function (k) {
                    var m = Data.ELEMENTS[k];
                    if (!m || typeof obj[k] !== 'number') return;
                    var v = Math.floor(obj[k]);
                    if (v === 0) return;
                    out.push('<span style="display:inline-block; background:#18202c; border:1px solid ' + m.color +
                        '; color:' + m.color + '; padding:0 5px; border-radius:3px; font-size:0.72rem; margin-right:3px;">' +
                        m.icon + m.name + suffix + ' +' + v + '</span>');
                });
            }

            push(elAtk, '元素攻擊');
            push(elDef, '元素抗性');
            return out.join('');
        }

        formatFeatBoost(featBoost) {
            if (!featBoost) return '';
            var FEAT_LABEL = {
                max: '上限', dr: '每層減傷', reflect: '引爆倍率', releaseHeal: '引爆回血',
                dot: '每層灼傷', lowHpBonus: '殘血增幅', dmg: '每層增傷',
                critRes: '每層暴抗', release: '釋放倍率', atkDef: '每層全隊攻防',
                healBonus: '治療增幅', cut: '每層削上限', hit: '每層命中', pen: '滿層破甲',
                slow: '每層減速', critBonus: '凍結暴擊', freezeTurns: '凍結回合',
                drain: '吸取比例', dmgBonus: '高內力增傷', cap: '彼力上限', mult: '返還倍率',
                aoeBonus: '群攻增幅', power: '陣法強度', extra: '額外屬攻',
                atkUp: '陽刀攻擊', defUp: '陰劍防禦', perStack: '每層攻擊', killHeal: '擊殺回血'
            };
            var out = [];
            Object.keys(featBoost).forEach(function (k) {
                var v = featBoost[k];
                if (typeof v !== 'number') return;
                var txt;
                if (k === 'max') txt = '+ ' + v;
                else if (k === 'freezeTurns') txt = '+ ' + v;
                else if (k === 'cap') txt = '+' + Math.round(v * 100) + '%';
                else if (k === 'mult' || k === 'power') txt = '×' + v.toFixed(2);
                else txt = '+' + Math.round(v * 100) + '%';
                out.push((FEAT_LABEL[k] || k) + ' ' + txt);
            });
            return out.join('、');
        }

        renderMartialTab() {
            const Data = window.HY.Data;
            const app = this.app;
            app.martialSys.ensureState();
            const charLv = app.charSys.state.lv;
            const charSect = app.charSys.state.sect;

            const artFilter = app.martialSys.categoryFilter || 'all';
            const xfFilter  = app.martialSys.xinfaFilter || 'all';
            const qgFilter  = app.martialSys.qinggongFilter || 'all';

            // ══════════ 1. 外功武技 ══════════
            const mList = document.getElementById('martial-list');
            if (mList) {
                mList.innerHTML = '';
                let shownCount = 0;

                Object.values(Data.MARTIAL_ARTS).forEach(art => {
                    if (!this.shouldShow(art, artFilter, charSect)) return;
                    shownCount += 1;

                    const lv = app.charSys.state.skills[art.id] || 0;
                    const cost = app.martialSys.getSkillUpgradeCost(art.id);
                    const needLv = app.martialSys.getSkillReqLv(art.id);
                    const lockedByLv = charLv < needLv;
                    const lockedBySect = art.sectReq && charSect !== art.sectReq;
                    const curMult = (art.baseMult + Math.max(0, lv - 1) * 0.14).toFixed(2);

                    let tierLabel = '';
                    if (art.sectReq) {
                        const m = /_art_(\d+)$/.exec(art.id);
                        if (m) tierLabel = '第 ' + m[1] + '/10 式';
                    }
                    const reqSectLabel = art.sectReq ? this.sectName(art.sectReq) : '江湖共通';

                    let btnText = lv > 0 ? '⬆️ 提升重數 (' + cost.toLocaleString() + ' 武點)' : '📖 領悟外功 (' + cost.toLocaleString() + ' 武點)';
                    if (lockedBySect) btnText = '🚫 限【' + reqSectLabel + '】弟子';
                    else if (lockedByLv) btnText = '🔒 需 Lv.' + needLv + ' 解鎖';

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.dataset.artId = art.id;
                    card.style.borderColor = lockedBySect ? '#334155' : (lv > 0 ? '#c89d54' : '#2e3b4e');
                    card.style.opacity = lockedBySect ? '0.6' : '1';

                    const tagBits = [];
                    if (tierLabel) tagBits.push(tierLabel);
                    tagBits.push('Lv.' + (art.reqLv || 1) + '+');
                    tagBits.push(reqSectLabel);

                    const extraBits = [];
                    if (art.isAoe) extraBits.push('🌪️ 群攻');
                    if (art.armorPen) extraBits.push('破甲 ' + (art.armorPen / MARTIAL_DIV * 100).toFixed(1) + '%');
                    if (art.critBonus) extraBits.push('會心 +' + (art.critBonus / MARTIAL_DIV).toFixed(1) + '%');
                    if (art.healRatio) extraBits.push('回血 ' + (art.healRatio / MARTIAL_DIV * 100).toFixed(1) + '%');
                    if (art.mpRestore) extraBits.push('回內 +' + Math.floor(art.mpRestore / MARTIAL_DIV));

                    const feat = this.featOf(art.sectReq);
                    const featBoostText = this.formatFeatBoost(art.feat);

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + (art.isAoe ? '🌪️ ' : '🗡️ ') + art.name + ' <small style="color:#00e5ff;">[' + tagBits.join(' | ') + ']</small> ' +
                            (lv > 0 ? '<span class="sp-color">(第 ' + lv + ' 重)</span>' : '<span style="color:#64748b;">(未習得)</span>') + '</h4>' +
                            '<p>' + art.desc + '</p>' +
                            '<p>倍率：<strong>' + (curMult * 100).toFixed(0) + '%</strong> | 命中加成：+' + (art.hitBonus / MARTIAL_DIV).toFixed(1) + '% | 耗內：' + art.mpCost + '</p>' +
                            (extraBits.length ? '<p style="color:#4ade80; font-size:0.8rem;">⚙️ ' + extraBits.join(' ｜ ') + '</p>' : '') +
                            (feat ? '<p style="color:' + feat.color + '; font-size:0.8rem;">' + feat.icon + ' 特色觸發：<strong>' + feat.name + '</strong>' + (featBoostText ? '（' + featBoostText + '）' : '') + '</p>' : '') +
                            '<p style="font-size:0.78rem; color:#94a3b8;">下重需求：Lv.' + needLv + ' & ' + cost.toLocaleString() + ' 武點</p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + ((lockedBySect || lockedByLv) ? 'disabled' : '') + '>' + btnText + '</button>';

                    card.querySelector('button').addEventListener('click', () => {
                        if (app.martialSys.upgradeSkill(art.id)) app.renderAll();
                    });
                    mList.appendChild(card);
                });

                if (shownCount === 0) {
                    const empty = document.createElement('p');
                    empty.style.color = '#94a3b8';
                    empty.style.padding = '12px';
                    empty.textContent = '此門派分類下目前沒有可顯示的外功武學。';
                    mList.appendChild(empty);
                }
            }

            // ══════════ 2. 內功心法 ══════════
            const xfList = document.getElementById('xinfa-list');
            if (xfList && Data.XINFA) {
                xfList.innerHTML = '';
                const learnedXf = app.charSys.state.xinfa;
                const activeXfId = app.charSys.state.activeXinfa;
                let xfShown = 0;

                Object.values(Data.XINFA).forEach(xf => {
                    if (!this.shouldShow(xf, xfFilter, charSect)) return;
                    xfShown += 1;

                    const lv = learnedXf[xf.id] || 0;
                    const isActive = activeXfId === xf.id;
                    const cost = app.martialSys.getXinfaCost(xf.id);
                    const needLv = app.martialSys.getXinfaReqLv(xf.id);
                    const lockedByLv = charLv < needLv;
                    const lockedBySect = xf.sectReq && charSect !== xf.sectReq;
                    const reqSectName = xf.sectReq ? this.sectName(xf.sectReq) : '江湖共通';

                    let tierLabel = '';
                    if (xf.sectReq) {
                        const m = /_(\d+)$/.exec(xf.id);
                        if (m) tierLabel = '第 ' + m[1] + '/5 階';
                    }

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = isActive ? '#f59e0b' : (lockedBySect ? '#334155' : '#2e3b4e');
                    card.style.opacity = lockedBySect ? '0.6' : '1';

                    let btnHtml = '';
                    if (lv === 0) {
                        let label = '🔥 參悟心法 (' + cost.toLocaleString() + ' 武點)';
                        if (lockedBySect) label = '🚫 限【' + reqSectName + '】弟子';
                        else if (lockedByLv) label = '🔒 需 Lv.' + needLv + ' 參悟';
                        btnHtml = '<button class="btn-primary btn-learn-xf" ' + ((lockedBySect || lockedByLv) ? 'disabled' : '') + '>' + label + '</button>';
                    } else {
                        btnHtml =
                            '<div class="btn-group-row">' +
                                '<button class="btn-primary btn-active-xf" ' + (isActive ? 'disabled' : '') + '>' +
                                    (isActive ? '🔥 主運功中 (×1.3)' : '☯️ 設為主運心法') +
                                '</button>' +
                                '<button class="action-btn btn-up-xf" ' + (lockedByLv ? 'disabled' : '') + '>' +
                                    (lockedByLv ? '🔒 需 Lv.' + needLv : '⬆️ 突破 (' + cost.toLocaleString() + ')') +
                                '</button>' +
                            '</div>';
                    }

                    const tagBits = [];
                    if (tierLabel) tagBits.push(tierLabel);
                    tagBits.push('Lv.' + (xf.reqLv || 1) + '+');
                    tagBits.push(reqSectName);

                    const effText = this.formatScaledBonus(xf.passivePerLv, MARTIAL_DIV);
                    const elemChips = this.formatElementChips(xf.elAtk, xf.elDef);
                    const feat = this.featOf(xf.sectReq);
                    const featBoostText = this.formatFeatBoost(xf.featBoost);

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + xf.name + ' <small style="color:#fbbf24;">[' + tagBits.join(' | ') + ']</small> ' +
                            (lv > 0 ? '<span class="sp-color">(第 ' + lv + ' 層)</span>' : '<span style="color:#64748b;">(未參悟)</span>') + '</h4>' +
                            '<p>' + xf.desc + '</p>' +
                            (effText ? '<p style="color:#38bdf8;">✨ 每層提升：' + effText + '</p>' : '') +
                            (elemChips ? '<p style="margin-top:3px;">' + elemChips + '</p>' : '') +
                            (feat ? '<p style="color:' + feat.color + '; font-size:0.8rem;">' + feat.icon + ' 主運強化【' + feat.name + '】：' + (featBoostText || '無') + '</p>' : '') +
                            '<p style="font-size:0.78rem; color:#94a3b8;">下層需求：Lv.' + needLv + ' & ' + cost.toLocaleString() + ' 武點</p>' +
                        '</div>' +
                        btnHtml;

                    if (lv === 0) {
                        card.querySelector('.btn-learn-xf').addEventListener('click', () => {
                            if (app.martialSys.upgradeXinfa(xf.id)) app.renderAll();
                        });
                    } else {
                        card.querySelector('.btn-active-xf').addEventListener('click', () => {
                            if (app.martialSys.setActiveXinfa(xf.id)) app.renderAll();
                        });
                        card.querySelector('.btn-up-xf').addEventListener('click', () => {
                            if (app.martialSys.upgradeXinfa(xf.id)) app.renderAll();
                        });
                    }
                    xfList.appendChild(card);
                });

                if (xfShown === 0) {
                    const empty = document.createElement('p');
                    empty.style.color = '#94a3b8';
                    empty.style.padding = '12px';
                    empty.textContent = '此門派分類下目前沒有可顯示的內功心法。';
                    xfList.appendChild(empty);
                }
            }

            // ══════════ 3. 輕功身法 ══════════
            const qgList = document.getElementById('qinggong-list');
            if (qgList && Data.QINGGONG) {
                qgList.innerHTML = '';
                const activeQgId = app.charSys.state.activeQinggong;
                let qgShown = 0;

                Data.QINGGONG.forEach(qg => {
                    if (!this.shouldShow(qg, qgFilter, charSect)) return;
                    qgShown += 1;

                    const lv = app.charSys.state.qinggong[qg.id] || 0;
                    const isActive = activeQgId === qg.id;
                    const cost = app.martialSys.getQinggongCost(qg.id);
                    const needLv = app.martialSys.getQinggongReqLv(qg.id);
                    const lockedByLv = charLv < needLv;
                    const lockedBySect = qg.sectReq && charSect !== qg.sectReq;
                    const reqSectName = qg.sectReq ? this.sectName(qg.sectReq) : '江湖共通';

                    let tierLabel = '';
                    if (qg.sectReq) {
                        const m = /_(\d+)$/.exec(qg.id);
                        if (m) tierLabel = '第 ' + m[1] + '/3 階';
                    }

                    let btnText = lv > 0 ? '⬆️ 精進身法 (' + cost.toLocaleString() + ')' : '🍃 修習身法 (' + cost.toLocaleString() + ')';
                    if (lockedBySect) btnText = '🚫 限【' + reqSectName + '】弟子';
                    else if (lockedByLv) btnText = '🔒 需 Lv.' + needLv + ' 解鎖';

                    const tagBits = [];
                    if (tierLabel) tagBits.push(tierLabel);
                    tagBits.push('Lv.' + (qg.reqLv || 1) + '+');
                    tagBits.push(reqSectName);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.dataset.artId = qg.id;
                    card.style.borderColor = lockedBySect ? '#334155' : (isActive ? '#f59e0b' : (lv > 0 ? '#10b981' : '#2e3b4e'));
                    card.style.opacity = lockedBySect ? '0.6' : '1';

                    let actionHtml = '<button class="btn-primary btn-up-qg" ' + ((lockedBySect || lockedByLv) ? 'disabled' : '') + '>' + btnText + '</button>';
                    if (lv > 0) {
                        actionHtml =
                            '<div class="btn-group-row">' +
                                '<button class="btn-primary btn-active-qg" ' + (isActive ? 'disabled' : '') + '>' +
                                    (isActive ? '🍃 常駐中 (×1.3)' : '🍃 設為常駐身法') +
                                '</button>' +
                                '<button class="action-btn btn-up-qg" ' + (lockedByLv ? 'disabled' : '') + '>' +
                                    (lockedByLv ? '🔒 需 Lv.' + needLv : '⬆️ 精進 (' + cost.toLocaleString() + ')') +
                                '</button>' +
                            '</div>';
                    }

                    const baseEff = this.formatScaledBonus(qg.bonus, MARTIAL_DIV);
                    const elemChips = this.formatElementChips(qg.elAtk, qg.elDef);
                    const feat = this.featOf(qg.sectReq);
                    const featBoostText = this.formatFeatBoost(qg.featBoost);

                    card.innerHTML =
                        '<div>' +
                            '<h4>🍃 ' + qg.name + ' <small style="color:#10b981;">[' + tagBits.join(' | ') + ']</small> ' +
                            (lv > 0 ? '<span class="sp-color">(第 ' + lv + ' 境)</span>' : '<span style="color:#64748b;">(未修煉)</span>') +
                            (isActive ? ' <span style="color:#fbbf24;">[🌟常駐中]</span>' : '') + '</h4>' +
                            '<p>' + qg.desc + '</p>' +
                            (baseEff ? '<p style="color:#4ade80; font-size:0.8rem;">每級提升：' + baseEff + '</p>' : '') +
                            (elemChips ? '<p style="margin-top:3px;">' + elemChips + '</p>' : '') +
                            (feat ? '<p style="color:' + feat.color + '; font-size:0.8rem;">' + feat.icon + ' 常駐強化【' + feat.name + '】：' + (featBoostText || '無') + '</p>' : '') +
                            '<p style="font-size:0.78rem; color:#94a3b8;">下境需求：Lv.' + needLv + ' & ' + cost.toLocaleString() + ' 武點</p>' +
                        '</div>' +
                        actionHtml;

                    const activeBtn = card.querySelector('.btn-active-qg');
                    if (activeBtn) {
                        activeBtn.addEventListener('click', () => {
                            if (app.martialSys.setActiveQinggong(qg.id)) app.renderAll();
                        });
                    }
                    card.querySelector('.btn-up-qg').addEventListener('click', () => {
                        if (app.martialSys.upgradeQinggong(qg.id)) app.renderAll();
                    });
                    qgList.appendChild(card);
                });

                if (qgShown === 0) {
                    const empty = document.createElement('p');
                    empty.style.color = '#94a3b8';
                    empty.style.padding = '12px';
                    empty.textContent = '此門派分類下目前沒有可顯示的輕功身法。';
                    qgList.appendChild(empty);
                }
            }

            // ══════════ 4. 武道專精 ══════════
            //   ⭐ v48：補上數值顯示（見下方主控台提醒）
            const masList = document.getElementById('mastery-list');
            if (masList && Data.MASTERY) {
                masList.innerHTML = '';
                Data.MASTERY.forEach(ms => {
                    const lv = app.charSys.state.qinggong[ms.id] || 0;
                    const cost = app.martialSys.getMasteryCost(ms.id);
                    const needLv = app.martialSys.getMasteryReqLv(ms.id);
                    const lockedByLv = charLv < needLv;

                    // 數值屬性（÷5）＋ 元素徽章
                    const numText = this.formatScaledBonus(ms.bonus, MASTERY_DIV);
                    const elemChips = this.formatElementChips(ms.bonus.elAtk, ms.bonus.elDef);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = lv > 0 ? '#38bdf8' : '#2e3b4e';
                    card.innerHTML =
                        '<div>' +
                            '<h4>🎯 ' + ms.name + ' <small style="color:#38bdf8;">[' + (ms.category || '專精') + ' | Lv.' + ms.reqLv + '+]</small> ' +
                            (lv > 0 ? '<span class="sp-color">(第 ' + lv + ' 境)</span>' : '<span style="color:#64748b;">(未修習)</span>') + '</h4>' +
                            '<p>' + ms.desc + '</p>' +
                            (numText ? '<p style="color:#cbd5e1; font-size:0.8rem;">每級提升：' + numText + '</p>' : '') +
                            (elemChips ? '<p style="margin-top:3px;">' + elemChips + '</p>' : '') +
                            '<p style="font-size:0.78rem; color:#94a3b8;">下境需求：Lv.' + needLv + ' & ' + cost.toLocaleString() + ' 武點</p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + (lockedByLv ? 'disabled' : '') + '>' +
                            (lockedByLv ? '🔒 需 Lv.' + needLv + ' 解鎖' : (lv > 0 ? '⬆️ 精進專精 (' + cost.toLocaleString() + ')' : '🎯 修習專精 (' + cost.toLocaleString() + ')')) +
                        '</button>';
                    card.querySelector('button').addEventListener('click', () => {
                        if (app.martialSys.upgradeMastery(ms.id)) app.renderAll();
                    });
                    masList.appendChild(card);
                });
            }

            // ══════════ 5. 十四經脈 ══════════
            const merList = document.getElementById('meridian-list');
            if (merList && Data.MERIDIANS) {
                merList.innerHTML = '';
                const successPct = getMeridianSuccessPct();

                Data.MERIDIANS.forEach(m => {
                    const lv = app.charSys.state.meridians[m.id] || 0;
                    const cost = app.martialSys.getMeridianCost(m.id);
                    const needLv = app.martialSys.getMeridianReqLv(m.id);
                    const lockedByLv = charLv < needLv;

                    const numText = this.formatScaledBonus(m.bonus, MARTIAL_DIV);
                    const elemChips = this.formatElementChips(m.bonus.elAtk, m.bonus.elDef);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.innerHTML =
                        '<div>' +
                            '<h4>🧘 ' + m.name + ' <small style="color:#c89d54;">[Lv.' + m.reqLv + '+]</small> (第 ' + lv + ' 周天)</h4>' +
                            '<p>' + m.desc + '</p>' +
                            (numText ? '<p style="color:#cbd5e1; font-size:0.8rem;">每重提升：' + numText + '</p>' : '') +
                            (elemChips ? '<p style="margin-top:3px;">' + elemChips + '</p>' : '') +
                            '<p style="font-size:0.78rem; color:#94a3b8;">下周天需求：Lv.' + needLv + ' & ' + cost.toLocaleString() + ' 武點 | 衝脈成功率 ' + successPct + '%</p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + (lockedByLv ? 'disabled' : '') + '>' +
                            (lockedByLv ? '🔒 需 Lv.' + needLv + ' 衝穴' : '🧘 運功衝穴 (' + cost.toLocaleString() + ') [成功率' + successPct + '%]') +
                        '</button>';
                    card.querySelector('button').addEventListener('click', () => {
                        if (app.martialSys.upgradeMeridian(m.id)) app.renderAll();
                    });
                    merList.appendChild(card);
                });
            }
        }

        renderSectTab() {
            const Data = window.HY.Data;
            const app = this.app;
            const sList = document.getElementById('sect-list');
            if (!sList) return;
            sList.innerHTML = '';
            const charLv = app.charSys.state.lv;

            Object.values(Data.SECTS).forEach(sect => {
                const isCurrent = app.charSys.state.sect === sect.id;
                const reqLv = sect.reqLv || 10;
                const locked = charLv < reqLv;
                const bonusStr = app.equipSys.formatBonusText(sect.bonus);
                const feat = sect.feature;

                const treeHtml = (sect.skillTree || []).map((sId, idx) => {
                    const art = Data.MARTIAL_ARTS[sId];
                    if (!art) return '';
                    return '<span style="display:inline-block; background:#1a2434; border:1px solid #334155; padding:3px 8px; border-radius:4px; margin:2px 4px 2px 0; font-size:0.8rem; color:#38bdf8;">' +
                        '第' + (idx + 1) + '式：《' + art.name + '》<small style="color:#fbbf24;">(Lv.' + art.reqLv + ')</small></span>';
                }).join('');

                const xfHtml = Object.values(Data.XINFA || {})
                    .filter(x => x.sectReq === sect.id)
                    .map(x => '<span style="display:inline-block; background:#1a2434; border:1px solid #7c3aed; padding:3px 8px; border-radius:4px; margin:2px 4px 2px 0; font-size:0.78rem; color:#c4b5fd;">🔥《' + x.name + '》<small style="color:#fbbf24;">(Lv.' + x.reqLv + ')</small></span>')
                    .join('');

                const qgHtml = (Data.QINGGONG || [])
                    .filter(q => q.sectReq === sect.id)
                    .map(q => '<span style="display:inline-block; background:#1a2434; border:1px solid #10b981; padding:3px 8px; border-radius:4px; margin:2px 4px 2px 0; font-size:0.78rem; color:#6ee7b7;">🍃《' + q.name + '》<small style="color:#fbbf24;">(Lv.' + q.reqLv + ')</small></span>')
                    .join('');

                const featHtml = feat
                    ? '<div style="background:rgba(0,0,0,0.35); border-left:3px solid ' + feat.color + '; padding:8px; margin:8px 0; border-radius:4px;">' +
                        '<strong style="color:' + feat.color + '; font-size:0.9rem;">' + feat.icon + ' 專屬門派特色：【' + feat.name + '】</strong>' +
                        '<div style="font-size:0.82rem; color:#cbd5e1; margin-top:4px;">' + feat.desc + '</div>' +
                      '</div>'
                    : '';

                const card = document.createElement('div');
                card.className = 'card-item';
                card.style.borderColor = isCurrent ? '#00e5ff' : '#2e3b4e';

                card.innerHTML =
                    '<div>' +
                        '<h4>⛩️ ' + sect.name + ' <small style="color:#fbbf24;">[需 Lv.' + reqLv + '+]</small> ' +
                        (isCurrent ? '<span class="sci-color">【' + app.charSys.state.name + ' 當前師門】</span>' : '') + '</h4>' +
                        '<p style="margin:6px 0;">' + sect.desc + '</p>' +
                        featHtml +
                        '<p style="color:#10b981;">✨ 入門屬性加成：' + bonusStr + '</p>' +
                        '<div style="margin-top:6px;"><strong style="color:#c89d54; font-size:0.85rem;">📜 本門十式專屬絕學：</strong><div style="margin-top:4px;">' + treeHtml + '</div></div>' +
                        '<div style="margin-top:6px;"><strong style="color:#c4b5fd; font-size:0.85rem;">🔥 本門五階心法（主運強化特色）：</strong><div style="margin-top:4px;">' + xfHtml + '</div></div>' +
                        '<div style="margin-top:6px;"><strong style="color:#6ee7b7; font-size:0.85rem;">🍃 本門三階身法（常駐強化特色）：</strong><div style="margin-top:4px;">' + qgHtml + '</div></div>' +
                    '</div>' +
                    '<button class="btn-primary" ' + ((isCurrent || locked) ? 'disabled' : '') + '>' +
                        (isCurrent ? '✅ 已拜入此門派' : (locked ? '🔒 需達 Lv.' + reqLv + ' 拜師' : '⛩️ 讓【' + app.charSys.state.name + '】拜入師門')) +
                    '</button>';
                card.querySelector('button').addEventListener('click', () => {
                    if (app.charSys.joinSect(sect.id)) app.renderAll();
                });
                sList.appendChild(card);
            });
        }
    }

    window.HY.UIMartialSect = UIMartialSect;
})();