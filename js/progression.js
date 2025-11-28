// Meta-RPG progression system

class ProgressionManager {
    constructor() {
        this.saveData = this.loadSaveData();
    }
    
    // Load save data from localStorage
    loadSaveData() {
        const defaultData = {
            level: 1,
            experience: 0,
            totalRuns: 0,
            totalEscapes: 0,
            artifacts: [],
            upgrades: {
                candleDuration: 1.0,
                perception: 1.0,
                movementSpeed: 1.0,
                shadowEvasion: 1.0
            },
            achievements: [],
            unlockedThemes: ['default']
        };
        
        return Utils.getStorage('nightCageProgress', defaultData);
    }
    
    // Save progress
    saveProgress() {
        Utils.setStorage('nightCageProgress', this.saveData);
    }
    
    // Award experience after run
    awardExperience(amount, escaped = false) {
        this.saveData.experience += amount;
        this.saveData.totalRuns++;
        
        if (escaped) {
            this.saveData.totalEscapes++;
        }
        
        // Level up calculation (exponential)
        const expForNextLevel = this.saveData.level * 100;
        if (this.saveData.experience >= expForNextLevel) {
            this.saveData.level++;
            this.saveData.experience -= expForNextLevel;
            return true; // Leveled up
        }
        
        return false;
    }
    
    // Add artifact
    addArtifact(artifactId) {
        if (!this.saveData.artifacts.includes(artifactId)) {
            this.saveData.artifacts.push(artifactId);
        }
    }
    
    // Unlock upgrade
    unlockUpgrade(upgradeType, amount = 0.1) {
        if (this.saveData.upgrades[upgradeType] !== undefined) {
            this.saveData.upgrades[upgradeType] += amount;
        }
    }
    
    // Unlock achievement
    unlockAchievement(achievementId) {
        if (!this.saveData.achievements.includes(achievementId)) {
            this.saveData.achievements.push(achievementId);
            return true; // New achievement
        }
        return false;
    }
    
    // Check and award achievements
    checkAchievements(runStats) {
        const newAchievements = [];
        
        // First escape
        if (runStats.escaped && this.saveData.totalEscapes === 1) {
            if (this.unlockAchievement('first_escape')) {
                newAchievements.push('first_escape');
            }
        }
        
        // Speed run (escape in under 2 minutes)
        if (runStats.escaped && runStats.time < 120000) {
            if (this.unlockAchievement('speed_run')) {
                newAchievements.push('speed_run');
            }
        }
        
        // Collector (collect 10 items in one run)
        if (runStats.itemsCollected >= 10) {
            if (this.unlockAchievement('collector')) {
                newAchievements.push('collector');
            }
        }
        
        // Survivor (escape 10 times)
        if (this.saveData.totalEscapes >= 10) {
            if (this.unlockAchievement('survivor')) {
                newAchievements.push('survivor');
            }
        }
        
        // Explorer (spend 10 minutes total in mazes)
        const totalTime = this.saveData.totalRuns * (runStats.time || 0);
        if (totalTime > 600000) {
            if (this.unlockAchievement('explorer')) {
                newAchievements.push('explorer');
            }
        }
        
        return newAchievements;
    }
    
    // Get available upgrades for post-run selection
    getAvailableUpgrades() {
        return [
            {
                id: 'candleDuration',
                name: 'Extended Light',
                description: 'Increase candle duration by 20%',
                current: this.saveData.upgrades.candleDuration,
                cost: 50
            },
            {
                id: 'perception',
                name: 'Sharp Eyes',
                description: 'See further in the darkness',
                current: this.saveData.upgrades.perception,
                cost: 50
            },
            {
                id: 'movementSpeed',
                name: 'Swift Steps',
                description: 'Move 10% faster',
                current: this.saveData.upgrades.movementSpeed,
                cost: 50
            },
            {
                id: 'shadowEvasion',
                name: 'Shadow Sense',
                description: 'Detect shadows from further away',
                current: this.saveData.upgrades.shadowEvasion,
                cost: 50
            }
        ];
    }
    
    // Apply upgrade
    applyUpgrade(upgradeId) {
        const upgrade = this.getAvailableUpgrades().find(u => u.id === upgradeId);
        if (!upgrade) return false;
        
        // Check if player has enough experience (simplified)
        if (this.saveData.experience >= upgrade.cost) {
            this.unlockUpgrade(upgradeId, 0.1);
            this.saveData.experience -= upgrade.cost;
            this.saveProgress();
            return true;
        }
        
        return false;
    }
    
    // Get progression stats
    getStats() {
        return {
            level: this.saveData.level,
            experience: this.saveData.experience,
            totalRuns: this.saveData.totalRuns,
            totalEscapes: this.saveData.totalEscapes,
            artifacts: this.saveData.artifacts.length,
            achievements: this.saveData.achievements.length
        };
    }
    
    // Get upgrade multipliers
    getUpgradeMultipliers() {
        return this.saveData.upgrades;
    }
    
    // Reset all progress (for testing)
    resetProgress() {
        this.saveData = {
            level: 1,
            experience: 0,
            totalRuns: 0,
            totalEscapes: 0,
            artifacts: [],
            upgrades: {
                candleDuration: 1.0,
                perception: 1.0,
                movementSpeed: 1.0,
                shadowEvasion: 1.0
            },
            achievements: [],
            unlockedThemes: ['default']
        };
        this.saveProgress();
    }
}
