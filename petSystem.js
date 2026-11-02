// js/petSystem.js
window.HY = window.HY || {};

(function () {
    class PetSystem {
        constructor(charSys, logger) {
            this.charSys = charSys;
            this.logger = logger;
        }

        ensureState() {
            if (!this.charSys.rootState.pets) {
                this.charSys.rootState.pets = {};
            }
            if (this.charSys.rootState.activePet === undefined) {
                this.charSys.rootState.activePet = null;
            }
        }

        getMaxCharLv() {
            var roster = (this.charSys.rootState && this.charSys.rootState.roster) || [this.charSys.state];
            var maxLv = 1;
            roster.forEach(function (c) {
                if (c.lv > maxLv) maxLv = c.lv;
            });
            return maxLv;
        }

        adoptPet(petId) {
            this.ensureState();
            var Data = window.HY.Data;
            var pet = Data.PETS && Data.PETS[petId];
            if (!pet) return false;

            var reqLv = pet.reqLv || 1;
            if (this.getMaxCharLv() < reqLv) {
                this.logger.add('🔒 實力不足以馴服異獸！需有角色達到 Lv.' + reqLv + ' 才能收服【' + pet.name + '】！', 'system');
                return false;
            }

            if (this.charSys.rootState.pets[petId]) {
                this.logger.add('⚠️ 你已經擁有【' + pet.name + '】了！', 'system');
                return false;
            }

            if (this.charSys.rootState.gold < pet.adoptGold) {
                this.logger.add('❌ 紋銀不足！購買馴獸靈糧與基因鎖需要 ' + pet.adoptGold + ' 兩紋銀。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= pet.adoptGold;
            this.charSys.rootState.pets[petId] = 1;

            if (!this.charSys.rootState.activePet) {
                this.charSys.rootState.activePet = petId;
            }

            this.charSys.clampVitals();
            this.logger.add('🐉 靈獸認主！你花費 ' + pet.adoptGold + ' 兩成功收服【' + pet.name + '】！', 'gain');
            return true;
        }

        getFeedCost(petId) {
            this.ensureState();
            var Data = window.HY.Data;
            var pet = Data.PETS[petId];
            var lv = this.charSys.rootState.pets[petId] || 1;
            return {
                gold: Math.floor(pet.feedGold * Math.pow(1.35, lv - 1)),
                sp: Math.floor(pet.feedSp * Math.pow(1.4, lv - 1)),
                reqLv: (pet.reqLv || 1) + lv * 2
            };
        }

        feedPet(petId) {
            this.ensureState();
            var Data = window.HY.Data;
            var pet = Data.PETS && Data.PETS[petId];
            var lv = this.charSys.rootState.pets[petId] || 0;
            if (!pet || lv <= 0) return false;

            var cost = this.getFeedCost(petId);
            if (this.getMaxCharLv() < cost.reqLv) {
                this.logger.add('🔒 馭獸境界不足！需有角色達到 Lv.' + cost.reqLv + ' 才能讓【' + pet.name + '】繼續進化！', 'system');
                return false;
            }
            if (this.charSys.rootState.gold < cost.gold) {
                this.logger.add('❌ 紋銀不足！購買靈獸飼料需要 ' + cost.gold + ' 兩紋銀。', 'system');
                return false;
            }
            if (this.charSys.rootState.sp < cost.sp) {
                this.logger.add('❌ 武點不足！為【' + pet.name + '】灌注真氣進化需要 ' + cost.sp + ' 武點。', 'system');
                return false;
            }

            this.charSys.rootState.gold -= cost.gold;
            this.charSys.rootState.sp -= cost.sp;
            this.charSys.rootState.pets[petId] = lv + 1;
            this.charSys.clampVitals();

            this.logger.add('🍖 靈獸進化！【' + pet.name + '】成長至 Lv.' + (lv + 1) + '，騎乘屬性與撲擊威力大增！', 'gain');
            return true;
        }

        setActivePet(petId) {
            this.ensureState();
            var Data = window.HY.Data;
            if (!this.charSys.rootState.pets[petId]) return false;

            this.charSys.rootState.activePet = petId;
            this.charSys.clampVitals();
            var pet = Data.PETS[petId];
            this.logger.add('🐎 已召喚【' + pet.name + '】隨行出戰！', 'system');
            return true;
        }

        getActivePetInfo() {
            this.ensureState();
            var Data = window.HY.Data;
            var id = this.charSys.rootState.activePet;
            if (!id || !Data.PETS || !Data.PETS[id]) return null;

            var pet = Data.PETS[id];
            var lv = this.charSys.rootState.pets[id] || 1;
            var scale = 1 + (lv - 1) * 0.16;

            var bonus = {};
            Object.keys(pet.bonus).forEach(function (k) {
                bonus[k] = Math.floor(pet.bonus[k] * scale);
            });

            return {
                id: pet.id,
                name: pet.name,
                species: pet.species,
                lv: lv,
                skillName: pet.skillName,
                effectType: pet.effectType,
                powerMult: pet.powerMult * (1 + (lv - 1) * 0.1),
                bonus: bonus
            };
        }
    }

    window.HY.PetSystem = PetSystem;
})();