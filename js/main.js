// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = 'menu'; // menu, playing, paused, gameover, progression
        this.running = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Game systems
        this.maze = null;
        this.player = null;
        this.renderer = null;
        this.itemManager = null;
        this.hazardManager = null;
        this.puzzleManager = null;
        this.dialogueManager = null;
        this.audioManager = null;
        this.progressionManager = null;
        
        // Game stats
        this.runStats = {
            startTime: 0,
            time: 0,
            itemsCollected: 0,
            escaped: false
        };
        
        // Candle/light system
        this.candleFuel = 100;
        this.maxCandleFuel = 100;
        // Candle should last 5 minutes (300 seconds) = 100 fuel / 300 seconds = 0.333 per second
        this.candleDepletionRate = 100 / 300; // ~0.333 per second for 5 minute duration
        
        // Minimap
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.exploredCells = [];
        this.minimapSize = 150;
        
        // Level system
        this.currentLevel = 1;
        this.maxLevel = 10;
        this.totalTime = 0; // Total time across all levels
        this.totalItemsCollected = 0; // Total items across all levels
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('Initializing game...');
        
        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize systems
        try {
            this.progressionManager = new ProgressionManager();
            console.log('Progression manager initialized');
            
            this.dialogueManager = new DialogueManager();
            console.log('Dialogue manager initialized');
            
            this.audioManager = new AudioManager();
            // Try to initialize audio, but don't fail if it doesn't work
            // Don't await - let it initialize in background (requires user interaction)
            console.log('Audio manager created (will initialize on first user interaction)');
            // Initialize audio in background (non-blocking)
            this.audioManager.initialize().catch(audioError => {
                console.warn('Audio initialization failed (non-critical):', audioError);
            });
            
            // Setup UI
            console.log('Setting up UI...');
            this.setupUI();
            this.initMinimap();
            console.log('UI setup complete');
            
            // Load settings
            console.log('Loading settings...');
            this.loadSettings();
            console.log('Game initialization complete');
        } catch (error) {
            console.error('Game initialization error:', error);
            alert('Game initialization failed. Check console for details.');
        }
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        // Optimize canvas size for mobile
        const isMobile = window.innerWidth <= 768;
        const maxWidth = isMobile ? Math.min(container.clientWidth, 800) : container.clientWidth;
        const maxHeight = isMobile ? Math.min(container.clientHeight, 600) : container.clientHeight;
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        
        if (this.renderer) {
            this.renderer.resize(this.canvas.width, this.canvas.height);
        }
    }
    
    setupUI() {
        // Start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('Start button clicked');
                // Reset level to 1 when starting new game
                this.currentLevel = 1;
                this.totalTime = 0;
                this.totalItemsCollected = 0;
                this.startNewRun(1);
            });
        } else {
            console.error('Start button not found!');
        }
        
        // Continue button (if save exists)
        const continueButton = document.getElementById('continue-button');
        if (continueButton) {
            continueButton.style.display = this.progressionManager.saveData.totalRuns > 0 ? 'block' : 'none';
            continueButton.addEventListener('click', () => this.startNewRun());
        }
        
        // Pause menu
        const resumeButton = document.getElementById('resume-button');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => this.resume());
        }
        
        const quitButton = document.getElementById('quit-button');
        if (quitButton) {
            quitButton.addEventListener('click', () => this.quitToMenu());
        }
        
        // Settings
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.showSettings());
        }
        
        const settingsBackButton = document.getElementById('settings-back-button');
        if (settingsBackButton) {
            settingsBackButton.addEventListener('click', () => this.hideSettings());
        }
        
        // Game over
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.startNewRun());
        }
        
        const menuButton = document.getElementById('menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', () => this.quitToMenu());
        }
        
        // Progression
        const progressionContinueButton = document.getElementById('progression-continue-button');
        if (progressionContinueButton) {
            progressionContinueButton.addEventListener('click', () => this.hideProgressionScreen());
        }
        
        // Settings sliders
        const masterVolume = document.getElementById('master-volume');
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                this.audioManager.setMasterVolume(e.target.value / 100);
                this.saveSettings();
            });
        }
        
        // Pause on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state === 'playing') {
                this.pause();
            }
        });
    }
    
    loadSettings() {
        const settings = Utils.getStorage('nightCageSettings', {
            masterVolume: 70,
            movementSensitivity: 5,
            cameraSensitivity: 5
        });
        
        const masterVolume = document.getElementById('master-volume');
        if (masterVolume) {
            masterVolume.value = settings.masterVolume;
            this.audioManager.setMasterVolume(settings.masterVolume / 100);
        }
        
        const movementSensitivity = document.getElementById('movement-sensitivity');
        if (movementSensitivity) {
            movementSensitivity.value = settings.movementSensitivity;
        }
        
        const cameraSensitivity = document.getElementById('camera-sensitivity');
        if (cameraSensitivity) {
            cameraSensitivity.value = settings.cameraSensitivity;
        }
    }
    
    saveSettings() {
        const masterVolume = document.getElementById('master-volume');
        const movementSensitivity = document.getElementById('movement-sensitivity');
        const cameraSensitivity = document.getElementById('camera-sensitivity');
        
        Utils.setStorage('nightCageSettings', {
            masterVolume: masterVolume ? masterVolume.value : 70,
            movementSensitivity: movementSensitivity ? movementSensitivity.value : 5,
            cameraSensitivity: cameraSensitivity ? cameraSensitivity.value : 5
        });
    }
    
    initMinimap() {
        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
            this.minimapCanvas.width = this.minimapSize;
            this.minimapCanvas.height = this.minimapSize;
            
            // Draw initial placeholder
            this.minimapCtx.fillStyle = '#000000';
            this.minimapCtx.fillRect(0, 0, this.minimapSize, this.minimapSize);
            this.minimapCtx.fillStyle = '#ffffff';
            this.minimapCtx.font = '12px monospace';
            this.minimapCtx.textAlign = 'center';
            this.minimapCtx.fillText('Minimap', this.minimapSize / 2, this.minimapSize / 2);
            
            console.log('Minimap initialized:', this.minimapCanvas.width, 'x', this.minimapCanvas.height);
        } else {
            console.error('Minimap canvas element not found!');
        }
    }
    
    initExploredCells() {
        if (!this.maze) return;
        
        this.exploredCells = [];
        // For very large mazes, we don't need to pre-initialize all cells
        // We'll initialize rows as needed (sparse array)
        console.log(`Initialized explored cells for maze ${this.maze.width}x${this.maze.height}`);
    }
    
    updateExploredCells() {
        if (!this.maze || !this.player) return;
        
        // Mark current cell and nearby cells as explored
        const gridX = Math.floor(this.player.x / this.maze.cellSize);
        const gridY = Math.floor(this.player.y / this.maze.cellSize);
        
        // Mark larger area around player as explored (5x5 for better visibility on large mazes)
        const exploreRadius = 2;
        let newCellsExplored = 0;
        for (let dy = -exploreRadius; dy <= exploreRadius; dy++) {
            for (let dx = -exploreRadius; dx <= exploreRadius; dx++) {
                const x = gridX + dx;
                const y = gridY + dy;
                if (x >= 0 && x < this.maze.width && y >= 0 && y < this.maze.height) {
                    if (!this.exploredCells[y]) {
                        this.exploredCells[y] = [];
                    }
                    if (!this.exploredCells[y][x]) {
                        this.exploredCells[y][x] = true;
                        newCellsExplored++;
                    }
                }
            }
        }
        
        // Debug: log when new cells are explored
        if (newCellsExplored > 0 && Math.random() < 0.1) {
            console.log(`Explored ${newCellsExplored} new cells at (${gridX}, ${gridY})`);
        }
    }
    
    renderMinimap() {
        if (!this.minimapCanvas || !this.minimapCtx) {
            console.warn('Minimap canvas not initialized');
            return;
        }
        
        if (!this.maze || !this.player) {
            // Still draw a placeholder if maze/player not ready
            const ctx = this.minimapCtx;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.minimapSize, this.minimapSize);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', this.minimapSize / 2, this.minimapSize / 2);
            return;
        }
        
        const ctx = this.minimapCtx;
        const size = this.minimapSize;
        const cellSize = size / Math.max(this.maze.width, this.maze.height);
        
        // Clear minimap
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // For very large mazes, ensure minimum pixel size for visibility
        const minPixelSize = cellSize < 0.1 ? 1 : Math.max(1, Math.ceil(cellSize));
        
        // Draw explored areas - batch by color for efficiency
        let exploredCount = 0;
        let pathCount = 0;
        let wallCount = 0;
        
        // First pass: draw paths (lighter gray for better visibility)
        ctx.fillStyle = '#888888';
        for (let y = 0; y < this.maze.height; y++) {
            if (!this.exploredCells || !this.exploredCells[y]) continue;
            for (let x = 0; x < this.maze.width; x++) {
                if (!this.exploredCells[y][x]) continue;
                if (this.maze.grid[y] && this.maze.grid[y][x] === 1) continue; // Skip walls for now
                
                exploredCount++;
                pathCount++;
                const pixelX = Math.floor(x * cellSize);
                const pixelY = Math.floor(y * cellSize);
                // Always draw at least 1 pixel, use Math.max to ensure visibility
                const drawSize = Math.max(1, minPixelSize);
                ctx.fillRect(pixelX, pixelY, drawSize, drawSize);
            }
        }
        
        // Second pass: draw walls (darker, on top)
        ctx.fillStyle = '#444444';
        for (let y = 0; y < this.maze.height; y++) {
            if (!this.exploredCells || !this.exploredCells[y]) continue;
            for (let x = 0; x < this.maze.width; x++) {
                if (!this.exploredCells[y][x]) continue;
                if (!this.maze.grid[y] || this.maze.grid[y][x] !== 1) continue; // Only walls
                
                exploredCount++;
                wallCount++;
                const pixelX = Math.floor(x * cellSize);
                const pixelY = Math.floor(y * cellSize);
                // Always draw at least 1 pixel
                const drawSize = Math.max(1, minPixelSize);
                ctx.fillRect(pixelX, pixelY, drawSize, drawSize);
            }
        }
        
        // Debug: log explored count more frequently to verify it's working
        if (exploredCount > 0 && Math.random() < 0.05) {
            console.log(`Minimap: ${exploredCount} cells explored (${pathCount} paths, ${wallCount} walls), cellSize: ${cellSize.toFixed(4)}`);
        }
        
        // Draw doors
        const doors = this.puzzleManager.getLockedDoors();
        for (const door of doors) {
            const doorGridX = Math.floor(door.x / this.maze.cellSize);
            const doorGridY = Math.floor(door.y / this.maze.cellSize);
            
            if (this.exploredCells[doorGridY] && this.exploredCells[doorGridY][doorGridX]) {
                const pixelX = doorGridX * cellSize;
                const pixelY = doorGridY * cellSize;
                
                if (door.unlocked) {
                    ctx.fillStyle = '#00ff00'; // Green for unlocked
                } else {
                    ctx.fillStyle = '#ff6600'; // Orange for locked
                }
                ctx.fillRect(pixelX, pixelY, Math.ceil(cellSize), Math.ceil(cellSize));
            }
        }
        
        // Draw player position (always visible, even if not explored)
        const playerGridX = Math.floor(this.player.x / this.maze.cellSize);
        const playerGridY = Math.floor(this.player.y / this.maze.cellSize);
        const playerPixelX = playerGridX * cellSize;
        const playerPixelY = playerGridY * cellSize;
        
        // Draw larger player dot for visibility
        const playerDotSize = Math.max(3, minPixelSize * 2);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(Math.floor(playerPixelX + cellSize / 2), Math.floor(playerPixelY + cellSize / 2), playerDotSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player direction indicator
        const dirLength = Math.max(5, cellSize * 2);
        const dirX = Math.cos(this.player.angle) * dirLength;
        const dirY = Math.sin(this.player.angle) * dirLength;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.floor(playerPixelX + cellSize / 2), Math.floor(playerPixelY + cellSize / 2));
        ctx.lineTo(Math.floor(playerPixelX + cellSize / 2 + dirX), Math.floor(playerPixelY + cellSize / 2 + dirY));
        ctx.stroke();
    }
    
    startNewRun(level = 1) {
        console.log(`Starting level ${level}...`);
        
        try {
            // Hide menus
            this.hideAllMenus();
            
            // Set current level
            this.currentLevel = level;
            
            // Generate level-based seed
            const levelSeed = level * 1000000 + Math.floor(Math.random() * 1000000);
            
            // Initialize game systems - create pre-seeded 3200x3200 maze
            this.maze = new Maze(3200, 3200, 0.5, levelSeed); // 3200x3200 grid with 0.5 cell size
            
            // Initialize managers first so maze can reference item manager
            this.itemManager = new ItemManager();
            this.maze.setItemManager(this.itemManager);
            
            // Generate full maze at once
            this.maze.generate();
            console.log('Full maze generated:', this.maze.width, 'x', this.maze.height);
            
            // Initialize explored cells for minimap
            this.initExploredCells();
        
            const spawnPos = this.maze.getSpawnPosition();
            console.log('Spawn position:', spawnPos);
            console.log('Grid at spawn (1,1):', this.maze.grid[1] ? this.maze.grid[1][1] : 'undefined');
            
            this.player = new Player(spawnPos.x, spawnPos.y, Math.random() * Math.PI * 2);
            console.log('Player created at:', this.player.x, this.player.y);
            
            // Final check - ensure spawn area is clear
            console.log('Can move check:', this.maze.isPath(this.player.x, this.player.y));
        
        this.renderer = new RaycastRenderer(
            this.canvas,
            this.canvas.width,
            this.canvas.height
        );
        
        // Apply progression upgrades
        const upgrades = this.progressionManager.getUpgradeMultipliers();
        this.player.moveSpeed *= upgrades.movementSpeed;
        this.renderer.setCandleRadius(2.5 * upgrades.perception); // Reduced base radius
        this.maxCandleFuel = 100 * upgrades.candleDuration;
        this.candleFuel = this.maxCandleFuel;
        
        // Item manager already initialized above, just spawn initial items
        this.itemManager.spawnItemsInMaze(this.maze, 15); // Increased from 8 to 15
        
        this.hazardManager = new HazardManager();
        const difficulty = Math.min(this.progressionManager.saveData.level, 5);
        this.hazardManager.spawnHazardsInMaze(this.maze, difficulty);
        
        this.puzzleManager = new PuzzleManager();
        const exitPos = this.maze.getExitPosition();
        if (exitPos) {
            this.puzzleManager.spawnPuzzlesInMaze(this.maze, exitPos.x, exitPos.y);
        }
        
        // Reset stats
        this.runStats = {
            startTime: Date.now(),
            time: 0,
            itemsCollected: 0,
            escaped: false
        };
        
        // Initial dialogue
        setTimeout(() => {
            this.dialogueManager.triggerDialogue('exploration', true);
        }, 2000);
        
            // Start game loop
            this.state = 'playing';
            this.running = true;
            this.lastTime = performance.now();
            console.log('Starting game loop');
            this.gameLoop();
        } catch (error) {
            console.error('Error starting new run:', error);
            alert('Failed to start game. Check console for details.');
        }
    }
    
    gameLoop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        // Convert to seconds (deltaTime in seconds, not frame-based)
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.033); // Cap at ~30fps minimum
        this.lastTime = currentTime;
        
        if (this.state === 'playing') {
            this.update(this.deltaTime);
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Update maze surreal effects (visual only, no geometry changes)
        this.maze.update(deltaTime, this.player.x, this.player.y);
        
        // Update player
        const wasMoving = this.player.keys.forward || this.player.keys.backward || 
                         this.player.keys.left || this.player.keys.right;
        this.player.update(deltaTime, this.maze);
        
        // Update candle fuel
        this.candleFuel = Math.max(0, this.candleFuel - this.candleDepletionRate * deltaTime);
        const candleIntensity = this.candleFuel / this.maxCandleFuel;
        this.renderer.setCandleIntensity(candleIntensity);
        
        // Apply camera jitter from candle flicker
        const flickerAmount = this.renderer.getFlickerAmount();
        this.player.setJitter(flickerAmount);
        
        // Check item collection
        const collectedItem = this.itemManager.checkCollection(this.player.x, this.player.y);
        if (collectedItem) {
            this.runStats.itemsCollected++;
            this.dialogueManager.onItemCollected(collectedItem.type);
        }
        
        // Update hazards
        const hazardResult = this.hazardManager.update(
            deltaTime,
            this.player.x,
            this.player.y,
            this.maze
        );
        
        if (hazardResult && hazardResult.type === 'death') {
            this.gameOver(false);
            return;
        }
        
        // Check puzzle doors
        const inventory = this.itemManager.getInventory();
        const blocked = this.puzzleManager.isBlocked(this.player.x, this.player.y, inventory);
        
        // Check escape condition
        const exitPos = this.maze.getExitPosition();
        if (exitPos) {
            const distToExit = Utils.distance(this.player.x, this.player.y, exitPos.x, exitPos.y);
            if (distToExit < 1.0 && !blocked) {
                // Level completed - advance to next level or show victory
                this.completeLevel();
                return;
            }
        }
        
        // Update dialogue
        const hazards = this.hazardManager.getVisibleHazards();
        const timeInMaze = Date.now() - this.runStats.startTime;
        this.dialogueManager.update(
            this.player.x,
            this.player.y,
            inventory,
            hazards,
            timeInMaze
        );
        
        // Update audio
        const nearHazard = hazards.some(h => 
            Utils.distance(this.player.x, this.player.y, h.x, h.y) < 5
        );
        const fearLevel = nearHazard ? 0.5 : 0.1;
        
        this.audioManager.update(
            wasMoving,
            flickerAmount,
            nearHazard,
            fearLevel
        );
        
        // Update explored cells for minimap
        this.updateExploredCells();
        
        // Update UI
        this.updateUI();
        
        // Update run stats
        this.runStats.time = Date.now() - this.runStats.startTime;
    }
    
    render() {
        const items = this.itemManager.getVisibleItems();
        const hazards = this.hazardManager.getVisibleHazards();
        const doors = this.puzzleManager.getLockedDoors();
        
        this.renderer.render(this.player, this.maze, items, hazards, doors);
        
        // Render minimap
        this.renderMinimap();
    }
    
    updateUI() {
        // Update level display
        this.updateLevelDisplay();
        
        // Update inventory display
        const inventoryDisplay = document.getElementById('inventory-display');
        if (inventoryDisplay) {
            const inventory = this.itemManager.getInventory();
            inventoryDisplay.innerHTML = '';
            
            if (inventory.keys > 0) {
                const keyDiv = document.createElement('div');
                keyDiv.className = 'inventory-item';
                keyDiv.textContent = '🔑';
                keyDiv.title = `Keys: ${inventory.keys}`;
                inventoryDisplay.appendChild(keyDiv);
            }
            
            if (inventory.artifacts.length > 0) {
                const artifactDiv = document.createElement('div');
                artifactDiv.className = 'inventory-item';
                artifactDiv.textContent = '💎';
                artifactDiv.title = `Artifacts: ${inventory.artifacts.length}`;
                inventoryDisplay.appendChild(artifactDiv);
            }
        }
        
        // Update light indicator
        const lightBar = document.getElementById('light-bar');
        if (lightBar) {
            const fuelPercent = (this.candleFuel / this.maxCandleFuel) * 100;
            lightBar.style.width = `${fuelPercent}%`;
        }
    }
    
    updateLevelDisplay() {
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = `Lv.${this.currentLevel}`;
        }
    }
    
    completeLevel() {
        // Update total stats
        this.runStats.time = Date.now() - this.runStats.startTime;
        this.totalTime += this.runStats.time;
        this.totalItemsCollected += this.runStats.itemsCollected;
        
        this.dialogueManager.onEscape();
        
        // Check if we've completed all levels
        if (this.currentLevel >= this.maxLevel) {
            // Victory!
            this.showVictoryScreen();
        } else {
            // Advance to next level
            this.advanceToNextLevel();
        }
    }
    
    advanceToNextLevel() {
        console.log(`Advancing to level ${this.currentLevel + 1}...`);
        
        // Keep inventory (keys and artifacts carry over) BEFORE incrementing level
        const currentInventory = {
            keys: this.itemManager.inventory.keys,
            artifacts: [...this.itemManager.inventory.artifacts],
            notes: [...this.itemManager.inventory.notes],
            lightSources: this.itemManager.inventory.lightSources
        };
        
        // Increment level
        this.currentLevel++;
        
        // Generate new maze for next level
        const levelSeed = this.currentLevel * 1000000 + Math.floor(Math.random() * 1000000);
        this.maze = new Maze(3200, 3200, 0.5, levelSeed);
        
        // Reinitialize explored cells
        this.initExploredCells();
        
        // Get new spawn position
        const spawnPos = this.maze.getSpawnPosition();
        this.player = new Player(spawnPos.x, spawnPos.y, Math.random() * Math.PI * 2);
        
        // Apply progression upgrades
        const upgrades = this.progressionManager.getUpgradeMultipliers();
        this.player.moveSpeed *= upgrades.movementSpeed;
        this.renderer.setCandleRadius(2.5 * upgrades.perception);
        this.maxCandleFuel = 100 * upgrades.candleDuration;
        this.candleFuel = this.maxCandleFuel;
        
        // Restore inventory (keys and artifacts carry over)
        this.itemManager.inventory.keys = currentInventory.keys;
        this.itemManager.inventory.artifacts = currentInventory.artifacts;
        this.itemManager.inventory.notes = currentInventory.notes;
        this.itemManager.inventory.lightSources = currentInventory.lightSources;
        
        // Spawn items in new maze
        this.itemManager.spawnItemsInMaze(this.maze, 15);
        
        // Spawn hazards
        this.hazardManager = new HazardManager();
        const difficulty = Math.min(this.progressionManager.saveData.level, 5);
        this.hazardManager.spawnHazardsInMaze(this.maze, difficulty);
        
        // Spawn puzzles/doors
        this.puzzleManager = new PuzzleManager();
        const exitPos = this.maze.getExitPosition();
        if (exitPos) {
            this.puzzleManager.spawnPuzzlesInMaze(this.maze, exitPos.x, exitPos.y);
        }
        
        // Reset run stats (but keep totals)
        this.runStats = {
            startTime: Date.now(),
            time: 0,
            itemsCollected: 0,
            escaped: false
        };
        
        // Initial dialogue for new level
        setTimeout(() => {
            this.dialogueManager.triggerDialogue('exploration', true);
        }, 2000);
        
        // Continue game (no menu screen)
        this.state = 'playing';
        this.running = true;
        this.lastTime = performance.now();
    }
    
    gameOver(escaped) {
        this.running = false;
        this.state = 'gameover';
        this.runStats.escaped = escaped;
        this.runStats.time = Date.now() - this.runStats.startTime;
        
        // Only handle death cases here (escaped cases handled by completeLevel)
        if (!escaped) {
            // Show game over screen
            this.showGameOverScreen();
        }
    }
    
    showGameOverScreen() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const gameOverTitle = document.getElementById('game-over-title');
        const runSummary = document.getElementById('run-summary');
        
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
        }
        
        if (gameOverTitle) {
            gameOverTitle.textContent = 'You Died';
        }
        
        if (runSummary) {
            const minutes = Math.floor(this.runStats.time / 60000);
            const seconds = Math.floor((this.runStats.time % 60000) / 1000);
            runSummary.innerHTML = `
                <p>Time Survived: ${minutes}:${seconds.toString().padStart(2, '0')}</p>
                <p>Items Collected: ${this.runStats.itemsCollected}</p>
            `;
        }
    }
    
    showProgressionScreen(xpGained, leveledUp, newAchievements) {
        const progressionScreen = document.getElementById('progression-screen');
        const xpGainedDiv = document.getElementById('xp-gained');
        const upgradesDiv = document.getElementById('upgrades-available');
        
        if (progressionScreen) {
            progressionScreen.classList.remove('hidden');
        }
        
        if (xpGainedDiv) {
            let text = `Experience Gained: ${xpGained}`;
            if (leveledUp) {
                text += `\nLevel Up! You are now level ${this.progressionManager.saveData.level}`;
            }
            xpGainedDiv.textContent = text;
        }
        
        if (upgradesDiv) {
            upgradesDiv.innerHTML = '';
            const upgrades = this.progressionManager.getAvailableUpgrades();
            
            upgrades.forEach(upgrade => {
                const upgradeDiv = document.createElement('div');
                upgradeDiv.className = 'upgrade-option';
                upgradeDiv.innerHTML = `
                    <h3>${upgrade.name}</h3>
                    <p>${upgrade.description}</p>
                    <p>Cost: ${upgrade.cost} XP</p>
                `;
                upgradeDiv.addEventListener('click', () => {
                    if (this.progressionManager.applyUpgrade(upgrade.id)) {
                        upgradeDiv.style.opacity = '0.5';
                        upgradeDiv.style.pointerEvents = 'none';
                    }
                });
                upgradesDiv.appendChild(upgradeDiv);
            });
        }
        
        this.state = 'progression';
    }
    
    hideProgressionScreen() {
        const progressionScreen = document.getElementById('progression-screen');
        if (progressionScreen) {
            progressionScreen.classList.add('hidden');
        }
        this.quitToMenu();
    }
    
    showVictoryScreen() {
        this.running = false;
        this.state = 'victory';
        
        const victoryScreen = document.getElementById('victory-screen');
        const victoryStats = document.getElementById('victory-stats');
        
        if (victoryScreen) {
            victoryScreen.classList.remove('hidden');
        }
        
        if (victoryStats) {
            const totalMinutes = Math.floor(this.totalTime / 60000);
            const totalSeconds = Math.floor((this.totalTime % 60000) / 1000);
            victoryStats.innerHTML = `
                <p>Congratulations! You've completed all ${this.maxLevel} levels!</p>
                <p>Total Time: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}</p>
                <p>Total Items Collected: ${this.totalItemsCollected}</p>
            `;
        }
        
        // Award final experience
        const baseXP = 1000; // Large bonus for completion
        const timeBonus = Math.max(0, 600000 - this.totalTime) / 1000; // 10 minutes target
        const itemBonus = this.totalItemsCollected * 10;
        const totalXP = Math.floor(baseXP + timeBonus + itemBonus);
        
        this.progressionManager.awardExperience(totalXP, true);
        this.progressionManager.saveProgress();
        
        // Setup victory menu button
        const victoryMenuButton = document.getElementById('victory-menu-button');
        if (victoryMenuButton) {
            // Remove existing listeners and add new one
            victoryMenuButton.onclick = () => {
                this.hideAllMenus();
                this.quitToMenu();
            };
        }
    }
    
    pause() {
        this.state = 'paused';
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.remove('hidden');
        }
    }
    
    resume() {
        this.state = 'playing';
        this.hideAllMenus();
        this.lastTime = performance.now();
        if (!this.running) {
            this.running = true;
            this.gameLoop();
        }
    }
    
    quitToMenu() {
        this.running = false;
        this.state = 'menu';
        this.hideAllMenus();
        
        // Reset level and stats when returning to menu
        this.currentLevel = 1;
        this.totalTime = 0;
        this.totalItemsCollected = 0;
        
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
        }
        
        // Cleanup
        if (this.audioManager) {
            this.audioManager.stop();
        }
    }
    
    showSettings() {
        const settingsScreen = document.getElementById('settings-screen');
        if (settingsScreen) {
            settingsScreen.classList.remove('hidden');
        }
    }
    
    hideSettings() {
        const settingsScreen = document.getElementById('settings-screen');
        if (settingsScreen) {
            settingsScreen.classList.add('hidden');
        }
        this.saveSettings();
    }
    
    hideAllMenus() {
        const menus = document.querySelectorAll('.menu-screen');
        menus.forEach(menu => {
            if (!menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            }
        });
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        game = new Game();
    } catch (error) {
        console.error('Failed to create game instance:', error);
        alert('Failed to initialize game. Check console for details.');
    }
});
