// js/uiGuild.js  (v45)
// 幫會分頁（八建築排班、招募、祝福、後天改命、神獸、鎮妖塔與秘境）
//
// v45 修正（收尾整理）：
//   ⭐ renderGuildTab(force)：僅在 #tab-guild 可見時才重繪
//      （避免每 15 秒幫會徵收時，即使玩家不在幫會分頁也重建整塊 DOM）
//   ⭐ GUILD_EVENT_COST 改讀 GameConfig.guild.guildEventCost
//   ⭐ 鎮妖塔推薦戰力改讀 GameConfig.guild.towerFloorPower
window.HY = window.HY || {};

(function () {
    function cfgGuild(key, fallback) {
        var G = window.HY && window.HY.GameConfig;
        if (G && G.guild && typeof G.guild[key] === 'number') return G.guild[key];
        return fallback;
    }

    class UIGuild {
        constructor(app) {
            this.app = app;
            this.currentSubTab = 'g-sub-buildings';
            this.injectGuildDOM();
        }

        injectGuildDOM() {
            const tabNav = document.getElementById('tab-nav');
            const centerStage = document.getElementById('center-stage');
            if (!tabNav || !centerStage) return;

            if (!document.getElementById('tab-guild')) {
                const tabBtn = document.createElement('button');
                tabBtn.className = 'tab-btn';
                tabBtn.dataset.tab = 'tab-guild';
                tabBtn.style.borderColor = '#f59e0b';
                tabBtn.innerHTML = '🏯 鐵血幫會';
                tabNav.appendChild(tabBtn);

                const tabContent = document.createElement('div');
                tabContent.id = 'tab-guild';
                tabContent.className = 'tab-content';
                tabContent.innerHTML =
                    '<div id="guild-header-banner" style="background:#121822; border:1px solid #c89d54; border-radius:6px; padding:12px; margin-bottom:12px;"></div>' +
                    '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">' +
                        '<button class="action-btn g-sub-btn active" data-gsub="g-sub-buildings">🏗️ 八大建築排班</button>' +
                        '<button class="action-btn g-sub-btn" data-gsub="g-sub-members">👥 幫眾招募</button>' +
                        '<button class="action-btn g-sub-btn" data-gsub="g-sub-blessings" style="border-color:#38bdf8; color:#38bdf8;">✨ 幫會祝福 (單角限1)</button>' +
                        '<button class="action-btn g-sub-btn" data-gsub="g-sub-destiny" style="border-color:#f43f5e; color:#f87171;">🌌 幫會技能・後天改命</button>' +
                        '<button class="action-btn g-sub-btn" data-gsub="g-sub-beasts">🐉 鎮派神獸</button>' +
                        '<button class="action-btn g-sub-btn" data-gsub="g-sub-realms">🗼 鎮妖塔 & 秘境</button>' +
                    '</div>' +
                    '<div id="g-sub-buildings" class="g-sub-panel"></div>' +
                    '<div id="g-sub-members" class="g-sub-panel hidden"></div>' +
                    '<div id="g-sub-blessings" class="g-sub-panel hidden"></div>' +
                    '<div id="g-sub-destiny" class="g-sub-panel hidden"></div>' +
                    '<div id="g-sub-beasts" class="g-sub-panel hidden"></div>' +
                    '<div id="g-sub-realms" class="g-sub-panel hidden"></div>';

                centerStage.appendChild(tabContent);

                tabContent.querySelectorAll('.g-sub-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        tabContent.querySelectorAll('.g-sub-btn').forEach(b => b.classList.remove('active'));
                        tabContent.querySelectorAll('.g-sub-panel').forEach(p => p.classList.add('hidden'));
                        btn.classList.add('active');
                        this.currentSubTab = btn.dataset.gsub;
                        const target = document.getElementById(btn.dataset.gsub);
                        if (target) target.classList.remove('hidden');
                        this.renderGuildTab(true);   // ⭐ 子分頁切換 → 強制重繪
                    });
                });
            }
        }

        // ⭐ v45：force 預設 false → 若幫會分頁不可見則直接 return
        renderGuildTab(force) {
            const app = this.app;
            const Data = window.HY.Data;
            if (!app.guildCore) return;

            // 僅在 #tab-guild 為 active 時才重繪（避免 15 秒定時器在背景重建 DOM）
            if (!force) {
                const tabEl = document.getElementById('tab-guild');
                if (!tabEl || !tabEl.classList.contains('active')) return;
            }

            const curChar = app.charSys.state;
            app.guildSkillBeast.ensureCharGuildState(curChar);
            const g = app.guildCore.getGuild();
            const gBonus = app.guildSkillBeast.getGuildBonusForChar(curChar);
            const nextRecruitCost = app.guildCore.getNextRecruitGoldCost();
            const GUILD_EVENT_COST = cfgGuild('guildEventCost', 1000);       // ⭐ v45
            const TOWER_FLOOR_POWER = cfgGuild('towerFloorPower', 850);      // ⭐ v45

            // 1. 頂部幫會總覽橫幅
            const bannerEl = document.getElementById('guild-header-banner');
            if (bannerEl) {
                const activeBlObj = (Data.GUILD_BLESSINGS || []).find(b => b.id === curChar.activeBlessing);
                const activeBlName = activeBlObj ? activeBlObj.name + ' (Lv.' + (curChar.guildBlessings[curChar.activeBlessing] || 1) + ')' : '尚未選擇祝福';

                bannerEl.innerHTML =
                    '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                        '<div>' +
                            '<h3 style="margin:0; color:#fbbf24; font-size:1.08rem;">🏯 【' + g.name + '】 幫會總舵 Lv.' + g.lv + ' <small style="color:#94a3b8;">(經驗: ' + g.exp.toLocaleString() + '/' + g.maxExp.toLocaleString() + ' | 建築/祝福/技能等級上限: Lv.' + g.lv + ')</small></h3>' +
                            '<div style="font-size:0.82rem; color:#38bdf8; margin-top:4px;">' +
                                '💰 幫會資金：<strong>' + g.funds.toLocaleString() + '</strong> | 🎖️ 幫會貢獻：<strong>' + g.contrib.toLocaleString() + '</strong> | ' +
                                '🌿 靈草：<strong style="color:#4ade80;">' + g.herbs + '</strong> | ⛏️ 玄鐵：<strong style="color:#cbd5e1;">' + g.ores + '</strong> | ' +
                                '👥 幫眾：<strong>' + g.members.length + '人</strong> | 🗼 鎮妖塔：<strong>第 ' + (g.towerFloor || 1) + ' 層</strong>' +
                            '</div>' +
                            '<div style="font-size:0.8rem; color:#f43f5e; margin-top:3px;">👤 當前角色【' + curChar.name + '】生效祝福：<strong>' + activeBlName + '</strong> | 角色幫會總加成：' + app.equipSys.formatBonusText(gBonus) + '</div>' +
                        '</div>' +
                        '<div class="btn-group-row" style="flex-wrap:wrap;">' +
                            '<button id="btn-guild-harvest" class="btn-primary" style="background:#059669;">🌾 立即徵收產出</button>' +
                            '<button id="btn-guild-donate-1w" class="action-btn">🪙 捐獻 10,000 兩</button>' +
                            '<button id="btn-guild-donate-10w" class="action-btn" style="border-color:#fbbf24;">🪙 捐獻 100,000 兩</button>' +
                        '</div>' +
                    '</div>';

                bannerEl.querySelector('#btn-guild-harvest').addEventListener('click', () => {
                    app.guildBuilding.harvestAllBuildings(true);
                    app.renderAll();
                });
                bannerEl.querySelector('#btn-guild-donate-1w').addEventListener('click', () => {
                    if (app.guildCore.donateGold(10000)) app.renderAll();
                });
                bannerEl.querySelector('#btn-guild-donate-10w').addEventListener('click', () => {
                    if (app.guildCore.donateGold(100000)) app.renderAll();
                });
            }

            // 2. 八大建築
            const bPanel = document.getElementById('g-sub-buildings');
            if (bPanel && Data.GUILD_BUILDINGS) {
                bPanel.innerHTML =
                    '<p style="font-size:0.84rem; color:#94a3b8; margin-bottom:10px;">💡 建築規則：各類建築解鎖與最高升級上限嚴格對應「幫會總舵等級 (當前上限 Lv.' + g.lv + ')」；指派幫眾進駐即可每 15 秒自動產出資源！</p>' +
                    '<div id="guild-building-grid" class="enemy-grid"></div>';

                const bGrid = bPanel.querySelector('#guild-building-grid');
                Object.values(Data.GUILD_BUILDINGS).forEach(b => {
                    const unlocked = app.guildBuilding.isBuildingUnlocked(b.id);
                    const bLv = g.buildings[b.id] || 1;
                    const reachedCap = bLv >= g.lv;
                    const upCost = app.guildBuilding.getBuildingUpgradeCost(b.id);
                    const assignedList = app.guildBuilding.getAssignedMembers(b.id);
                    const workerNames = assignedList.map(m => '👤' + m.name).join('、') || '<span style="color:#ef4444;">(尚無成員駐守)</span>';

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = !unlocked ? '#334155' : (assignedList.length > 0 ? '#10b981' : '#2e3b4e');
                    card.style.opacity = unlocked ? '1' : '0.6';

                    let btnLabel = '🏗️ 擴建至 Lv.' + (bLv + 1) + ' (' + upCost.toLocaleString() + ' 資金)';
                    if (!unlocked) btnLabel = '🔒 需幫會總舵 Lv.' + b.reqGuildLv + ' 解鎖';
                    else if (reachedCap) btnLabel = '🔒 需總舵升至 Lv.' + (bLv + 1) + ' 方可擴建';

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + b.name + ' <span class="gold-color">(Lv.' + bLv + '/' + g.lv + ')</span> ' +
                            '<small style="color:#38bdf8;">[需總舵Lv.' + (b.reqGuildLv || 1) + ' | 駐守:' + assignedList.length + '人]</small></h4>' +
                            '<p>' + b.desc + '</p>' +
                            '<p style="color:#4ade80; font-size:0.8rem;">⚙️ ' + b.produceDesc + '</p>' +
                            '<div style="background:#18202c; padding:6px; border-radius:4px; font-size:0.78rem; margin-top:4px;">駐守幫眾：' + workerNames + '</div>' +
                        '</div>' +
                        '<button class="btn-primary btn-up-b" ' + ((!unlocked || reachedCap) ? 'disabled' : '') + '>' + btnLabel + '</button>';

                    card.querySelector('.btn-up-b').addEventListener('click', () => {
                        if (app.guildBuilding.upgradeBuilding(b.id)) app.renderAll();
                    });
                    bGrid.appendChild(card);
                });
            }

            // 3. 幫眾招募
            const mPanel = document.getElementById('g-sub-members');
            if (mPanel) {
                mPanel.innerHTML =
                    '<div class="combat-header-row" style="background:#121822; padding:12px; border-radius:6px; border:1px solid #38bdf8;">' +
                        '<div>' +
                            '<h4 style="color:#38bdf8;">👥 幫會堂口無限招賢</h4>' +
                            '<p style="font-size:0.82rem; color:#94a3b8;">目前已招募次數：' + (g.recruitedCount || 0) + ' 人 | 招募下一位所需紋銀：<strong class="gold-color">' + nextRecruitCost.toLocaleString() + ' 兩紋銀</strong></p>' +
                        '</div>' +
                        '<button id="btn-recruit-guild-member" class="btn-primary">🍶 招募第 ' + ((g.recruitedCount || 0) + 1) + ' 位幫眾 (' + nextRecruitCost.toLocaleString() + ' 兩)</button>' +
                    '</div>' +
                    '<h3>📋 幫眾成員生產排班表（下拉選擇派往已解鎖的幫會建築）</h3>' +
                    '<div id="guild-member-list" class="enemy-grid"></div>';

                mPanel.querySelector('#btn-recruit-guild-member').addEventListener('click', () => {
                    if (app.guildCore.recruitGuildMember()) app.renderAll();
                });

                const mGrid = mPanel.querySelector('#guild-member-list');
                g.members.forEach(m => {
                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = m.assignedTo ? '#10b981' : '#f59e0b';

                    let selectHtml = '<select class="sel-assign-building" style="background:#0f141c; color:#38bdf8; border:1px solid #475569; padding:6px; border-radius:4px; width:100%;">';
                    selectHtml += '<option value="idle"' + (!m.assignedTo ? ' selected' : '') + '>⛺ 總舵待命 (未指派生產)</option>';
                    Object.values(Data.GUILD_BUILDINGS).forEach(b => {
                        const isUnl = app.guildBuilding.isBuildingUnlocked(b.id);
                        selectHtml += '<option value="' + b.id + '"' + (m.assignedTo === b.id ? ' selected' : '') + (!isUnl ? ' disabled' : '') + '>' +
                            (isUnl ? '派往：' + b.name + ' (' + b.produceDesc + ')' : '🔒 ' + b.name + ' (需總舵Lv.' + b.reqGuildLv + ')') +
                        '</option>';
                    });
                    selectHtml += '</select>';

                    card.innerHTML =
                        '<div>' +
                            '<h4>👤 ' + m.name + '</h4>' +
                            '<p style="color:' + (m.assignedTo ? '#4ade80' : '#fbbf24') + ';">狀態：' +
                                (m.assignedTo && Data.GUILD_BUILDINGS[m.assignedTo] ? '⚙️ 正在【' + Data.GUILD_BUILDINGS[m.assignedTo].name + '】生產中' : '⛺ 閒置待命中') +
                            '</p>' +
                        '</div>' +
                        selectHtml;

                    card.querySelector('.sel-assign-building').addEventListener('change', (e) => {
                        app.guildBuilding.assignMemberToBuilding(m.id, e.target.value);
                        app.renderAll();
                    });
                    mGrid.appendChild(card);
                });
            }

            // 4. 幫會祝福
            const blPanel = document.getElementById('g-sub-blessings');
            if (blPanel && Data.GUILD_BLESSINGS) {
                blPanel.innerHTML =
                    '<div style="background:#18202c; border-left:4px solid #38bdf8; padding:10px; margin-bottom:12px; font-size:0.85rem;">' +
                        '👤 當前修習角色：<strong class="sci-color">【' + curChar.name + ' (Lv.' + curChar.lv + ')】</strong> — ' +
                        '幫會祝福在角色之間<strong>完全獨立不共享</strong>、每人同時<strong>只能選擇 1 個祝福生效</strong>，且祝福最高升級上限嚴格對應<strong>幫會總舵等級 (當前上限 Lv.' + g.lv + ')</strong>！' +
                    '</div>' +
                    '<div id="guild-blessing-grid" class="enemy-grid"></div>';

                const blGrid = blPanel.querySelector('#guild-blessing-grid');
                const maxLv = g.lv;

                Data.GUILD_BLESSINGS.forEach(bl => {
                    const lv = curChar.guildBlessings[bl.id] || 0;
                    const isActive = curChar.activeBlessing === bl.id;
                    const reachedCap = lv >= maxLv;
                    const cost = app.guildSkillBeast.getBlessingCost(bl.id, curChar);
                    const bonusStr = app.equipSys.formatBonusText(bl.bonusPerLv);   // ⭐ 顯示每級加成

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = isActive ? '#00e5ff' : (lv > 0 ? '#3b82f6' : '#2e3b4e');

                    let btnHtml = '';
                    if (lv === 0) {
                        btnHtml = '<button class="btn-primary btn-up-bl">✨ 為【' + curChar.name + '】點亮祝福 (' + cost.toLocaleString() + ' 幫貢)</button>';
                    } else {
                        btnHtml =
                            '<div class="btn-group-row">' +
                                '<button class="btn-primary btn-sel-bl" ' + (isActive ? 'disabled' : '') + '>' +
                                    (isActive ? '✅ 當前生效祝福' : '✨ 選為唯一生效祝福') +
                                '</button>' +
                                '<button class="action-btn btn-up-bl" ' + (reachedCap ? 'disabled' : '') + '>' +
                                    (reachedCap ? '🔒 需總舵 Lv.' + (lv + 1) : '⬆️ 升級 (' + cost.toLocaleString() + ' 幫貢)') +
                                '</button>' +
                            '</div>';
                    }

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + bl.name + ' ' +
                            (lv > 0 ? '<span class="sp-color">(Lv.' + lv + '/' + maxLv + ')</span>' : '<span style="color:#64748b;">(未點亮)</span>') +
                            (isActive ? ' <span class="sci-color">[🌟生效中]</span>' : '') + '</h4>' +
                            '<p>' + bl.desc + '</p>' +
                            '<p style="color:#38bdf8; font-size:0.8rem;">每級加成：' + bonusStr + '</p>' +
                        '</div>' +
                        btnHtml;

                    const selBtn = card.querySelector('.btn-sel-bl');
                    if (selBtn) {
                        selBtn.addEventListener('click', () => {
                            if (app.guildSkillBeast.selectCharActiveBlessing(bl.id)) app.renderAll();
                        });
                    }
                    card.querySelector('.btn-up-bl').addEventListener('click', () => {
                        if (app.guildSkillBeast.upgradeCharBlessing(bl.id)) app.renderAll();
                    });

                    blGrid.appendChild(card);
                });
            }

            // 5. 後天改命
            const dsPanel = document.getElementById('g-sub-destiny');
            if (dsPanel && Data.GUILD_DESTINY_SKILLS) {
                dsPanel.innerHTML =
                    '<div style="background:#18202c; border-left:4px solid #f43f5e; padding:10px; margin-bottom:12px; font-size:0.85rem;">' +
                        '👤 當前逆天改命角色：<strong style="color:#f87171;">【' + curChar.name + ' (Lv.' + curChar.lv + ')】</strong> — ' +
                        '每個角色<strong>單獨分開領悟、互不共享</strong>，且最高重數上限嚴格對應<strong>幫會總舵等級 (當前上限 第 ' + g.lv + ' 重)</strong>！' +
                    '</div>' +
                    '<div id="guild-destiny-grid" class="enemy-grid"></div>';

                const dsGrid = dsPanel.querySelector('#guild-destiny-grid');
                const maxLv = g.lv;

                Data.GUILD_DESTINY_SKILLS.forEach(ds => {
                    const lv = curChar.destinySkills[ds.id] || 0;
                    const reachedCap = lv >= maxLv;
                    const cost = app.guildSkillBeast.getDestinyCost(ds.id, curChar);
                    const bonusStr = app.equipSys.formatBonusText(ds.bonusPerLv);   // ⭐ 顯示每重加成

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = lv > 0 ? '#f43f5e' : '#2e3b4e';

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + ds.name + ' <small style="color:#fbbf24;">[' + ds.tier + ']</small> ' +
                            (lv > 0 ? '<span class="sp-color">(第 ' + lv + '/' + maxLv + ' 重)</span>' : '<span style="color:#64748b;">(未改命)</span>') + '</h4>' +
                            '<p>' + ds.desc + '</p>' +
                            '<p style="color:#38bdf8; font-size:0.8rem;">每重加成：' + bonusStr + '</p>' +
                            '<p style="color:#94a3b8; font-size:0.78rem;">下重突破需求：' + cost.toLocaleString() + ' 點幫會貢獻</p>' +
                        '</div>' +
                        '<button class="btn-primary" style="background:' + (lv > 0 ? '#e11d48' : '') + ';" ' + (reachedCap ? 'disabled' : '') + '>' +
                            (reachedCap ? '🔒 需總舵升至 Lv.' + (lv + 1) : (lv > 0 ? '⬆️ 突破改命重數 (' + cost.toLocaleString() + ' 幫貢)' : '🌌 為【' + curChar.name + '】逆天改命 (' + cost.toLocaleString() + ' 幫貢)')) +
                        '</button>';

                    card.querySelector('button').addEventListener('click', () => {
                        if (app.guildSkillBeast.upgradeCharDestinySkill(ds.id)) app.renderAll();
                    });
                    dsGrid.appendChild(card);
                });
            }

            // 6. 鎮幫神獸
            const beastPanel = document.getElementById('g-sub-beasts');
            if (beastPanel && Data.GUILD_BEASTS) {
                beastPanel.innerHTML = '<div id="guild-beast-grid" class="enemy-grid"></div>';
                const beastGrid = beastPanel.querySelector('#guild-beast-grid');

                Object.values(Data.GUILD_BEASTS).forEach(beast => {
                    const lv = g.beasts[beast.id] || 0;
                    const reachedCap = lv >= g.lv;
                    const isMain = g.activeBeast === beast.id;
                    const cost = app.guildSkillBeast.getBeastFeedCost(beast.id);
                    const bText = app.equipSys.formatBonusText(beast.bonusPerLv);

                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.style.borderColor = isMain ? '#10b981' : '#2e3b4e';

                    card.innerHTML =
                        '<div>' +
                            '<h4>' + beast.name + ' ' + (lv > 0 ? '<span class="gold-color">(Lv.' + lv + '/' + g.lv + ')</span>' : '<span style="color:#64748b;">(未喚醒)</span>') +
                            (isMain ? ' <span style="color:#10b981;">[鎮幫主神獸 1.25倍]</span>' : '') + '</h4>' +
                            '<p>' + beast.desc + '</p>' +
                            '<p style="color:#38bdf8;">每級光環：' + bText + '</p>' +
                            '<p style="font-size:0.8rem; color:#94a3b8;">培養消耗：🌿靈草 ' + cost.herbs + ' + ⛏️玄鐵 ' + cost.ores + '</p>' +
                        '</div>' +
                        '<div class="btn-group-row">' +
                            (lv > 0 ? '<button class="action-btn btn-set-beast" ' + (isMain ? 'disabled' : '') + '>' + (isMain ? '鎮幫庇佑中' : '設為主神獸') + '</button>' : '') +
                            '<button class="btn-primary btn-feed-beast" ' + (reachedCap ? 'disabled' : '') + '>' +
                                (reachedCap ? '🔒 需總舵 Lv.' + (lv + 1) : '🍖 靈草玄鐵餵養') +
                            '</button>' +
                        '</div>';

                    const setBeastBtn = card.querySelector('.btn-set-beast');
                    if (setBeastBtn) {
                        setBeastBtn.addEventListener('click', () => {
                            if (app.guildSkillBeast.setActiveBeast(beast.id)) app.renderAll();
                        });
                    }
                    card.querySelector('.btn-feed-beast').addEventListener('click', () => {
                        if (app.guildSkillBeast.feedGuildBeast(beast.id)) app.renderAll();
                    });
                    beastGrid.appendChild(card);
                });
            }

            // 7. 鎮妖神塔與秘境
            const rPanel = document.getElementById('g-sub-realms');
            if (rPanel && Data.GUILD_REALMS) {
                const curFloor = g.towerFloor || 1;
                const reqTowerPower = curFloor * TOWER_FLOOR_POWER;   // ⭐ v45
                const towerUnlocked = g.lv >= 3;

                rPanel.innerHTML =
                    '<div class="combat-header-row" style="background:#121822; padding:12px; border-radius:6px; border:1px solid #f43f5e; margin-bottom:12px;">' +
                        '<div>' +
                            '<h4 style="color:#f43f5e;">🗼 幫會鎮妖神塔・逐層鎮壓挑戰（當前第 ' + curFloor + ' 層 | 推薦戰力: ' + reqTowerPower + '）</h4>' +
                            '<p style="font-size:0.82rem; color:#94a3b8;">需幫會總舵 Lv.3 解鎖。每突破一層可獲武點、幫貢與幫會資金，每 5 層必掉 PoE 通貨！</p>' +
                        '</div>' +
                        '<button id="btn-climb-tower" class="btn-primary" style="background:#e11d48;" ' + (!towerUnlocked ? 'disabled' : '') + '>' +
                            (!towerUnlocked ? '🔒 需幫會總舵 Lv.3 解鎖' : '🗼 挑戰鎮妖塔第 ' + curFloor + ' 層') +
                        '</button>' +
                    '</div>' +
                    '<div class="combat-header-row" style="background:#121822; padding:12px; border-radius:6px; border:1px solid #a78bfa; margin-bottom:12px;">' +
                        '<div>' +
                            '<h4 style="color:#a78bfa;">🎲 幫會隨機江湖事件</h4>' +
                            '<p style="font-size:0.82rem; color:#94a3b8;">花費 ' + GUILD_EVENT_COST.toLocaleString() + ' 幫會資金派遣幫眾巡視觸發奇遇！</p>' +
                        '</div>' +
                        '<button id="btn-trigger-guild-event" class="btn-primary" style="background:#7c3aed;">🎲 派遣巡視觸發事件 (' + GUILD_EVENT_COST.toLocaleString() + '幫會資金)</button>' +
                    '</div>' +
                    '<h3>🌀 幫會專屬秘境探索</h3>' +
                    '<div id="guild-realm-grid" class="enemy-grid"></div>';

                rPanel.querySelector('#btn-climb-tower').addEventListener('click', () => {
                    const result = app.guildRealmEvent.challengeDemonTower();
                    if (result && result.ok) app.renderAll();
                });

                rPanel.querySelector('#btn-trigger-guild-event').addEventListener('click', () => {
                    const events = Data.GUILD_EVENTS || [];
                    if (events.length === 0) {
                        app.logger.add('⚠️ 目前尚無可觸發的幫會事件資料，已取消扣款。', 'system');
                        return;
                    }
                    if (g.funds < GUILD_EVENT_COST) {
                        app.logger.add('❌ 幫會資金不足 ' + GUILD_EVENT_COST.toLocaleString() + '，無法派遣巡視！', 'system');
                        return;
                    }
                    g.funds -= GUILD_EVENT_COST;
                    // ⭐ 手動呼叫不傳 isAuto → 全額獎勵
                    const ok = app.guildRealmEvent.triggerRandomGuildEvent();
                    if (!ok) {
                        g.funds += GUILD_EVENT_COST;
                        app.logger.add('↩️ 巡視未觸發任何事件，已退還 ' + GUILD_EVENT_COST.toLocaleString() + ' 幫會資金。', 'system');
                    }
                    app.renderAll();
                });

                const rGrid = rPanel.querySelector('#guild-realm-grid');
                Data.GUILD_REALMS.forEach(rm => {
                    const locked = g.lv < rm.reqGuildLv;
                    const card = document.createElement('div');
                    card.className = 'card-item';
                    card.innerHTML =
                        '<div>' +
                            '<h4>🌀 ' + rm.name + ' <small style="color:#fbbf24;">[需幫會 Lv.' + rm.reqGuildLv + '+]</small></h4>' +
                            '<p>' + rm.desc + '</p>' +
                            '<p style="color:#4ade80; font-size:0.8rem;">基礎獎勵：武點+' + rm.reward.sp + '、幫貢+' + rm.reward.contrib + '、靈草+' + rm.reward.herbs + '、玄鐵+' + rm.reward.ores + '</p>' +
                        '</div>' +
                        '<button class="btn-primary" ' + (locked ? 'disabled' : '') + '>' +
                            (locked ? '🔒 需幫會 Lv.' + rm.reqGuildLv : '⚔️ 率領幫眾探索 (' + rm.costFunds.toLocaleString() + ' 幫會資金)') +
                        '</button>';
                    card.querySelector('button').addEventListener('click', () => {
                        const result = app.guildRealmEvent.exploreGuildRealm(rm.id);
                        if (result && result.ok) app.renderAll();
                    });
                    rGrid.appendChild(card);
                });
            }
        }
    }

    window.HY.UIGuild = UIGuild;
})();