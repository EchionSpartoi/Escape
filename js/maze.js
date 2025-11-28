// Procedural maze generation with surreal effects

class Maze {
    constructor(width = 400, height = 400, cellSize = 0.5, seed = null) {
        // Pre-seeded full maze - no chunks
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = [];
        this.visited = [];
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.rng = Utils.seededRandom(this.seed);
        this.surrealOffset = 0; // For breathing effect
        this.warpSeed = this.rng() * 1000;
        this.itemManager = null; // Will be set by game
    }
    
    // Set item manager reference for dynamic item spawning
    setItemManager(itemManager) {
        this.itemManager = itemManager;
    }
    
    // Generate full maze using recursive backtracking with seeded random
    generate(startX = 1, startY = 1) {
        this.grid = [];
        this.visited = [];
        
        // Reinitialize RNG with seed for reproducibility
        this.rng = Utils.seededRandom(this.seed);
        this.warpSeed = this.rng() * 1000;
        
        // Initialize grid (1 = wall, 0 = path)
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            this.visited[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 1; // Start with all walls
                this.visited[y][x] = false;
            }
        }
        
        // Clear spawn area FIRST before maze generation (small area to prevent room)
        this.clearSpawnArea(startX, startY);
        
        // Generate maze starting from start position
        this.carvePath(startX, startY);
        
        // Ensure spawn area is a hallway, not a room
        this.ensureHallwaySpawn();
        
        // Ensure exit exists (create path to edge)
        this.createExit();
        
