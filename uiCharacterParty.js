// js/uiCharacterParty.js  (v52)
// 左欄角色面板 + 角色欄／陣法分頁
//
// v52 修正：
//   ⭐ 陣法卡片新增 effectDesc（效果說明）與 origin（典籍出處）
window.HY = window.HY || {};

(function () {
    class UICharacterParty {
        constructor(app) { this.app = app; }

        sectName(sectId) {
            var Data = window.HY.Data || {};
            if (!sectId) return '無門無派';
            var s = Data.SECTS && Data.SECTS[sectId];
            return (s && s.name) ? s.name : '無門無派';
        }

        featInfo(sectId) {
            var Data = window.HY.Data || {};
            return (Data.SECTS && Data.SECTS[sectId]) ? Data.SECTS[sectId].feature : null;
        }

        buildRootBadge(rootId, rootLv, compact) {
            var Data = window.HY.Data;
            if (!rootId || !Data || !Data.SPIRIT_ROOTS || !Data.SPIRIT_ROOTS[rootId]) {
                return '<span style="color:#64748b; font-size:0.75rem;">無靈根</span>';
            }
            var r = Data.SPIRIT_ROOTS[rootId];
            return '<span style="display:inline-block; border:1px solid ' + r.color + '; color:' + r.color +
                '; background:rgba(0,0,0,0.35); padding:0 6px; border-radius:3px; font-size:0.74rem; margin-left:6px; vertical-align:middle;">' +
                r.icon + r.name + ' Lv.' + (rootLv || 1) + '</span>';
        }

        buildElementSummaryLine(charObj) {
            var es = window.HY.game && window.HY.game.elementSys;
            if (!es) return '';
            var s = es.getSummary(charObj);
            if ((s.totalAtk + s.totalDef) <= 0) return '';

            var atkTop = s.atkRows.slice(0, 2).map(function (r) {
                return r.icon + r.name + '攻' + r.val;
            }).join(' ');
            var defTop = s.defRows.slice(0, 2).map(function (r) {
                return r.icon + r.name + '抗' + r.val;
            }).join(' ');

            return '<span title="元素攻擊總 ' + s.totalAtk + ' / 元素抗性總 ' + s.totalDef + '" ' +
                'style="font-size:0.75rem; color:#94a3b8;">' +
                (atkTop ? '⚔️' + atkTop : '') +
                (atkTop && defTop ? ' ｜ ' : '') +
                (defTop ? '🛡️' + defTop : '') +
            '</span>';
        }

        buildReqChips(req, counts) {
            var Data = window.HY.Data;
            if (!req) return '<span style="color:#64748b; font-size:0.78rem;">無靈根限制</span>';

            var order = (Data && Data.ELEMENT_RING) ? Data.ELEMENT_RING : Object.keys(req);
            return order.map(function (k) {
                if (!req[k]) return '';
                var m = (Data.ELEMENTS && Data.ELEMENTS[k]) ? Data.ELEMENTS[k] : null;
                var have = counts[k] || 0;
                var ok = have >= req[k];
                var color = ok ? (m ? m.color : '#94a3b8') : '#ef4444';
                var bg = ok ? 'rgba(0,0,0,0.35)' : 'rgba(239,68,68,0.15)';
                return '<span title="' + (m ? m.name : k) + '：需 ' + req[k] + '，現有 ' + have + '" ' +
                    'style="display:inline-block; border:1px solid ' + color + '; color:' + color + '; background:' + bg +
                    '; padding:0 6px; border-radius:3px; font-size:0.75rem; margin:2px 4px 2px 0; white-space:nowrap;">' +
                    (m ? m.icon : '') + (m ? m.name : k) + ' ' + req[k] +
                    (ok ? '' : '<strong> (缺' + (req[k] - have) + ')</strong>') +
                '</span>';
            }).join('') || '<span style="color:#64748b; font-size:0.78rem;">無靈根限制</span>';
        }

        renderCharacterPanel() {
            const Data = window.HY.Data;
            const app = this.app;
            const st = app.charSys.state;
            const d = app.charSys.getDerivedStats();
            const activeComp = app.companionSys.getActiveCompanionInfo();
            const activeXinfa = app.martialSys.getActiveXinfaInfo();
            const activeQg = app.martialSys.getActiveQinggongInfo();
            const activePet = app.petSys.getActivePetInfo();
            const pSize = app.partySys.getPartySize();

            const badgeEl = document.getElementById('party-size-badge');
            if (badgeEl) badgeEl.textContent = '🚩 上陣人數：' + pSize + '人 (遭遇' + pSize + '敵)';

            const switcherEl = document.getElementById('sidebar-roster-switcher');
            if (switcherEl) {
                switcherEl.innerHTML = '';
                const allChars = app.rosterSys.getAllCharacters();
                const curIdx = app.charSys.rootState.activeCharIndex;
                allChars.forEach((c, idx) => {
                    const isSelected = idx === curIdx;
                    const inParty = app.partySys.isInParty(c.id);
                    const btn = document.createElement('button');
                    btn.className = 'action-btn';
                    btn.style.padding = '4px 8px';
                    btn.style.fontSize = '0.78rem';
                    btn.style.borderColor = isSelected ? '#00e5ff' : (inParty ? '#10b981' : '#334155');
                    btn.style.background = isSelected ? 'rgba(0, 229, 255, 0.2)' : '#121822';
                    btn.innerHTML = (inParty ? '🚩' : '') + (idx + 1) + '.' + c.name + ' <small>(Lv.' + c.lv + ')</small>';
                    btn.addEventListener('click', () => { if (app.rosterSys.selectCharacter(idx)) app.renderAll(); });
                    switcherEl.appendChild(btn);
                });
            }

            const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

            const nameEl = document.getElementById('char-name');
            if (nameEl) {
                if (window.HY.uiSpiritRoot && app.spiritRootSys) {
                    nameEl.textContent = st.name;
                } else {
                    nameEl.innerHTML = st.name + ' ' + this.buildRootBadge(st.spiritRoot, st.spiritRootLv, true);
                }
            }

            setText('char-sect', this.sectName(st.sect));
            setText('char-lv', st.lv);
            setText('char-exp', st.exp + ' / ' + st.maxExp);
            setText('char-power', d.powerScore);
            setText('hp-text', st.currentHp + ' / ' + d.maxHp);
            setText('mp-text', st.currentMp + ' / ' + d.maxMp);

            const hpBar = document.getElementById('hp-bar');
            if (hpBar) hpBar.style.width = Math.min(100, (st.currentHp / d.maxHp) * 100) + '%';
            const mpBar = document.getElementById('mp-bar');
            if (mpBar) mpBar.style.width = Math.min(100, (st.currentMp / d.maxMp) * 100) + '%';

            setText('stat-con', st.stats.con);
            setText('stat-str', st.stats.str);
            setText('stat-agi', st.stats.agi);
            setText('stat-int', st.stats.int);

            setText('stat-atk', d.atk);
            setText('stat-def', d.def);
            setText('stat-hit', d.hit + '%');
            setText('stat-eva', d.eva + '%');
            setText('stat-crit', d.crit + '%');
            setText('stat-critres', d.critRes + '%');
            setText('stat-critdmg', d.critDmg + '%');
            setText('stat-dmgred', d.dmgReduce + '%');

            setText('char-points', st.freePoints);
            setText('char-sp', app.charSys.rootState.sp);
            setText('char-gold', app.charSys.rootState.gold);

            setText('active-companion-name', activeComp ? activeComp.name + ' (Lv.' + activeComp.lv + ')' : '無');
            setText('active-xinfa-name', activeXinfa ? activeXinfa.name + ' (第' + activeXinfa.lv + '層)' : '未運功');
            setText('active-qinggong-name', activeQg ? activeQg.name + ' (第' + activeQg.lv + '境)' : '未常駐');
            setText('active-pet-name', activePet ? activePet.name + ' (Lv.' + activePet.lv + ')' : '無');

            const feat = this.featInfo(st.sect);
            const featEl = document.getElementById('active-sect-feature');
            if (featEl) {
                if (feat) {
                    var stacks = '';
                    var featSys = window.HY.game && window.HY.game.sectFeatSys;
                    if (featSys && typeof featSys.getStacksSummary === 'function') {
                        stacks = featSys.getStacksSummary(st);
                    }
                    featEl.style.color = feat.color;
                    featEl.innerHTML = feat.icon + ' ' + feat.name + (stacks ? '（' + stacks + '）' : '');
                } else {
                    featEl.style.color = '#64748b';
                    featEl.textContent = '無門派特色（尚未拜師）';
                }
            }

            const rColors = { normal: '#e2e8f0', magic: '#60a5fa', rare: '#fbbf24', unique: '#f97316' };
            const eqSummaryEl = document.getElementById('sidebar-equip-summary');
            if (eqSummaryEl) {
                let html = '';
                Object.values(app.equipSys.SLOTS).forEach(slotInfo => {
                    const eqObj = st.equipment[slotInfo.id];
                    const itemName = (eqObj && eqObj.name)
                        ? '<span style="color:' + (rColors[eqObj.rarity] || '#e2e8f0') + ';">' + (eqObj.rareTitle || '') + eqObj.name + '</span>'
                        : '<span style="color:#64748b;">未穿戴</span>';
                    html += '<div>' + slotInfo.icon + ' ' + slotInfo.name + '：' + itemName + '</div>';
                });
                eqSummaryEl.innerHTML = html;
            }
        }

        // ══════════════════════════════════════════════
        // ⭐ 陣法列表（含效果說明與出處）
        // ══════════════════════════════════════════════
        renderFormationList(formEl, Data) {
            var app = this.app;
            var self = this;
            formEl.innerHTML = '';

            var allForms = app.partySys.getAllFormations();
            var counts = app.partySys.getPartyRootCounts();
            var seed = app.partySys.getSeed();

            var rootNames = Object.keys(counts).map(function (k) {
                var m = (Data.ELEMENTS && Data.ELEMENTS[k]) ? Data.ELEMENTS[k] : null;
                return (m ? m.icon : '') + (m ? m.name : k) + '×' + counts[k];
            }).join(' ');

            var seedBar = document.createElement('div');
            seedBar.style.cssText = 'grid-column:1/-1; background:#121822; border:1px solid #2e3b4e; border-radius:4px; ' +
                'padding:7px 10px; font-size:0.78rem; color:#94a3b8; display:flex; justify-content:space-between; ' +
                'align-items:center; gap:8px; flex-wrap:wrap;';
            seedBar.innerHTML =
                '<span>🌱 陣法種子：<strong style="color:#fbbf24;">#' + seed + '</strong>' +
                '（需求樣式本局固定，每局不同）</span>' +
                '<span>🚩 隊伍靈根：<strong style="color:#c084fc;">' + (rootNames || '無') + '</strong></span>';
            formEl.appendChild(seedBar);

            // 自由散陣
            var noneEntry = allForms.filter(function (e) { return e.id === 'none'; })[0];
            if (noneEntry) {
                var c0 = document.createElement('div');
                c0.className = 'card-item';
                c0.style.borderColor = noneEntry.active ? '#c89d54' : '#2e3b4e';
                c0.innerHTML =
                    '<div>' +
                        '<h4>🚩 自由散陣' + (noneEntry.active ? ' <span class="gold-color">[啟用中]</span>' : '') + '</h4>' +
                        '<p>無特殊陣法約束，各憑本事迎敵。</p>' +
                        '<p style="color:#64748b; font-size:0.78rem;">需求：無靈根限制</p>' +
                    '</div>' +
                    '<button class="btn-primary" ' + (noneEntry.active ? 'disabled' : '') + '>' +
                        (noneEntry.active ? '陣法運轉中' : '啟用此陣法') +
                    '</button>';
                c0.querySelector('button').addEventListener('click', function () {
                    if (app.partySys.setFormation('none')) app.renderAll();
                });
                formEl.appendChild(c0);
            }

            // 十五陣法（依階級分組）
            [1, 2, 3].forEach(function (tier) {
                var tierMeta = (Data.FORMATION_TIER_LABEL && Data.FORMATION_TIER_LABEL[tier]) || { name: '陣法', color: '#94a3b8' };
                var tierForms = allForms.filter(function (e) {
                    return e.formation && e.formation.tier === tier;
                });
                if (tierForms.length === 0) return;

                var header = document.createElement('div');
                header.style.cssText = 'grid-column:1/-1; margin:6px 0 2px; font-size:0.85rem; font-weight:bold; color:' + tierMeta.color + ';">' +
                    '✦ ' + tierMeta.name + '（需求 ' + tierMeta.reqSize + ' 靈根）' +
                '</div>';
                formEl.appendChild(header);

                tierForms.forEach(function (entry) {
                    var f = entry.formation;
                    var reqChips = self.buildReqChips(entry.req, counts);
                    var bonusText = (Data.formatFormationBonus) ? Data.formatFormationBonus(f.bonus) : '';

                    var card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = entry.active ? '#00e5ff'
                        : (entry.activatable ? '#2e3b4e' : '#3f1d1d');
                    card.style.opacity = entry.activatable ? '1' : '0.72';

                    var btnLabel, btnDisabled = false;
                    if (entry.active) { btnLabel = '✅ 陣法運轉中'; btnDisabled = true; }
                    else if (!entry.activatable) { btnLabel = '🚫 靈根不足'; btnDisabled = true; }
                    else { btnLabel = '☯️ 啟用此陣法'; }

                    card.innerHTML =
                        '<div>' +
                            '<h4 style="color:' + (f.color || '#c89d54') + ';">' + f.icon + ' ' + f.name +
                                (entry.active ? ' <span class="sci-color">[啟用中]</span>' : '') +
                                (!entry.activatable ? ' <span style="color:#f87171;">[靈根不足]</span>' : '') +
                            '</h4>' +
                            '<p style="color:#94a3b8; font-size:0.78rem;">' + f.desc + '</p>' +
                            // ⭐ 效果說明
                            (f.effectDesc ? '<p style="color:#cbd5e1; font-size:0.79rem; margin-top:3px;">📖 效果：' + f.effectDesc + '</p>' : '') +
                            '<div style="margin:4px 0 2px;">' + reqChips + '</div>' +
                            (bonusText ? '<p style="color:#4ade80; font-size:0.8rem;">✨ 數值：' + bonusText + '</p>' : '') +
                            // ⭐ 出處
                            (f.origin ? '<p style="color:#64748b; font-size:0.72rem; font-style:italic; margin-top:2px;">📜 ' + f.origin + '</p>' : '') +
                        '</div>' +
                        '<button class="btn-primary" ' + (btnDisabled ? 'disabled' : '') + '>' + btnLabel + '</button>';

                    card.querySelector('button').addEventListener('click', function () {
                        if (app.partySys.setFormation(f.id)) app.renderAll();
                    });
                    formEl.appendChild(card);
                });
            });
        }

        renderPartyAndRosterTab() {
            const Data = window.HY.Data;
            const app = this.app;
            const listEl = document.getElementById('roster-party-list');
            if (!listEl) return;
            listEl.innerHTML = '';

            const allChars = app.rosterSys.getAllCharacters();
            const curIdx = app.charSys.rootState.activeCharIndex;
            const featSys = window.HY.game && window.HY.game.sectFeatSys;

            allChars.forEach((c, idx) => {
                const isSelected = idx === curIdx;
                const inParty = app.partySys.isInParty(c.id);
                const d = app.charSys.getDerivedStatsForChar(c);
                const feat = this.featInfo(c.sect);
                const stacks = (featSys && feat) ? featSys.getStacksSummary(c) : '';
                const elemLine = this.buildElementSummaryLine(c);

                const card = document.createElement('div');
                card.className = 'card-item';
                card.style.borderColor = isSelected ? '#00e5ff' : (inParty ? '#10b981' : '#2e3b4e');

                card.innerHTML =
                    '<div>' +
                        '<h4>' + (idx + 1) + '號欄位：' + c.name + ' ' + this.buildRootBadge(c.spiritRoot, c.spiritRootLv, true) + ' (Lv.' + c.lv + '/300) ' +
                        (isSelected ? '<span class="sci-color">[當前操控]</span> ' : '') +
                        (inParty ? '<span style="color:#10b981;">[🚩上陣中]</span>' : '<span style="color:#64748b;">[休息中]</span>') +
                        '</h4>' +
                        (feat ? '<p style="color:' + feat.color + '; font-size:0.8rem;">' + feat.icon + ' ' + feat.name + (stacks ? '（' + stacks + '）' : '') + '</p>' : '') +
                        '<p>門派：' + this.sectName(c.sect) + ' | 戰力：<strong style="color:#f43f5e;">' + d.powerScore + '</strong></p>' +
                        '<p>攻擊：<strong>' + d.atk + '</strong> | 防禦：<strong>' + d.def + '</strong> | 命中：<span style="color:#38bdf8;">' + d.hit + '%</span> | 閃避：' + d.eva + '% | 爆擊：' + d.crit + '% | 暴抗：<span style="color:#a78bfa;">' + d.critRes + '%</span></p>' +
                        (elemLine ? '<p>' + elemLine + '</p>' : '') +
                    '</div>' +
                    '<div class="btn-group-row">' +
                        '<button class="btn-primary btn-select-char" ' + (isSelected ? 'disabled' : '') + '>' +
                            (isSelected ? '👤 操控養成中' : '👤 切換操控') +
                        '</button>' +
                        '<button class="action-btn btn-toggle-party" style="border-color:' + (inParty ? '#f59e0b' : '#10b981') + ';">' +
                            (inParty ? '⛺ 退下休息' : '🚩 加入上陣') +
                        '</button>' +
                    '</div>';

                card.querySelector('.btn-select-char').addEventListener('click', () => {
                    if (app.rosterSys.selectCharacter(idx)) app.renderAll();
                });
                card.querySelector('.btn-toggle-party').addEventListener('click', () => {
                    if (app.partySys.togglePartyMember(c.id)) app.renderAll();
                });

                listEl.appendChild(card);
            });

            const formEl = document.getElementById('formation-list');
            if (formEl) {
                this.renderFormationList(formEl, Data);
            }
        }
    }

    window.HY.UICharacterParty = UICharacterParty;
})();