// Raycasting renderer for first-person 3D illusion

class RaycastRenderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        
        // Raycasting settings
        this.fov = Math.PI / 3; // 60 degrees
        // Reduce rays on mobile for performance
        const isMobile = window.innerWidth <= 768;
        this.numRays = isMobile ? Math.floor(width / 2) : width;
        this.maxDepth = 20;
        this.deltaAngle = this.fov / this.numRays;
        
        // Lighting - reduced visibility
        this.candleRadius = 2.5; // Reduced from 5 to 2.5
        this.candleIntensity = 1.0;
        this.flickerAmount = 0;
        this.flickerTarget = 0;
        this.flickerTime = 0;
        
        // Wall textures (procedurally generated)
        this.wallTexture = Utils.generateWallTexture(64, 64, 12345);
        this.wallTextureDark = Utils.generateWallTexture(64, 64, 67890);
        
        // Colors
        this.floorColor = '#1a1a1a';
        this.ceilingColor = '#0a0a0a';
        this.wallColorDark = '#2a2a2a';
        this.wallColorLight = '#4a4a4a';
        
        // Night sky
        this.skyGradient = null;
        this.stars = [];
        this.moonX = 0.7; // Moon position (0-1 across screen)
        this.moonY = 0.3; // Moon position (0-1 down screen)
        this.moonSize = 0.15; // Moon size relative to screen
        this.moonStartTime = null; // When moon face animation started
        this.generateStars();
    }
    
    // Render frame
    render(player, maze, items = [], hazards = []) {
        // Initialize moon start time if not set
        if (this.moonStartTime === null) {
            this.moonStartTime = Date.now();
        }
        
        // Draw night sky ceiling
        this.drawNightSky();
        
        // Draw floor
        this.ctx.fillStyle = this.floorColor;
        this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
        
        // Update flicker
        this.updateFlicker();
        
        // Store ray distances for sprite occlusion
        const rayDistances = [];
        
        // Cast rays
        const playerAngle = player.getCameraAngle();
        const startAngle = playerAngle - this.fov / 2;
        
        for (let i = 0; i < this.numRays; i++) {
            const rayAngle = startAngle + this.deltaAngle * i;
            const ray = this.castRay(player.x, player.y, rayAngle, maze);
            
            // Store ray distance for this screen column
            rayDistances[i] = ray.distance;
            
            // Calculate wall height
            const distance = ray.distance * Math.cos(rayAngle - playerAngle);
            const wallHeight = (this.height / distance) * 0.5;
            
            // Calculate lighting
            const lightFactor = this.calculateLighting(
                ray.hitX,
                ray.hitY,
                player.x,
                player.y
            );
            
            // Draw wall strip
            this.drawWallStrip(
                i,
                wallHeight,
                distance,
                lightFactor,
                ray.side
            );
        }
        
        // Render items and hazards (sprites) - with occlusion checking
        this.renderSprites(player, items, hazards, maze, rayDistances);
    }
    
    // Cast ray and return hit information
    castRay(startX, startY, angle, maze) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        
        // DDA algorithm - work in grid coordinates
        const cellSize = maze.cellSize;
        
        // Convert start position to grid coordinates
        let gridX = startX / cellSize;
        let gridY = startY / cellSize;
        
        // Calculate step sizes in grid space
        const deltaX = Math.abs(cellSize / cos);
        const deltaY = Math.abs(cellSize / sin);
        
        let stepX, stepY;
        let sideDistX, sideDistY;
        
        if (cos < 0) {
            stepX = -1;
            sideDistX = (gridX - Math.floor(gridX)) * deltaX;
        } else {
            stepX = 1;
            sideDistX = (Math.floor(gridX) + 1 - gridX) * deltaX;
        }
        
        if (sin < 0) {
            stepY = -1;
            sideDistY = (gridY - Math.floor(gridY)) * deltaY;
        } else {
            stepY = 1;
            sideDistY = (Math.floor(gridY) + 1 - gridY) * deltaY;
        }
        
        // Grid coordinates for wall checking
        let mapX = Math.floor(gridX);
        let mapY = Math.floor(gridY);
        let side = 0;
        
        // DDA loop
        while (true) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaY;
                mapY += stepY;
                side = 1;
            }
            
            // Check if hit wall using grid coordinates directly
            if (maze.getGridCell(mapX, mapY) === 1) {
                break;
            }
            
            // Check max depth (convert grid distance back to world distance)
            const dist = side === 0 
                ? (mapX - gridX + (1 - stepX) / 2) * cellSize / cos
                : (mapY - gridY + (1 - stepY) / 2) * cellSize / sin;
            
            if (dist > this.maxDepth) {
                break;
            }
        }
        
        // Calculate hit position and distance (convert back to world coordinates)
        let distance;
        let hitX, hitY;
        
        if (side === 0) {
            distance = (mapX - gridX + (1 - stepX) / 2) * cellSize / cos;
            hitX = startX + distance * cos;
            hitY = startY + distance * sin;
        } else {
            distance = (mapY - gridY + (1 - stepY) / 2) * cellSize / sin;
            hitX = startX + distance * cos;
            hitY = startY + distance * sin;
        }
        
        return {
            distance: Math.abs(distance),
            hitX,
            hitY,
            side,
            mapX,
            mapY
        };
    }
    
    // Calculate lighting based on distance from candle
    calculateLighting(wallX, wallY, playerX, playerY) {
        const dist = Utils.distance(wallX, wallY, playerX, playerY);
        const lightDist = Math.min(dist, this.candleRadius);
        const lightFactor = 1 - (lightDist / this.candleRadius);
        
        // Apply flicker
        const flickerMod = 1 - this.flickerAmount * 0.3;
        
        return Math.max(0.1, Math.min(1.0, lightFactor * flickerMod * this.candleIntensity));
    }
    
    // Draw wall strip with improved static texture
    drawWallStrip(x, height, distance, lightFactor, side) {
        const wallTop = (this.height - height) / 2;
        const wallBottom = wallTop + height;
        
        // Choose base color based on side and distance
        let baseR, baseG, baseB;
        const baseColor = side === 0 ? 0.3 : 0.2;
        
        // Distance fog
        const fogFactor = Math.min(1, distance / this.maxDepth);
        const brightness = baseColor + (1 - baseColor) * (1 - fogFactor) * lightFactor;
        
        // Base colors - stone/concrete aesthetic
        if (side === 0) {
            baseR = Math.floor(brightness * 110);
            baseG = Math.floor(brightness * 95);
            baseB = Math.floor(brightness * 85);
        } else {
            baseR = Math.floor(brightness * 85);
            baseG = Math.floor(brightness * 85);
            baseB = Math.floor(brightness * 95);
        }
        
        // Create subtle static texture pattern (based on position, not time)
        // Use a hash of x position to create consistent, non-moving pattern
        const textureSeed = (x * 73 + Math.floor(wallTop / 8) * 137) % 1000;
        const textureVariation = (textureSeed / 1000) * 0.12; // Subtle variation
        
        // Apply texture variation
        const r = Utils.clamp(Math.floor(baseR * (1 + textureVariation)), 0, 255);
        const g = Utils.clamp(Math.floor(baseG * (1 + textureVariation * 0.8)), 0, 255);
        const b = Utils.clamp(Math.floor(baseB * (1 + textureVariation * 0.6)), 0, 255);
        
        // Create vertical gradient for depth
        const gradient = this.ctx.createLinearGradient(x, wallTop, x, wallBottom);
        const topBrightness = 1.08;
        const midBrightness = 1.0;
        const bottomBrightness = 0.92;
        
        gradient.addColorStop(0, `rgb(${Math.floor(r * topBrightness)}, ${Math.floor(g * topBrightness)}, ${Math.floor(b * topBrightness)})`);
        gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
        gradient.addColorStop(1, `rgb(${Math.floor(r * bottomBrightness)}, ${Math.floor(g * bottomBrightness)}, ${Math.floor(b * bottomBrightness)})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, wallTop, 1, height);
        
        // Add subtle horizontal texture lines (static, based on position)
        if (x % 3 === 0) {
            const lineSeed = (Math.floor(wallTop / 12) * 47 + x * 31) % 100;
            if (lineSeed < 15) { // Sparse texture lines
                const lineBrightness = 0.85;
                this.ctx.fillStyle = `rgba(${Math.floor(r * lineBrightness)}, ${Math.floor(g * lineBrightness)}, ${Math.floor(b * lineBrightness)}, ${0.4 * lightFactor})`;
                this.ctx.fillRect(x, wallTop + (lineSeed % Math.floor(height / 4)) * 4, 1, 1);
            }
        }
        
        // Add subtle vertical texture (stone/concrete cracks)
        if (height > 20 && x % 5 === 0) {
            const crackSeed = (x * 97 + Math.floor(wallTop / 16) * 211) % 100;
            if (crackSeed < 8) {
                const crackDarkness = 0.75;
                this.ctx.fillStyle = `rgba(${Math.floor(r * crackDarkness)}, ${Math.floor(g * crackDarkness)}, ${Math.floor(b * crackDarkness)}, ${0.3 * lightFactor})`;
                const crackY = wallTop + (crackSeed % Math.floor(height / 3)) * 3;
                this.ctx.fillRect(x, crackY, 1, Math.min(3, wallBottom - crackY));
            }
        }
    }
    
    // Render sprites (items, hazards) with proper occlusion
    renderSprites(player, items, hazards, maze, rayDistances = []) {
        const playerAngle = player.getCameraAngle();
        const startAngle = playerAngle - this.fov / 2;
        
        const sprites = [...items, ...hazards]
            .filter(sprite => sprite.visible)
            .map(sprite => {
                const dx = sprite.x - player.x;
                const dy = sprite.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const spriteAngle = Math.atan2(dy, dx);
                const relativeAngle = spriteAngle - playerAngle;
                
                // Calculate which screen column this sprite would be in
                const screenX = (relativeAngle / this.fov) * this.width + this.width / 2;
                const columnIndex = Math.floor(screenX);
                
                return { ...sprite, dist, angle: relativeAngle, spriteAngle, screenX, columnIndex };
            })
            .filter(sprite => {
                // Only render sprites in front of player and in view
                if (Math.abs(sprite.angle) >= this.fov / 2 || sprite.dist <= 0.3) {
                    return false;
                }
                
                // Check if sprite is occluded by checking the ray distance at its screen position
                if (sprite.columnIndex >= 0 && sprite.columnIndex < rayDistances.length) {
                    const wallDist = rayDistances[sprite.columnIndex];
                    // If wall is closer, sprite is hidden
                    if (wallDist < sprite.dist - 0.1) {
                        return false;
                    }
                }
                
                // Also do a direct ray check for accuracy
                const wallRay = this.castRay(player.x, player.y, sprite.spriteAngle, maze);
                if (wallRay.distance < sprite.dist - 0.1) {
                    return false;
                }
                
                return true;
            })
            .sort((a, b) => b.dist - a.dist); // Back to front
        
        for (const sprite of sprites) {
            this.drawSprite(sprite, player);
        }
    }
    
    // Draw sprite billboard with item-specific shapes
    drawSprite(sprite, player) {
        const screenX = (sprite.angle / this.fov) * this.width + this.width / 2;
        const spriteHeight = (1 / sprite.dist) * this.height * 0.3;
        const spriteWidth = spriteHeight * 0.6;
        
        const spriteTop = (this.height - spriteHeight) / 2;
        const spriteCenterX = screenX;
        const spriteCenterY = spriteTop + spriteHeight / 2;
        
        // Save context for transformations
        this.ctx.save();
        
        // Draw item-specific shapes based on type
        switch(sprite.type) {
            case 'key':
                this.drawKey(spriteCenterX, spriteCenterY, spriteWidth, spriteHeight, sprite.color);
                break;
            case 'artifact':
                this.drawArtifact(spriteCenterX, spriteCenterY, spriteWidth, spriteHeight, sprite.color);
                break;
            case 'note':
                this.drawNote(spriteCenterX, spriteCenterY, spriteWidth, spriteHeight);
                break;
            case 'candle':
            case 'torch':
                this.drawCandle(spriteCenterX, spriteCenterY, spriteWidth, spriteHeight, sprite.color);
                break;
            default:
                // Fallback for other types
                this.ctx.fillStyle = sprite.color || '#ff6600';
                this.ctx.fillRect(
                    screenX - spriteWidth / 2,
                    spriteTop,
                    spriteWidth,
                    spriteHeight
                );
        }
        
        this.ctx.restore();
    }
    
    // Draw key shape
    drawKey(x, y, width, height, color) {
        const keyColor = color || '#ffaa00';
        const keyWidth = width * 0.4;
        const keyHeight = height * 0.6;
        
        // Key head (circular)
        this.ctx.fillStyle = keyColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y - keyHeight * 0.3, keyWidth * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Key shaft (rectangular)
        this.ctx.fillRect(x - keyWidth * 0.15, y - keyHeight * 0.3, keyWidth * 0.3, keyHeight * 0.5);
        
        // Key teeth (small rectangles at bottom)
        const teethCount = 2;
        const toothWidth = keyWidth * 0.2;
        for (let i = 0; i < teethCount; i++) {
            const offset = (i - (teethCount - 1) / 2) * keyWidth * 0.25;
            this.ctx.fillRect(x + offset - toothWidth / 2, y + keyHeight * 0.2, toothWidth, keyHeight * 0.15);
        }
        
        // Add glow
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = keyColor;
        this.ctx.fill();
    }
    
    // Draw artifact (crystal/gem shape)
    drawArtifact(x, y, width, height, color) {
        const artifactColor = color || '#ff00ff';
        const size = Math.min(width, height) * 0.5;
        
        // Draw diamond/crystal shape
        this.ctx.fillStyle = artifactColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size * 0.5); // Top
        this.ctx.lineTo(x + size * 0.4, y); // Right
        this.ctx.lineTo(x, y + size * 0.5); // Bottom
        this.ctx.lineTo(x - size * 0.4, y); // Left
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add inner highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size * 0.3);
        this.ctx.lineTo(x + size * 0.2, y);
        this.ctx.lineTo(x, y + size * 0.3);
        this.ctx.lineTo(x - size * 0.2, y);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add glow
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = artifactColor;
    }
    
    // Draw note (paper shape)
    drawNote(x, y, width, height) {
        const noteWidth = width * 0.5;
        const noteHeight = height * 0.5;
        
        // Paper background
        this.ctx.fillStyle = '#f5f5dc';
        this.ctx.fillRect(x - noteWidth / 2, y - noteHeight / 2, noteWidth, noteHeight);
        
        // Paper border
        this.ctx.strokeStyle = '#d0d0a0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - noteWidth / 2, y - noteHeight / 2, noteWidth, noteHeight);
        
        // Text lines (simplified)
        this.ctx.fillStyle = '#333';
        const lineHeight = noteHeight / 4;
        for (let i = 0; i < 3; i++) {
            const lineY = y - noteHeight / 2 + lineHeight * (i + 1);
            const lineWidth = noteWidth * (0.6 + Math.random() * 0.2);
            this.ctx.fillRect(x - lineWidth / 2, lineY, lineWidth, 1);
        }
        
        // Folded corner
        this.ctx.fillStyle = '#e0e0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(x + noteWidth / 2, y - noteHeight / 2);
        this.ctx.lineTo(x + noteWidth / 2 - noteWidth * 0.2, y - noteHeight / 2);
        this.ctx.lineTo(x + noteWidth / 2, y - noteHeight / 2 + noteWidth * 0.2);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Draw candle (with flame)
    drawCandle(x, y, width, height, color) {
        const candleColor = color || '#ff6600';
        const candleWidth = width * 0.3;
        const candleHeight = height * 0.5;
        
        // Candle body
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(x - candleWidth / 2, y, candleWidth, candleHeight);
        
        // Candle wax (colored)
        this.ctx.fillStyle = candleColor;
        this.ctx.fillRect(x - candleWidth / 2, y, candleWidth, candleHeight * 0.8);
        
        // Wick
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - 1, y - candleHeight * 0.1, 2, candleHeight * 0.15);
        
        // Flame
        const flameHeight = candleHeight * 0.25;
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - candleHeight * 0.05, candleWidth * 0.3, flameHeight, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Flame inner (brighter)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - candleHeight * 0.05, candleWidth * 0.15, flameHeight * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ffaa00';
    }
    
    // Update candle flicker
    updateFlicker() {
        this.flickerTime += 0.1;
        
        // Random flicker target
        if (Math.random() < 0.05) {
            this.flickerTarget = Math.random() * 0.5;
        }
        
        // Smooth flicker
        this.flickerAmount = Utils.lerp(
            this.flickerAmount,
            this.flickerTarget,
            0.2
        );
        
        // Decay flicker
        this.flickerTarget *= 0.95;
    }
    
    // Set candle properties
    setCandleRadius(radius) {
        this.candleRadius = radius;
    }
    
    setCandleIntensity(intensity) {
        this.candleIntensity = intensity;
    }
    
    // Get current flicker amount (for player jitter)
    getFlickerAmount() {
        return this.flickerAmount;
    }
    
    // Generate stars for night sky
    generateStars() {
        this.stars = [];
        const starCount = 150;
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.5, // Only in top half (ceiling)
                brightness: Math.random() * 0.8 + 0.2,
                size: Math.random() * 1.5 + 0.5
            });
        }
    }
    
    // Draw night sky with stars and moon
    drawNightSky() {
        const skyHeight = this.height / 2;
        
        // Create gradient for night sky (dark blue to black)
        if (!this.skyGradient || this.skyGradient.canvas !== this.canvas) {
            this.skyGradient = this.ctx.createLinearGradient(0, 0, 0, skyHeight);
            this.skyGradient.addColorStop(0, '#0a0a1a'); // Dark blue-black at top
            this.skyGradient.addColorStop(0.5, '#050510'); // Darker in middle
            this.skyGradient.addColorStop(1, '#000005'); // Almost black at horizon
        }
        
        // Draw sky gradient
        this.ctx.fillStyle = this.skyGradient;
        this.ctx.fillRect(0, 0, this.width, skyHeight);
        
        // Draw stars
        this.ctx.fillStyle = '#ffffff';
        for (const star of this.stars) {
            const x = star.x * this.width;
            const y = star.y * skyHeight;
            const size = star.size;
            const alpha = star.brightness;
            
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add twinkle effect (subtle)
            if (Math.random() < 0.1) {
                this.ctx.globalAlpha = alpha * 1.5;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1.0;
        
        // Draw improved moon with creepy face
        this.drawMoon(skyHeight);
    }
    
    // Draw improved moon with morphing face
    drawMoon(skyHeight) {
        const moonX = this.moonX * this.width;
        const moonY = this.moonY * skyHeight;
        const moonRadius = this.moonSize * Math.min(this.width, skyHeight);
        
        // Calculate smile-to-frown progression (0 = smile, 1 = frown) over 5 minutes
        const elapsedTime = this.moonStartTime ? (Date.now() - this.moonStartTime) / 1000 : 0;
        const totalTime = 300; // 5 minutes in seconds
        const morphProgress = Math.min(1, elapsedTime / totalTime);
        
        // Enhanced moon glow (outer, more atmospheric)
        const outerGlow = this.ctx.createRadialGradient(
            moonX, moonY, 0,
            moonX, moonY, moonRadius * 2.2
        );
        outerGlow.addColorStop(0, 'rgba(255, 255, 220, 0.4)');
        outerGlow.addColorStop(0.3, 'rgba(255, 255, 200, 0.2)');
        outerGlow.addColorStop(0.6, 'rgba(255, 255, 180, 0.1)');
        outerGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
        this.ctx.fillStyle = outerGlow;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonRadius * 2.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Moon body with better shading
        const moonBodyGradient = this.ctx.createRadialGradient(
            moonX - moonRadius * 0.4, moonY - moonRadius * 0.4, 0,
            moonX, moonY, moonRadius
        );
        moonBodyGradient.addColorStop(0, '#f5f5e8'); // Bright highlight
        moonBodyGradient.addColorStop(0.3, '#e8e8d8'); // Light
        moonBodyGradient.addColorStop(0.7, '#d8d8c8'); // Medium
        moonBodyGradient.addColorStop(1, '#c8c8b8'); // Darker edge
        
        this.ctx.fillStyle = moonBodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Enhanced moon craters with depth
        const craterPositions = [
            { angle: 0.3, dist: 0.35, size: 0.12 },
            { angle: 1.2, dist: 0.45, size: 0.15 },
            { angle: 2.1, dist: 0.32, size: 0.10 },
            { angle: 3.5, dist: 0.40, size: 0.13 },
            { angle: 4.8, dist: 0.38, size: 0.11 },
            { angle: 5.2, dist: 0.42, size: 0.14 }
        ];
        
        for (const crater of craterPositions) {
            const craterX = moonX + Math.cos(crater.angle) * moonRadius * crater.dist;
            const craterY = moonY + Math.sin(crater.angle) * moonRadius * crater.dist;
            const craterSize = moonRadius * crater.size;
            
            // Crater shadow (darker)
            this.ctx.fillStyle = '#b8b8a8';
            this.ctx.beginPath();
            this.ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Crater rim highlight
            this.ctx.strokeStyle = '#e0e0d0';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Moon highlight (top-left, more pronounced)
        const highlightGradient = this.ctx.createRadialGradient(
            moonX - moonRadius * 0.35, moonY - moonRadius * 0.35, 0,
            moonX, moonY, moonRadius * 0.8
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 240, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonRadius * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw extremely creepy face that morphs from smile to frown
        this.ctx.strokeStyle = '#1a1a0a';
        this.ctx.fillStyle = '#1a1a0a';
        this.ctx.lineWidth = Math.max(3, moonRadius * 0.1);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Creepy eyes - larger, more menacing, with dark pupils
        const eyeY = moonY - moonRadius * 0.15;
        const eyeSpacing = moonRadius * 0.28;
        const eyeSize = moonRadius * 0.18; // Larger eyes
        const pupilSize = moonRadius * 0.08;
        
        // Left eye - with creepy stare
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.beginPath();
        this.ctx.arc(moonX - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Left pupil - slightly offset for unsettling stare
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(moonX - eyeSpacing + moonRadius * 0.02, eyeY + moonRadius * 0.01, pupilSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right eye
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.beginPath();
        this.ctx.arc(moonX + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right pupil
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(moonX + eyeSpacing - moonRadius * 0.02, eyeY + moonRadius * 0.01, pupilSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add creepy eye shine (makes it look more alive and watching)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(moonX - eyeSpacing + moonRadius * 0.03, eyeY - moonRadius * 0.02, moonRadius * 0.03, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(moonX + eyeSpacing - moonRadius * 0.03, eyeY - moonRadius * 0.02, moonRadius * 0.03, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Creepy wrinkles/cracks around eyes (more menacing as time passes)
        this.ctx.strokeStyle = '#1a1a0a';
        this.ctx.lineWidth = Math.max(1, moonRadius * 0.04);
        const wrinkleIntensity = morphProgress * 0.5 + 0.3;
        
        // Wrinkles above left eye
        for (let i = 0; i < 3; i++) {
            const wrinkleX = moonX - eyeSpacing - moonRadius * 0.1 + (i * moonRadius * 0.08);
            const wrinkleY = eyeY - eyeSize - moonRadius * 0.05;
            this.ctx.beginPath();
            this.ctx.moveTo(wrinkleX, wrinkleY);
            this.ctx.lineTo(wrinkleX + moonRadius * 0.05, wrinkleY - moonRadius * 0.03 * wrinkleIntensity);
            this.ctx.stroke();
        }
        
        // Wrinkles above right eye
        for (let i = 0; i < 3; i++) {
            const wrinkleX = moonX + eyeSpacing - moonRadius * 0.1 + (i * moonRadius * 0.08);
            const wrinkleY = eyeY - eyeSize - moonRadius * 0.05;
            this.ctx.beginPath();
            this.ctx.moveTo(wrinkleX, wrinkleY);
            this.ctx.lineTo(wrinkleX + moonRadius * 0.05, wrinkleY - moonRadius * 0.03 * wrinkleIntensity);
            this.ctx.stroke();
        }
        
        // Mouth - morphs from creepy smile to menacing frown
        const mouthY = moonY + moonRadius * 0.3;
        const mouthWidth = moonRadius * 0.5; // Wider mouth
        const mouthHeight = moonRadius * 0.2;
        
        // Interpolate between smile (curved up) and frown (curved down)
        const smileCurve = (1 - morphProgress) * mouthHeight;
        const frownCurve = morphProgress * mouthHeight;
        
        this.ctx.strokeStyle = '#0a0a0a';
        this.ctx.lineWidth = Math.max(3, moonRadius * 0.12);
        
        this.ctx.beginPath();
        this.ctx.moveTo(moonX - mouthWidth, mouthY);
        
        // Create arc that morphs from smile to frown
        if (morphProgress < 0.5) {
            // More smile than frown - but make it a creepy, wide smile
            const controlY = mouthY - smileCurve + frownCurve * 0.3;
            this.ctx.quadraticCurveTo(moonX, controlY, moonX + mouthWidth, mouthY);
        } else {
            // More frown than smile - deep, menacing frown
            const controlY = mouthY + frownCurve - smileCurve * 0.3;
            this.ctx.quadraticCurveTo(moonX, controlY, moonX + mouthWidth, mouthY);
        }
        
        this.ctx.stroke();
        
        // Add teeth/teeth-like marks in the mouth (more visible as it frowns)
        if (morphProgress > 0.2) {
            const teethCount = 6;
            const teethSpacing = mouthWidth * 2 / (teethCount + 1);
            this.ctx.fillStyle = '#000000';
            for (let i = 1; i <= teethCount; i++) {
                const toothX = moonX - mouthWidth + teethSpacing * i;
                const toothY = mouthY + (morphProgress - 0.2) * moonRadius * 0.1;
                const toothSize = moonRadius * 0.03;
                this.ctx.beginPath();
                this.ctx.arc(toothX, toothY, toothSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Add dark shadow/void under mouth (gets deeper as it frowns)
        if (morphProgress > 0.2) {
            this.ctx.globalAlpha = (morphProgress - 0.2) * 0.7;
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.ellipse(moonX, mouthY + mouthHeight * 0.4, mouthWidth * 0.4, mouthHeight * 0.3 * morphProgress, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
        
        // Add creepy veins/cracks that appear over time
        if (morphProgress > 0.4) {
            this.ctx.strokeStyle = 'rgba(26, 26, 10, 0.6)';
            this.ctx.lineWidth = 1;
            const veinCount = Math.floor(morphProgress * 8);
            for (let i = 0; i < veinCount; i++) {
                const startAngle = (i / veinCount) * Math.PI * 2;
                const startX = moonX + Math.cos(startAngle) * moonRadius * 0.3;
                const startY = moonY + Math.sin(startAngle) * moonRadius * 0.3;
                const endX = moonX + Math.cos(startAngle) * moonRadius * 0.7;
                const endY = moonY + Math.sin(startAngle) * moonRadius * 0.7;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        }
    }
    
    // Resize canvas
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        // Reduce rays on mobile for performance
        const isMobile = window.innerWidth <= 768;
        this.numRays = isMobile ? Math.floor(width / 2) : width;
        this.deltaAngle = this.fov / this.numRays;
        
        // Regenerate sky gradient
        this.skyGradient = null;
    }
}
