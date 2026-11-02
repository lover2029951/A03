// js/uiCombatExplore.js  (v50)
// 時空探索地圖、內掛戰術下拉、戰鬥競技場
//
// v50 修正（收尾整理）：
//   ⭐ bindCfgField：無效輸入保留原值（與 main.js.bindCfg 一致）
//      —— 原本自身欄位 fallback 30、隊友欄位 fallback 0，行為不一致
window.HY = window.HY || {};

(function () {
    class UICombatExplore {
        constructor(app) { this.app = app; }

        // ⭐ v50：無效輸入（NaN）→ 不更新，保留原值
        bindCfgField(id, key, isNum, isBool) {
            var el = document.getElementById(id);
            if (!el) return;
            var app = this.app;
            el.onchange = function (e) {
                var cfg = app.combatSys.autoConfig;
                if (isBool) {
                    cfg[key] = e.target.checked;
                } else if (isNum) {
                    var parsed = parseInt(e.target.value, 10);
                    if (isNaN(parsed)) return;   // 保留原值
                    cfg[key] = parsed;
                } else {
                    cfg[key] = e.target.value;
                }
                app.logger.add('⚙️ 內掛戰術設定已更新：《' + key + '》', 'time');
            };
        }

        renderAutoTacticsSelects() {
            const Data = window.HY.Data;
            const app = this.app;
            const st = app.charSys.state;
            const cfg = app.combatSys.autoConfig;

            const validSkillIds = Object.keys(st.skills || { basic_punch: 1 }).filter(sId => {
                const art = Data.MARTIAL_ARTS[sId];
                return art && (!art.sectReq || art.sectReq === st.sect);
            });

            // ── ① 危急自保技 ──
            const emEl = document.getElementById('cfg-emerg-skill');
            if (emEl) {
                emEl.innerHTML =
                    '<option value="auto_heal">自動挑選已學回血招式</option>' +
                    '<option value="none">不特別切換</option>';
                validSkillIds.forEach(sId => {
                    const art = Data.MARTIAL_ARTS[sId];
                    const opt = document.createElement('option');
                    opt.value = sId;
                    opt.textContent = '指定：《' + art.name + '》' + (art.healRatio ? ' [回血]' : '');
                    emEl.appendChild(opt);
                });
                emEl.value = cfg.emergencySkillId;
            }

            // ── ② 群攻技 ──
            const aoeEl = document.getElementById('cfg-aoe-skill');
            if (aoeEl) {
                aoeEl.innerHTML =
                    '<option value="auto_aoe">自動挑選已學群攻(AOE)招式</option>' +
                    '<option value="none">不使用群攻優先</option>';
                validSkillIds.forEach(sId => {
                    const art = Data.MARTIAL_ARTS[sId];
                    const opt = document.createElement('option');
                    opt.value = sId;
                    opt.textContent = '指定：《' + art.name + '》' + (art.isAoe ? ' [群攻]' : '');
                    aoeEl.appendChild(opt);
                });
                aoeEl.value = cfg.aoeSkillId;
            }

            // ── ③ 平時主力技 ──
            const priEl = document.getElementById('cfg-primary-skill');
            if (priEl) {
                priEl.innerHTML = '<option value="auto_best">自動挑選最高傷害倍率招式</option>';
                validSkillIds.forEach(sId => {
                    const art = Data.MARTIAL_ARTS[sId];
                    const opt = document.createElement('option');
                    opt.value = sId;
                    opt.textContent = '固定施放：《' + art.name + '》 (耗內:' + art.mpCost + ')';
                    priEl.appendChild(opt);
                });
                priEl.value = cfg.primarySkillId;
            }

            // ── ④ 隊員補血/輔助技 ──
            const allySkillEl = document.getElementById('cfg-ally-skill');
            if (allySkillEl) {
                allySkillEl.innerHTML =
                    '<option value="auto_heal_ally">🤖 自動挑選（優先高回血／回內）</option>' +
                    '<option value="none">不使用隊員技能輔助</option>';
                validSkillIds.forEach(sId => {
                    const art = Data.MARTIAL_ARTS[sId];
                    const tags = [];
                    if (art.healRatio) tags.push('回血' + Math.round(art.healRatio * 100) + '%');
                    if (art.mpRestore) tags.push('回內+' + art.mpRestore);
                    if (art.critBonus) tags.push('暴擊+' + art.critBonus);
                    if (art.hitBonus) tags.push('命中+' + art.hitBonus);
                    const opt = document.createElement('option');
                    opt.value = sId;
                    opt.textContent = '《' + art.name + '》' + (tags.length ? ' [' + tags.join('/') + ']' : '');
                    allySkillEl.appendChild(opt);
                });
                allySkillEl.value = cfg.allyHealSkillId || 'auto_heal_ally';
            }

            // ── ⑤ 目標優先順序 ──
            const targetEl = document.getElementById('cfg-ally-target');
            if (targetEl) {
                targetEl.value = cfg.supportTargetRule || 'most_wounded';
            }

            // ── ⑥ 隊友藥品下拉 ──
            const allyHpItemEl = document.getElementById('cfg-ally-hp-item');
            if (allyHpItemEl && Data.ITEMS) {
                allyHpItemEl.innerHTML = '<option value="none">不使用</option>';
                Object.values(Data.ITEMS).forEach(item => {
                    if (item.type !== 'consumable') return;
                    if (item.expeditionOnly) return;
                    const eff = item.effect || {};
                    if (!eff.hp && !eff.mp) return;
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = item.name + ' (+' + (eff.hp || 0) + '血/+' + (eff.mp || 0) + '內)';
                    allyHpItemEl.appendChild(opt);
                });
                allyHpItemEl.value = cfg.allyHpItemId || 'pill_major';
            }

            const allyMpItemEl = document.getElementById('cfg-ally-mp-item');
            if (allyMpItemEl && Data.ITEMS) {
                allyMpItemEl.innerHTML = '<option value="none">不使用</option>';
                Object.values(Data.ITEMS).forEach(item => {
                    if (item.type !== 'consumable') return;
                    if (item.expeditionOnly) return;
                    const eff = item.effect || {};
                    if (!eff.hp && !eff.mp) return;
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = item.name + ' (+' + (eff.hp || 0) + '血/+' + (eff.mp || 0) + '內)';
                    allyMpItemEl.appendChild(opt);
                });
                allyMpItemEl.value = cfg.allyMpItemId || 'pill_major';
            }

            // ── ⑦ 表單值回填 ──
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

            setVal('cfg-ally-hp-pct', cfg.allyHpThreshold);
            setVal('cfg-ally-mp-pct', cfg.allyMpThreshold);
            setVal('cfg-ally-heal-pct', cfg.allyHealThreshold);
            setVal('cfg-ally-interval', cfg.allySupportInterval);
            setChk('cfg-ally-use-pills', cfg.allyUsePills);
            setChk('cfg-ally-support', cfg.allySupportEnabled);

            // ── ⑧ 綁定 ──
            this.bindCfgField('cfg-ally-hp-pct',   'allyHpThreshold',    true);
            this.bindCfgField('cfg-ally-mp-pct',   'allyMpThreshold',    true);
            this.bindCfgField('cfg-ally-hp-item',  'allyHpItemId',       false);
            this.bindCfgField('cfg-ally-mp-item',  'allyMpItemId',       false);
            this.bindCfgField('cfg-ally-use-pills','allyUsePills',       false, true);
            this.bindCfgField('cfg-ally-support',  'allySupportEnabled', false, true);
            this.bindCfgField('cfg-ally-heal-pct', 'allyHealThreshold',  true);
            this.bindCfgField('cfg-ally-skill',    'allyHealSkillId',    false);
            this.bindCfgField('cfg-ally-interval', 'allySupportInterval',true);
            this.bindCfgField('cfg-ally-target',   'supportTargetRule',  false);
        }

        buildHpmpBar(kind, cur, max, isEnemy) {
            var safeMax = (typeof max === 'number' && max > 0) ? max : 0;
            var safeCur = Math.max(0, Math.min(cur || 0, safeMax));
            var pct = safeMax > 0 ? (safeCur / safeMax) * 100 : 0;
            var isHp = (kind === 'hp');
            var cls = isHp
                ? ('hpmp-bar hp' + (isEnemy ? ' enemy-hp' : ''))
                : ('hpmp-bar mp' + (isEnemy ? ' enemy-mp' : ''));
            var label = (isHp ? '❤ ' : '💧 ') + Math.floor(safeCur).toLocaleString() + ' / ' + Math.floor(safeMax).toLocaleString();
            return '<div class="' + cls + '">' +
                '<div class="fi" style="width:' + pct.toFixed(1) + '%;"></div>' +
                '<div class="tx">' + label + '</div>' +
            '</div>';
        }

        renderExploreAndCombat() {
            const Data = window.HY.Data;
            const app = this.app;
            const curMap = app.timeSys.getCurrentMapData();
            const pSize = app.partySys.getPartySize();

            const badgeEl = document.getElementById('current-map-badge');
            if (badgeEl) badgeEl.textContent = '當前時空：' + curMap.name;

            const zoneTitleEl = document.getElementById('zone-title');
            if (zoneTitleEl) zoneTitleEl.textContent = '📍 ' + curMap.name + ' (推薦 Lv.' + curMap.minLv + '+ | 目前組隊 ' + pSize + ' 人將遭遇 ' + pSize + ' 名對手)';

            const zoneDescEl = document.getElementById('zone-desc');
            if (zoneDescEl) zoneDescEl.textContent = curMap.desc;

            const autoBtn = document.getElementById('btn-toggle-auto');
            if (autoBtn) {
                if (app.combatSys.isAutoBattle) {
                    autoBtn.classList.add('active');
                    autoBtn.textContent = '🤖 自動戰鬥運行中 (點擊停止)';
                } else {
                    autoBtn.classList.remove('active');
                    autoBtn.textContent = '🤖 開啟自動戰鬥';
                }
            }

            const mapListEl = document.getElementById('map-list');
            if (!mapListEl) return;
            mapListEl.innerHTML = '';

            const eras = Data.ERAS || [{ id: 'default', name: '時空地圖' }];
            eras.forEach(era => {
                const mapsInEra = Object.values(Data.MAPS).filter(m => m.era === era.id);
                if (mapsInEra.length === 0) return;

                const eraGroup = document.createElement('div');
                eraGroup.style.marginBottom = '10px';
                eraGroup.innerHTML = '<div style="font-size:0.82rem; color:#c89d54; margin-bottom:5px; font-weight:bold;">' + era.name + '</div>';

                const grid = document.createElement('div');
                grid.className = 'button-grid';
                grid.style.marginBottom = '4px';

                mapsInEra.forEach(m => {
                    const isCurrent = m.id === curMap.id;
                    const isLocked = app.charSys.state.lv < m.minLv;
                    const btn = document.createElement('button');
                    btn.className = 'action-btn';
                    btn.style.borderColor = isCurrent ? '#00e5ff' : (isLocked ? '#334155' : '#64748b');
                    btn.style.opacity = isLocked ? '0.55' : '1';
                    btn.style.background = isCurrent ? 'rgba(0, 229, 255, 0.18)' : '#1a2434';
                    btn.innerHTML = (isLocked ? '🔒 ' : (isCurrent ? '📍 ' : '')) + m.name + ' <small>(Lv.' + m.minLv + ')</small>';
                    btn.addEventListener('click', () => { if (app.timeSys.travelTo(m.id)) app.renderAll(); });
                    grid.appendChild(btn);
                });

                eraGroup.appendChild(grid);
                mapListEl.appendChild(eraGroup);
            });

            const enemyListEl = document.getElementById('enemy-list');
            const arenaEl = document.getElementById('battle-arena');
            if (!enemyListEl || !arenaEl) return;

            enemyListEl.classList.remove('hidden');
            arenaEl.classList.remove('hidden');

            enemyListEl.innerHTML = '';

            if (curMap.hasMedicalPod) {
                const podCard = document.createElement('div');
                podCard.className = 'card-item';
                podCard.style.borderColor = '#10b981';
                podCard.innerHTML =
                    '<div>' +
                        '<h4 style="color:#10b981;">🛸 奈米時空醫療艙</h4>' +
                        '<p>馬博士研發的星際醫療設備，可免費將全隊 5 名角色的氣血與內力瞬間恢復至 100%。</p>' +
                    '</div>' +
                    '<button class="btn-primary" style="background:#059669;">💚 全隊免費療傷</button>';
                podCard.querySelector('button').addEventListener('click', () => {
                    app.charSys.restoreAllPartyVitals(1.0);
                    app.logger.add('🛸 全隊角色躺入【奈米時空醫療艙】，氣血與內力已全部恢復至 100%！', 'gain');
                    app.renderAll();
                });
                enemyListEl.appendChild(podCard);
            }

            curMap.enemies.forEach(enemy => {
                const adjExp  = Math.max(1, Math.floor(enemy.exp / 5));
                const adjSp   = Math.max(1, Math.floor((enemy.sp / 10) * app.charSys.rewardRate));
                const adjGold = Math.max(1, Math.floor((enemy.gold / 10) * app.charSys.rewardRate));
                const skillNames = (enemy.skills || []).map(s => '《' + s.name + '》').join('、');
                const inBattle = !!app.combatSys.currentEnemy;
                const estMp = Math.floor(80 + (enemy.lv || 1) * 25 + (enemy.atk || 20) * 0.15);

                const card = document.createElement('div');
                card.className = 'card-item';
                card.innerHTML =
                    '<div>' +
                        '<h4>' + enemy.name + ' (Lv.' + enemy.lv + ')</h4>' +
                        '<p style="color:#00e5ff;">⛩️ 宗門：' + (enemy.faction || '江湖散人') + '</p>' +
                        '<p style="color:#f87171;">⚡ 絕技：' + (skillNames || '基礎武技') + '</p>' +
                        '<p style="color:#fbbf24; font-size:0.78rem;">👹 遭遇時有 35% 機率隨機附帶 1~3 種 PoE 精髓/紅獸/賽季詞綴</p>' +
                        '<p>基礎氣血：' + enemy.hp + ' | 基礎內力：' + estMp + '</p>' +
                        '<p>攻擊：' + enemy.atk + ' | 防禦：' + enemy.def + '</p>' +
                        '<p style="font-size:0.78rem; color:#94a3b8;">命中：' + (enemy.hit || 90) + '% | 閃避：' + (enemy.eva || 5) + '% | 爆擊：' + (enemy.crit || 5) + '% | 暴抗：' + (enemy.critRes || 0) + '%</p>' +
                        '<p>基礎獎勵：' + adjExp + ' 經驗 / ' + adjSp + ' 武點 / ' + adjGold + ' 兩</p>' +
                    '</div>' +
                    '<button class="btn-primary">' + (inBattle ? '⚔️ 重新挑戰 (' : '⚔️ 組隊挑戰 (') + pSize + 'v' + pSize + ')</button>';
                card.querySelector('button').addEventListener('click', () => app.combatSys.startBattle(enemy));
                enemyListEl.appendChild(card);
            });

            const partyBox = document.getElementById('battle-party-list');
            if (partyBox && partyBox.children.length === 0) {
                const partyMembers = app.partySys.getPartyMembers();
                partyMembers.forEach((m, idx) => {
                    const md = app.charSys.getDerivedStatsForChar(m);
                    const isMain = m.id === app.charSys.state.id;
                    const row = document.createElement('div');
                    row.className = 'fixed-unit-slot';
                    row.style.borderLeft = isMain ? '3px solid #00e5ff' : '3px solid #10b981';
                    row.innerHTML =
                        '<div style="font-size:0.8rem; flex-shrink:0;"><strong>' + (idx + 1) + '號：' + m.name + ' (Lv.' + m.lv + ')</strong></div>' +
                        this.buildHpmpBar('hp', m.currentHp, md.maxHp, false) +
                        this.buildHpmpBar('mp', m.currentMp, md.maxMp, false) +
                        '<div class="fixed-affix-line" style="color:#64748b;">等待交鋒中…</div>';
                    partyBox.appendChild(row);
                });
            }

            const enemyGroupTitle = document.getElementById('battle-enemy-group-title');
            if (enemyGroupTitle && !app.combatSys.currentEnemy) {
                enemyGroupTitle.textContent = '⚔️ 敵方陣營 (待命中 — 點擊上方對手開始交鋒)';
            }

            const activeComp = app.companionSys.getActiveCompanionInfo();
            const activeXinfa = app.martialSys.getActiveXinfaInfo();
            const activePet = app.petSys.getActivePetInfo();

            const xfTag = document.getElementById('battle-xinfa-tag');
            if (xfTag) xfTag.textContent = activeXinfa ? '🔥 主控心法：' + activeXinfa.name : '🔥 主控心法：未運功';
            const compTag = document.getElementById('battle-companion-tag');
            if (compTag) compTag.textContent = activeComp ? '🤝 隨行護法：' + activeComp.name + ' (' + activeComp.skillName + ')' : '🤝 隨行護法：無';
            const petTag = document.getElementById('battle-pet-tag');
            if (petTag) petTag.textContent = activePet ? '🐉 隨行靈獸：' + activePet.name + ' (' + activePet.skillName + ')' : '🐉 隨行靈獸：無';

            const pillCount = app.charSys.rootState.inventory.pill_hp || 0;
            const healBtn = document.getElementById('btn-heal-pill');
            if (healBtn) healBtn.textContent = '💊 服用行軍散 (' + pillCount + ')';
        }
    }

    window.HY.UICombatExplore = UICombatExplore;
})();