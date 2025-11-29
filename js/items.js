// Items and collectibles system

class ItemManager {
    constructor() {
        this.items = [];
        this.inventory = {
            keys: 0,
            artifacts: [],
            notes: [],
            lightSources: 1 // Start with one candle
        };
    }
    
    // Create item at position
    createItem(type, x, y, data = {}) {
        const item = {
            id: this.items.length,
            type: type,
            x: x,
            y: y,
            collected: false,
            visible: true,
            color: this.getItemColor(type),
            ...data
        };
        
        this.items.push(item);
        return item;
    }
    
    // Get item color based on type
    getItemColor(type) {
        const colors = {
            key: '#ffaa00',
            artifact: '#ff00ff',
            note: '#ffffff',
            candle: '#ff6600',
            torch: '#ff8800'
        };
        return colors[type] || '#ffffff';
    }
    
    // Check if player collected item
    checkCollection(playerX, playerY, collectionRadius = 0.5) {
        for (const item of this.items) {
            if (item.collected || !item.visible) continue;
            
            const dist = Utils.distance(playerX, playerY, item.x, item.y);
            if (dist < collectionRadius) {
                this.collectItem(item);
                return item;
            }
        }
        return null;
    }
    
    // Collect item
    collectItem(item) {
        if (item.collected) return;
        
        item.collected = true;
        item.visible = false;
        
        switch(item.type) {
            case 'key':
                this.inventory.keys++;
                break;
            case 'artifact':
                this.inventory.artifacts.push(item.id);
                break;
            case 'note':
                this.inventory.notes.push(item.id);
                break;
            case 'candle':
            case 'torch':
                this.inventory.lightSources++;
                break;
        }
    }
    
    // Spawn items in maze - HIGHER FREQUENCY
    spawnItemsInMaze(maze, count = 15) {
        this.items = [];
        
        // Spawn keys - increased from 5 to 15
        let keysSpawned = 0;
        for (let i = 0; i < count * 3; i++) { // Try more attempts to ensure we get all keys
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                const key = this.createItem('key', pos.x, pos.y);
                key.visible = true; // Explicitly ensure visibility
                keysSpawned++;
                if (keysSpawned >= count) break;
            }
        }
        console.log(`Spawned ${keysSpawned} keys out of ${count} requested`);
        
        // Spawn artifacts - increased from 2 to 8
        for (let i = 0; i < 8; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createItem('artifact', pos.x, pos.y, {
                    name: `Artifact ${i + 1}`,
                    description: 'A mysterious object pulsating with dark energy.'
                });
            }
        }
        
        // Spawn notes - increased from 3 to 10
        for (let i = 0; i < 10; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createItem('note', pos.x, pos.y, {
                    text: this.getRandomNoteText()
                });
            }
        }
        
        // Spawn light sources - increased from 2 to 6
        for (let i = 0; i < 6; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createItem('candle', pos.x, pos.y);
            }
        }
    }
    
    // Find valid spawn position in maze (using world coordinates)
    findValidSpawnPosition(maze, attempts = 20) {
        for (let i = 0; i < attempts; i++) {
            // Generate random grid coordinates
            const gridX = Utils.randomInt(1, maze.width - 2);
            const gridY = Utils.randomInt(1, maze.height - 2);
            
            // Convert to world coordinates
            const x = gridX * maze.cellSize + maze.cellSize / 2;
            const y = gridY * maze.cellSize + maze.cellSize / 2;
            
            if (maze.isPath(x, y)) {
                // Check if position is not too close to other items
                let tooClose = false;
                for (const item of this.items) {
                    if (Utils.distance(x, y, item.x, item.y) < 2) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    return { x, y };
                }
            }
        }
        return null;
    }
    
    // Get random note text
    getRandomNoteText() {
        const notes = [
            "The walls shift when I'm not looking...",
            "I've been here before. I'm sure of it.",
            "The shadows move. They're watching me.",
            "Time doesn't work here. Or maybe I don't.",
            "The key mocks me from the darkness.",
            "I can hear them laughing. Or is it me?",
            "Reality bends. The maze breathes.",
            "Each step takes me further from myself."
        ];
        return notes[Utils.randomInt(0, notes.length - 1)];
    }
    
    // Get all visible items
    getVisibleItems() {
        const visible = this.items.filter(item => item.visible && !item.collected);
        // Debug: log key count
        const keyCount = visible.filter(item => item.type === 'key').length;
        if (keyCount > 0 && Math.random() < 0.01) { // Log occasionally to avoid spam
            console.log(`Visible keys: ${keyCount}`);
        }
        return visible;
    }
    
    // Use light source (consume fuel)
    useLightSource() {
        if (this.inventory.lightSources > 0) {
            // Light sources are consumed over time, handled by game loop
            return true;
        }
        return false;
    }
    
    // Get inventory
    getInventory() {
        return this.inventory;
    }
    
    // Reset for new run
    reset() {
        this.items = [];
        this.inventory = {
            keys: 0,
            artifacts: [],
            notes: [],
            lightSources: 1
        };
    }
}
