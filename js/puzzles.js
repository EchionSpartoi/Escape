// Puzzle system: locked doors, logic puzzles, pattern interpretation

class PuzzleManager {
    constructor() {
        this.puzzles = [];
        this.lockedDoors = [];
    }
    
    // Create locked door
    createLockedDoor(x, y, requiredKeys = 1, puzzleType = 'key') {
        const door = {
            id: this.lockedDoors.length,
            type: 'door',
            x: x,
            y: y,
            requiredKeys: requiredKeys,
            puzzleType: puzzleType, // 'key', 'sequence', 'pattern'
            unlocked: false,
            visible: true,
            puzzleData: null
        };
        
        // Initialize puzzle data based on type
        if (puzzleType === 'sequence') {
            door.puzzleData = {
                sequence: this.generateSequence(4),
                playerSequence: [],
                solved: false
            };
        } else if (puzzleType === 'pattern') {
            door.puzzleData = {
                pattern: this.generatePattern(),
                playerPattern: [],
                solved: false
            };
        }
        
        this.lockedDoors.push(door);
        this.puzzles.push(door);
        return door;
    }
    
    // Generate sequence puzzle
    generateSequence(length = 4) {
        const sequence = [];
        const directions = ['north', 'east', 'south', 'west'];
        for (let i = 0; i < length; i++) {
            sequence.push(directions[Utils.randomInt(0, directions.length - 1)]);
        }
        return sequence;
    }
    
    // Generate pattern puzzle
    generatePattern() {
        // Simple pattern: sequence of numbers or symbols
        const pattern = [];
        const symbols = [1, 2, 3, 4];
        for (let i = 0; i < 4; i++) {
            pattern.push(symbols[Utils.randomInt(0, symbols.length - 1)]);
        }
        return pattern;
    }
    
    // Check if player can unlock door
    checkDoorUnlock(door, playerX, playerY, inventory, interactionRadius = 0.8) {
        const dist = Utils.distance(playerX, playerY, door.x, door.y);
        if (dist > interactionRadius) return false;
        
        if (door.unlocked) return true;
        
        // Check based on puzzle type
        switch(door.puzzleType) {
            case 'key':
                if (inventory.keys >= door.requiredKeys) {
                    door.unlocked = true;
                    return true;
                }
                break;
                
            case 'sequence':
                // Player needs to input sequence (simplified - auto-solve for now)
                // In full implementation, would have UI for sequence input
                if (door.puzzleData && !door.puzzleData.solved) {
                    // For now, just check if player has enough keys as fallback
                    if (inventory.keys >= door.requiredKeys) {
                        door.unlocked = true;
                        door.puzzleData.solved = true;
                        return true;
                    }
                }
                break;
                
            case 'pattern':
                // Similar to sequence
                if (door.puzzleData && !door.puzzleData.solved) {
                    if (inventory.keys >= door.requiredKeys) {
                        door.unlocked = true;
                        door.puzzleData.solved = true;
                        return true;
                    }
                }
                break;
        }
        
        return false;
    }
    
    // Check if position is blocked by locked door
    isBlocked(x, y, inventory) {
        for (const door of this.lockedDoors) {
            if (door.unlocked) continue;
            
            const dist = Utils.distance(x, y, door.x, door.y);
            if (dist < 0.5) {
                // Try to unlock
                if (this.checkDoorUnlock(door, x, y, inventory)) {
                    return false; // Door unlocked, not blocked
                }
                return true; // Still locked, blocked
            }
        }
        return false;
    }
    
    // Spawn puzzles in maze
    spawnPuzzlesInMaze(maze, exitX, exitY) {
        this.puzzles = [];
        this.lockedDoors = [];
        
        // Create locked door near exit
        const doorX = exitX - 1;
        const doorY = exitY;
        
        if (maze.isPath(doorX, doorY)) {
            this.createLockedDoor(doorX, doorY, 3, 'key');
        }
        
        // Add a few more locked doors throughout maze
        for (let i = 0; i < 2; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createLockedDoor(pos.x, pos.y, Utils.randomInt(1, 2), 'key');
            }
        }
    }
    
    // Find valid spawn position
    findValidSpawnPosition(maze, attempts = 20) {
        for (let i = 0; i < attempts; i++) {
            const x = Utils.randomFloat(1, maze.width - 1);
            const y = Utils.randomFloat(1, maze.height - 1);
            
            if (maze.isPath(x, y)) {
                return { x, y };
            }
        }
        return null;
    }
    
    // Get all puzzles
    getPuzzles() {
        return this.puzzles;
    }
    
    // Get all locked doors for rendering
    getLockedDoors() {
        return this.lockedDoors;
    }
    
    // Get door at grid position (for rendering)
    getDoorAtPosition(gridX, gridY, cellSize) {
        // Convert grid coordinates to world coordinates (center of cell)
        const worldX = gridX * cellSize + cellSize / 2;
        const worldY = gridY * cellSize + cellSize / 2;
        
        for (const door of this.lockedDoors) {
            // Check if door is in this grid cell (within cellSize/2 distance)
            const dist = Utils.distance(worldX, worldY, door.x, door.y);
            if (dist < cellSize / 2) {
                return door;
            }
        }
        return null;
    }
    
    // Get door orientation (which wall face) based on adjacent cells
    getDoorOrientation(door, maze) {
        const gridX = Math.floor(door.x / maze.cellSize);
        const gridY = Math.floor(door.y / maze.cellSize);
        
        // Check adjacent cells to determine which wall face has the door
        const north = maze.getGridCell(gridX, gridY - 1);
        const south = maze.getGridCell(gridX, gridY + 1);
        const east = maze.getGridCell(gridX + 1, gridY);
        const west = maze.getGridCell(gridX - 1, gridY);
        
        // Door is on the wall between this cell and an adjacent wall cell
        if (north === 1) return 'north'; // Wall to the north
        if (south === 1) return 'south'; // Wall to the south
        if (east === 1) return 'east';   // Wall to the east
        if (west === 1) return 'west';   // Wall to the west
        
        // Default to north if unclear
        return 'north';
    }
    
    // Reset for new run
    reset() {
        this.puzzles = [];
        this.lockedDoors = [];
    }
}