        return this.grid;
    }
    
    // Clear spawn area - small 3x3 to prevent room formation, create narrow hallways
    clearSpawnArea(spawnX, spawnY) {
        // Clear only a small 3x3 area around spawn (not 9x9 to prevent room)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = spawnX + dx;
                const y = spawnY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    // Only clear cardinal directions and center (not corners to keep it narrow)
                    if (dx === 0 || dy === 0) {
                        this.grid[y][x] = 0;
                    }
                }
            }
        }
        
        // Create narrow hallways extending from spawn in all 4 directions
        const directions = [
            [10, 0],  // East
            [0, 10],  // South
            [-10, 0], // West
            [0, -10]  // North
        ];
        
        for (const [dx, dy] of directions) {
            const endX = spawnX + dx;
            const endY = spawnY + dy;
            
            // Clear narrow path from spawn to end point (single cell width)
            const steps = Math.max(Math.abs(dx), Math.abs(dy));
            for (let i = 0; i <= steps; i++) {
                const x = spawnX + Math.floor((dx * i) / steps);
                const y = spawnY + Math.floor((dy * i) / steps);
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.grid[y][x] = 0; // Single cell width - no adjacent clearing
                }
            }
        }
    }
    
    // Recursive backtracking algorithm - creates shorter hallways with more intersections
    carvePath(x, y, depth = 0) {
        this.grid[y][x] = 0; // Carve path
        this.visited[y][x] = true;
        
        const directions = [
            [0, -2], // North
            [2, 0],  // East
            [0, 2],  // South
            [-2, 0]  // West
        ];
        
        // Shuffle directions using seeded random
        directions = this.shuffleSeeded(directions);
        
        // Limit hallway length - allow longer corridors
        const maxDepth = 15; // Increased from 8 to allow longer hallways
        if (depth > maxDepth) {
            return; // Stop carving long hallways
        }
        
        // Count how many directions we can go
        let validDirections = [];
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isValidCell(nx, ny) && !this.visited[ny][nx]) {
                validDirections.push([dx, dy, nx, ny]);
            }
        }
        
        // Prefer creating intersections (T-junctions, crosses) when possible
        // If multiple directions available, carve more of them to create intersections
        let carved = 0;
        for (const [dx, dy, nx, ny] of validDirections) {
            // Carve wall between current and next cell
            this.grid[y + dy / 2][x + dx / 2] = 0;
            
            // If we have multiple options, carve more to create intersections
            if (validDirections.length > 1 && this.rng() < 0.65) {
                // Create intersection by carving this direction
                this.carvePath(nx, ny, depth + 1);
                carved++;
                // Don't carve all directions, leave some for variety
                if (carved >= 2 && this.rng() < 0.4) break;
            } else if (validDirections.length === 1 || this.rng() < 0.5) {
                // Continue hallway (but with depth limit to keep it short)
                this.carvePath(nx, ny, depth + 1);
                carved++;
                // Limit single-direction hallways
                break;
            }
        }
    }
    
    // Ensure spawn area is a narrow hallway, not a room
    ensureHallwaySpawn() {
        const spawnX = 1;
        const spawnY = 1;
        
        // Clear only a small 3x3 area (cardinal directions only, not corners)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = spawnX + dx;
                const y = spawnY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    // Only clear if it's in a cardinal direction (not diagonal corners)
                    if (dx === 0 || dy === 0) {
                        this.grid[y][x] = 0;
                    }
                }
            }
        }
        
        // Create narrow hallways in all 4 directions (single cell width)
        const directions = [
            [1, 0],   // East
            [0, 1],   // South
            [-1, 0],  // West
            [0, -1]   // North
        ];
        
        for (const [dx, dy] of directions) {
            // Clear at least 8 cells in each direction (narrow, single cell)
            for (let i = 1; i <= 8; i++) {
                const x = spawnX + dx * i;
                const y = spawnY + dy * i;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.grid[y][x] = 0; // Single cell width - no adjacent clearing
                } else {
                    break;
                }
            }
        }
    }
    
    // Add extra walls to make maze feel more cramped and narrow
    addDensityWalls() {
        // Randomly add some extra walls to create dead ends and narrow passages
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // If it's a path, randomly add walls around it (but not blocking main paths)
                if (this.grid[y][x] === 0 && this.rng() < 0.1) {
                    // Check if we can safely add a wall without blocking the only exit
                    const neighbors = [
                        this.grid[y-1][x], this.grid[y+1][x],
                        this.grid[y][x-1], this.grid[y][x+1]
                    ];
                    const pathCount = neighbors.filter(c => c === 0).length;
                    
                    // Only add wall if there are multiple paths (don't create dead ends)
                    if (pathCount >= 2) {
                        // Randomly block one direction
                        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
                        const dir = dirs[Math.floor(this.rng() * dirs.length)];
                        const nx = x + dir[0];
                        const ny = y + dir[1];
                        if (this.isValidCell(nx, ny) && this.grid[ny][nx] === 0) {
                            // Check if this would create a dead end
                            const nextNeighbors = [
                                this.grid[ny-1][nx], this.grid[ny+1][nx],
                                this.grid[ny][nx-1], this.grid[ny][nx+1]
                            ];
                            const nextPathCount = nextNeighbors.filter(c => c === 0).length;
                            if (nextPathCount > 1) {
                                this.grid[ny][nx] = 1; // Add wall
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Check if cell is valid and within bounds
    isValidCell(x, y) {
        return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
    }
    
    // Create exit path to edge
    createExit() {
        // Find a path cell near the edge
        const edges = [
            { x: this.width - 2, y: Math.floor(this.height / 2), dir: [1, 0] },
            { x: Math.floor(this.width / 2), y: this.height - 2, dir: [0, 1] },
            { x: 1, y: Math.floor(this.height / 2), dir: [-1, 0] },
            { x: Math.floor(this.width / 2), y: 1, dir: [0, -1] }
        ];
        
        for (const edge of edges) {
            if (this.grid[edge.y][edge.x] === 0) {
                // Carve exit
                const exitX = edge.x + edge.dir[0];
                const exitY = edge.y + edge.dir[1];
                if (exitX >= 0 && exitX < this.width && exitY >= 0 && exitY < this.height) {
                    this.grid[exitY][exitX] = 0;
                    this.exitX = exitX;
                    this.exitY = exitY;
                    return;
                }
            }
        }
    }
    
    // Get cell value at world coordinates (NO warping - for collision detection)
    getCell(worldX, worldY) {
        const x = Math.floor(worldX / this.cellSize);
        const y = Math.floor(worldY / this.cellSize);
        
        // Check bounds
        if (y < 0 || y >= this.height || !this.grid[y]) {
            return 1; // Out of bounds = wall
        }
        if (x < 0 || x >= this.width) {
            return 1; // Out of bounds = wall
        }
        
        return this.grid[y][x] || 1; // Default to wall if undefined
    }
    
    // Get cell value with visual warping (for rendering only)
    getCellWarped(worldX, worldY, playerX, playerY, lightRadius) {
        const dist = Utils.distance(worldX, worldY, playerX, playerY);
        
        // Only apply warping outside light radius
        let warpAmount = 0;
        if (dist > lightRadius) {
            // Increase warping with distance from light
            const warpFactor = Math.min(1, (dist - lightRadius) / lightRadius);
            warpAmount = warpFactor * 0.15; // Subtle warping
        }
        
        // Apply subtle warping effect
        const warpX = worldX + Math.sin(worldY * 0.1 + this.warpSeed) * warpAmount;
        const warpY = worldY + Math.cos(worldX * 0.1 + this.warpSeed) * warpAmount;
        
        const x = Math.floor(warpX / this.cellSize);
        const y = Math.floor(warpY / this.cellSize);
        
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 1; // Out of bounds = wall
        }
        
        return this.grid[y][x];
    }
    
    // Check if position is a wall (for collision - NO warping)
    // Can accept either world coordinates or grid coordinates
    isWall(x, y, isGridCoord = false) {
        if (isGridCoord) {
            // Direct grid coordinate access
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                return true; // Out of bounds = wall
            }
            return this.grid[y][x] === 1;
        } else {
            // World coordinates - convert to grid
            return this.getCell(x, y) === 1;
        }
    }
    
    // Check if position is a path (for collision - NO warping)
    isPath(worldX, worldY) {
        return this.getCell(worldX, worldY) === 0;
    }
    
    // Direct grid access (for raycasting)
    getGridCell(gridX, gridY) {
        // Check bounds
        if (gridY < 0 || gridY >= this.height || !this.grid[gridY]) {
            return 1; // Out of bounds = wall
        }
        if (gridX < 0 || gridX >= this.width) {
            return 1; // Out of bounds = wall
        }
        
        return this.grid[gridY][gridX] || 1; // Default to wall if undefined
    }
    
    // Get world position with surreal breathing effect (for rendering only)
    getWorldPosition(gridX, gridY, time = 0, playerX = 0, playerY = 0, lightRadius = 5) {
        const baseX = gridX * this.cellSize;
        const baseY = gridY * this.cellSize;
        
        // Only apply breathing effect outside light radius
        const dist = Utils.distance(baseX, baseY, playerX, playerY);
        let breathAmount = 0;
        if (dist > lightRadius) {
            const breathFactor = Math.min(1, (dist - lightRadius) / lightRadius);
            breathAmount = Math.sin(time * 0.3) * 0.01 * breathFactor; // Very subtle
        }
        
        const offsetX = baseX * breathAmount;
        const offsetY = baseY * breathAmount;
        
        return {
            x: baseX + offsetX,
            y: baseY + offsetY
        };
    }
    
    // Update surreal effects (visual only, no geometry changes)
    update(deltaTime, playerX, playerY) {
        this.surrealOffset += deltaTime * 0.02; // Much slower
        this.warpSeed += deltaTime * 0.01; // Much slower, more subtle
    }
    
    // Get spawn position (guaranteed to be in a hallway)
    getSpawnPosition() {
        // Spawn at position 1,1 which should be in a hallway after ensureHallwaySpawn()
        const startX = 1;
        const startY = 1;
        
        // Verify it's a path, if not make it one
        if (this.isValidCell(startX, startY)) {
            if (this.grid[startY][startX] !== 0) {
                this.grid[startY][startX] = 0;
            }
            
            return {
                x: startX * this.cellSize + this.cellSize / 2, // Center of cell
                y: startY * this.cellSize + this.cellSize / 2
            };
        }
        
        // Fallback
        return {
            x: this.cellSize + this.cellSize / 2,
            y: this.cellSize + this.cellSize / 2
        };
    }
    
    // Shuffle array using seeded random
    shuffleSeeded(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    // Get exit position
    getExitPosition() {
        if (this.exitX !== undefined && this.exitY !== undefined) {
            return {
                x: this.exitX * this.cellSize,
                y: this.exitY * this.cellSize
            };
        }
        return null;
    }
}
