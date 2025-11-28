// Hazards: shadow creatures, collapsing floors, flickering lights

class HazardManager {
    constructor() {
        this.hazards = [];
        this.shadowCreatures = [];
        this.collapsingFloors = [];
    }
    
    // Create shadow creature
    createShadowCreature(x, y, speed = 0.02) {
        const creature = {
            id: this.shadowCreatures.length,
            type: 'shadow',
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            speed: speed,
            visible: true,
            color: '#000000',
            chaseRadius: 8,
            attackRadius: 0.5,
            state: 'idle', // idle, chasing, attacking
            lastMoveTime: 0
        };
        
        this.shadowCreatures.push(creature);
        this.hazards.push(creature);
        return creature;
    }
    
    // Create collapsing floor
    createCollapsingFloor(x, y, width = 1, height = 1, triggerRadius = 1.5) {
        const floor = {
            id: this.collapsingFloors.length,
            type: 'collapsing',
            x: x,
            y: y,
            width: width,
            height: height,
            triggered: false,
            triggerRadius: triggerRadius,
            collapseTime: 0,
            visible: true,
            color: '#ff0000'
        };
        
        this.collapsingFloors.push(floor);
        this.hazards.push(floor);
        return floor;
    }
    
    // Update all hazards
    update(deltaTime, playerX, playerY, maze) {
        // Update shadow creatures
        for (const creature of this.shadowCreatures) {
            if (!creature.visible) continue;
            
            const distToPlayer = Utils.distance(creature.x, creature.y, playerX, playerY);
            
            // State machine
            if (distToPlayer < creature.attackRadius) {
                creature.state = 'attacking';
                // Player takes damage / dies
                return { type: 'death', reason: 'shadow_creature' };
            } else if (distToPlayer < creature.chaseRadius) {
                creature.state = 'chasing';
                // Move towards player
                const angle = Math.atan2(playerY - creature.y, playerX - creature.x);
                const moveX = Math.cos(angle) * creature.speed * deltaTime;
                const moveY = Math.sin(angle) * creature.speed * deltaTime;
                
                // Simple collision with walls
                const newX = creature.x + moveX;
                const newY = creature.y + moveY;
                
                if (!maze.isWall(newX, creature.y)) {
                    creature.x = newX;
                }
                if (!maze.isWall(creature.x, newY)) {
                    creature.y = newY;
                }
            } else {
                creature.state = 'idle';
                // Random movement
                if (Date.now() - creature.lastMoveTime > 2000) {
                    const angle = Math.random() * Math.PI * 2;
                    creature.targetX = creature.x + Math.cos(angle) * 2;
                    creature.targetY = creature.y + Math.sin(angle) * 2;
                    creature.lastMoveTime = Date.now();
                }
                
                // Move towards target
                const dx = creature.targetX - creature.x;
                const dy = creature.targetY - creature.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.1) {
                    const moveX = (dx / dist) * creature.speed * deltaTime * 0.5;
                    const moveY = (dy / dist) * creature.speed * deltaTime * 0.5;
                    
                    if (!maze.isWall(creature.x + moveX, creature.y)) {
                        creature.x += moveX;
                    }
                    if (!maze.isWall(creature.x, creature.y + moveY)) {
                        creature.y += moveY;
                    }
                }
            }
        }
        
        // Update collapsing floors
        for (const floor of this.collapsingFloors) {
            if (floor.triggered) {
                floor.collapseTime += deltaTime;
                
                // Check if player is on collapsing floor
                if (Utils.pointInRect(
                    playerX, playerY,
                    floor.x, floor.y, floor.width, floor.height
                )) {
                    if (floor.collapseTime > 1.0) {
                        return { type: 'death', reason: 'collapsing_floor' };
                    }
                }
            } else {
                // Check if player is in trigger radius
                const dist = Utils.distance(playerX, playerY, floor.x + floor.width/2, floor.y + floor.height/2);
                if (dist < floor.triggerRadius) {
                    floor.triggered = true;
                    // Audio cue for collapse
                }
            }
        }
        
        return null;
    }
    
    // Spawn hazards in maze
    spawnHazardsInMaze(maze, difficulty = 1) {
        this.hazards = [];
        this.shadowCreatures = [];
        this.collapsingFloors = [];
        
        // Spawn shadow creatures based on difficulty
        const creatureCount = Math.floor(2 + difficulty);
        for (let i = 0; i < creatureCount; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createShadowCreature(pos.x, pos.y, 0.02 + difficulty * 0.01);
            }
        }
        
        // Spawn collapsing floors
        const floorCount = Math.floor(1 + difficulty * 0.5);
        for (let i = 0; i < floorCount; i++) {
            const pos = this.findValidSpawnPosition(maze);
            if (pos) {
                this.createCollapsingFloor(pos.x, pos.y, 1, 1, 1.5);
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
    
    // Get all visible hazards
    getVisibleHazards() {
        return this.hazards.filter(hazard => hazard.visible);
    }
    
    // Reset for new run
    reset() {
        this.hazards = [];
        this.shadowCreatures = [];
        this.collapsingFloors = [];
    }
}
