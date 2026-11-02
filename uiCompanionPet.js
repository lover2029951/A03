// js/uiCompanionPet.js  (v28)
// 群俠助戰與靈獸坐騎分頁
//
// v28 修正：
//   ⭐ 顯示的「光環/騎乘加成」改為「含成長的實際生效值」，
//      不再顯示 Lv.1 基礎值（避免數字與實際不符）。
window.HY = window.HY || {};

(function () {
    class UICompanionPet {
        constructor(app) {
            this.app = app;
        }

        renderPetTab() {
            const Data = window.HY.Data;
            const app = this.app;
            const petListEl = document.getElementById('pet-list');
            if (!petListEl || !Data.PETS) return;
            petListEl.innerHTML = '';

            app.petSys.ensureState();
            const ownedPets = app.charSys.rootState.pets;
            const activePetId = app.charSys.rootState.activePet;
            const maxCharLv = app.petSys.getMaxCharLv();

            Object.values(Data.PETS).forEach(pet => {
                const lv = ownedPets[pet.id] || 0;
                const isActive = activePetId === pet.id;
                const feedCost = app.petSys.getFeedCost(pet.id);
                const lockedAdopt = maxCharLv < (pet.reqLv || 1);
                const lockedFeed = maxCharLv < feedCost.reqLv;

                // ⭐ 顯示含成長的實際加成（已擁有時）；未擁有顯示 Lv.1 基礎值
                let bonusText;
                if (lv > 0) {
                    const scale = 1 + (lv - 1) * 0.16;
                    const grown = {};
                    Object.keys(pet.bonus).forEach(k => { grown[k] = Math.floor(pet.bonus[k] * scale); });
                    bonusText = app.equipSys.formatBonusText(grown) + ' <small style="color:#94a3b8;">(Lv.' + lv + ' 實際)</small>';
                } else {
                    bonusText = app.equipSys.formatBonusText(pet.bonus) + ' <small style="color:#94a3b8;">(Lv.1 基礎)</small>';
                }

                const card = document.createElement('div');
                card.className = 'card-item';
                card.style.borderColor = isActive ? '#10b981' : '#2e3b4e';

                let actionHtml = '';
                if (lv === 0) {
                    actionHtml = '<button class="btn-primary btn-adopt-pet" ' + (lockedAdopt ? 'disabled' : '') + '>' +
                        (lockedAdopt ? '🔒 需角色達 Lv.' + pet.reqLv + ' 解鎖' : '🐉 收服馴養 (' + pet.adoptGold + ' 兩紋銀)') +
                    '</button>';
                } else {
                    actionHtml =
                        '<div class="btn-group-row">' +
                            '<button class="btn-primary btn-active-pet" ' + (isActive ? 'disabled' : '') + '>' +
                                (isActive ? '🐎 隨行出戰中' : '🐉 召喚隨行') +
                            '</button>' +
                            '<button class="action-btn btn-feed-pet" ' + (lockedFeed ? 'disabled' : '') + '>' +
                                (lockedFeed ? '🔒 進化需 Lv.' + feedCost.reqLv : '🍖 餵養進化 (' + feedCost.gold + '兩/' + feedCost.sp + '武點)') +
                            '</button>' +
                        '</div>';
                }

                card.innerHTML =
                    '<div>' +
                        '<h4>' + pet.name + ' <small style="color:#10b981;">[需 Lv.' + pet.reqLv + '+ | ' + pet.species + ']</small> ' +
                        (lv > 0 ? '<span class="sp-color">(Lv.' + lv + ')</span>' : '<span style="color:#64748b;">(未收服)</span>') + '</h4>' +
                        '<p>' + pet.desc + '</p>' +
                        '<p>💥 靈獸戰技：<strong>《' + pet.skillName + '》</strong> | 騎乘加成：' + bonusText + '</p>' +
                    '</div>' +
                    actionHtml;

                if (lv === 0) {
                    card.querySelector('.btn-adopt-pet').addEventListener('click', () => {
                        if (app.petSys.adoptPet(pet.id)) app.renderAll();
                    });
                } else {
                    card.querySelector('.btn-active-pet').addEventListener('click', () => {
                        if (app.petSys.setActivePet(pet.id)) app.renderAll();
                    });
                    card.querySelector('.btn-feed-pet').addEventListener('click', () => {
                        if (app.petSys.feedPet(pet.id)) app.renderAll();
                    });
                }

                petListEl.appendChild(card);
            });
        }

        renderCompanionTab() {
            const Data = window.HY.Data;
            const app = this.app;
            const cList = document.getElementById('companion-list');
            if (!cList) return;
            cList.innerHTML = '';

            app.companionSys.ensureState();
            const recruited = app.charSys.rootState.companions;
            const activeId = app.charSys.rootState.activeCompanion;
            const maxCharLv = app.companionSys.getMaxCharLv();

            Object.values(Data.COMPANIONS).forEach(comp => {
                const lv = recruited[comp.id] || 0;
                const isActive = activeId === comp.id;
                const upCost = app.companionSys.getUpgradeCost(comp.id);
                const upReqLv = app.companionSys.getUpgradeReqLv(comp.id);
                const lockedRecruit = maxCharLv < (comp.reqLv || 1);
                const lockedUp = maxCharLv < upReqLv;

                // ⭐ 顯示含成長的實際光環
                let bonusText;
                if (lv > 0) {
                    const scale = 1 + (lv - 1) * 0.15;
                    const grown = {};
                    Object.keys(comp.passive).forEach(k => { grown[k] = Math.floor(comp.passive[k] * scale); });
                    bonusText = app.equipSys.formatBonusText(grown) + ' <small style="color:#94a3b8;">(默契 Lv.' + lv + ' 實際)</small>';
                } else {
                    bonusText = app.equipSys.formatBonusText(comp.passive) + ' <small style="color:#94a3b8;">(Lv.1 基礎)</small>';
                }

                const card = document.createElement('div');
                card.className = 'card-item';
                card.style.borderColor = isActive ? '#10b981' : (lv > 0 ? '#3b82f6' : '#2e3b4e');

                let actionButtonsHtml = '';
                if (lv === 0) {
                    actionButtonsHtml = '<button class="btn-primary btn-recruit" ' + (lockedRecruit ? 'disabled' : '') + '>' +
                        (lockedRecruit ? '🔒 需角色達 Lv.' + comp.reqLv + ' 結交' : '🍶 備禮結交 (' + comp.recruitGold + ' 兩紋銀)') +
                    '</button>';
                } else {
                    actionButtonsHtml =
                        '<div class="btn-group-row">' +
                            '<button class="btn-primary btn-set-active" ' + (isActive ? 'disabled' : '') + '>' +
                                (isActive ? '⚔️ 隨行護法中' : '🤝 設為隨行護法') +
                            '</button>' +
                            '<button class="action-btn btn-upgrade-comp" ' + (lockedUp ? 'disabled' : '') + '>' +
                                (lockedUp ? '🔒 升階需 Lv.' + upReqLv : '⬆️ 切磋升階 (' + upCost + ' 武點)') +
                            '</button>' +
                        '</div>';
                }

                card.innerHTML =
                    '<div>' +
                        '<h4>' + comp.name + ' <small style="color:#00e5ff;">[需 Lv.' + comp.reqLv + '+ | ' + comp.title + ']</small> ' +
                        (lv > 0 ? '<span class="sp-color">(默契 Lv.' + lv + ')</span>' : '<span style="color:#64748b;">(尚未結交)</span>') +
                        '</h4>' +
                        '<p>' + comp.desc + '</p>' +
                        '<p>✨ 助戰絕技：<strong>《' + comp.skillName + '》</strong> | 基礎光環：' + bonusText + '</p>' +
                    '</div>' +
                    actionButtonsHtml;

                if (lv === 0) {
                    card.querySelector('.btn-recruit').addEventListener('click', () => {
                        if (app.companionSys.recruit(comp.id)) app.renderAll();
                    });
                } else {
                    card.querySelector('.btn-set-active').addEventListener('click', () => {
                        if (app.companionSys.setActive(comp.id)) app.renderAll();
                    });
                    card.querySelector('.btn-upgrade-comp').addEventListener('click', () => {
                        if (app.companionSys.upgrade(comp.id)) app.renderAll();
                    });
                }

                cList.appendChild(card);
            });
        }
    }

    window.HY.UICompanionPet = UICompanionPet;
})();