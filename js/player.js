// Player movement and camera controls

class Player {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Rotation angle in radians
        this.moveSpeed = 2.0; // Units per second (was 0.05 per frame, now per second)
        this.rotSpeed = 2.0; // Radians per second (was 0.03 per frame, now per second)
        this.radius = 0.15; // Smaller collision radius for narrow corridors
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            turnLeft: false,
            turnRight: false
        };
        
        // Mobile touch controls
        this.touchJoystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            maxDistance: 40
        };
        
        // Camera jitter for candle flicker
        this.jitterAmount = 0;
        this.jitterTarget = 0;
        
        this.setupControls();
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup':
                    this.keys.forward = true;
                    break;
                case 's': case 'arrowdown':
                    this.keys.backward = true;
                    break;
                case 'a': case 'arrowleft':
                    this.keys.turnLeft = true;
                    break;
                case 'd': case 'arrowright':
                    this.keys.turnRight = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup':
                    this.keys.forward = false;
                    break;
                case 's': case 'arrowdown':
                    this.keys.backward = false;
                    break;
                case 'a': case 'arrowleft':
                    this.keys.turnLeft = false;
                    break;
                case 'd': case 'arrowright':
                    this.keys.turnRight = false;
                    break;
            }
        });
        
        // Mouse/touch camera rotation
        let isPointerDown = false;
        let lastPointerX = 0;
        
        const handlePointerStart = (e) => {
            isPointerDown = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            lastPointerX = clientX;
        };
        
        const handlePointerMove = (e) => {
            if (!isPointerDown) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const deltaX = clientX - lastPointerX;
            
            // Rotate camera
            this.angle += deltaX * 0.002;
            this.angle = Utils.normalizeAngle(this.angle);
            
            lastPointerX = clientX;
        };
        
        const handlePointerEnd = () => {
            isPointerDown = false;
        };
        
        // Mouse events
        document.addEventListener('mousedown', handlePointerStart);
        document.addEventListener('mousemove', handlePointerMove);
        document.addEventListener('mouseup', handlePointerEnd);
        
        // Touch events
        document.addEventListener('touchstart', handlePointerStart);
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handlePointerMove(e);
        });
        document.addEventListener('touchend', handlePointerEnd);
        
        // Virtual joystick
        this.setupJoystick();
    }
    
    setupJoystick() {
        const joystickContainer = document.getElementById('joystick-container');
        const joystickBase = document.getElementById('joystick-base');
        const joystickHandle = document.getElementById('joystick-handle');
        
        if (!joystickContainer || !joystickBase || !joystickHandle) return;
        
        // Show joystick on mobile
        if ('ontouchstart' in window) {
            joystickContainer.classList.add('active');
        }
        
        const handleTouchStart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickContainer.getBoundingClientRect();
            
            this.touchJoystick.active = true;
            this.touchJoystick.startX = rect.left + rect.width / 2;
            this.touchJoystick.startY = rect.top + rect.height / 2;
            this.touchJoystick.currentX = touch.clientX;
            this.touchJoystick.currentY = touch.clientY;
        };
        
        const handleTouchMove = (e) => {
            if (!this.touchJoystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            this.touchJoystick.currentX = touch.clientX;
            this.touchJoystick.currentY = touch.clientY;
            
            // Update joystick visual
            const dx = this.touchJoystick.currentX - this.touchJoystick.startX;
            const dy = this.touchJoystick.currentY - this.touchJoystick.startY;
            const distance = Math.min(
                Math.sqrt(dx * dx + dy * dy),
                this.touchJoystick.maxDistance
            );
            const angle = Math.atan2(dy, dx);
            
            const handleX = Math.cos(angle) * distance;
            const handleY = Math.sin(angle) * distance;
            
            joystickHandle.style.transform = `translate(calc(-50% + ${handleX}px), calc(-50% + ${handleY}px))`;
            
            // Convert joystick input to movement
            const forward = -Math.cos(angle) * (distance / this.touchJoystick.maxDistance);
            const strafe = Math.sin(angle) * (distance / this.touchJoystick.maxDistance);
            
            this.keys.forward = forward > 0.3;
            this.keys.backward = forward < -0.3;
            this.keys.left = strafe < -0.3;
            this.keys.right = strafe > 0.3;
        };
        
        const handleTouchEnd = () => {
            this.touchJoystick.active = false;
            joystickHandle.style.transform = 'translate(-50%, -50%)';
            this.keys.forward = false;
            this.keys.backward = false;
            this.keys.left = false;
            this.keys.right = false;
        };
        
        joystickContainer.addEventListener('touchstart', handleTouchStart);
        joystickContainer.addEventListener('touchmove', handleTouchMove);
        joystickContainer.addEventListener('touchend', handleTouchEnd);
        joystickContainer.addEventListener('touchcancel', handleTouchEnd);
    }
    
    // Update player position and rotation
    update(deltaTime, maze) {
        // Handle rotation
        if (this.keys.turnLeft) {
            this.angle -= this.rotSpeed * deltaTime;
        }
        if (this.keys.turnRight) {
            this.angle += this.rotSpeed * deltaTime;
        }
        this.angle = Utils.normalizeAngle(this.angle);
        
        // Calculate movement direction
        let moveX = 0;
        let moveY = 0;
        
        if (this.keys.forward) {
            moveX += Math.cos(this.angle) * this.moveSpeed * deltaTime;
            moveY += Math.sin(this.angle) * this.moveSpeed * deltaTime;
        }
        if (this.keys.backward) {
            moveX -= Math.cos(this.angle) * this.moveSpeed * deltaTime;
            moveY -= Math.sin(this.angle) * this.moveSpeed * deltaTime;
        }
        if (this.keys.left) {
            moveX += Math.cos(this.angle - Math.PI / 2) * this.moveSpeed * deltaTime;
            moveY += Math.sin(this.angle - Math.PI / 2) * this.moveSpeed * deltaTime;
        }
        if (this.keys.right) {
            moveX += Math.cos(this.angle + Math.PI / 2) * this.moveSpeed * deltaTime;
            moveY += Math.sin(this.angle + Math.PI / 2) * this.moveSpeed * deltaTime;
        }
        
        // Collision detection - improved to prevent getting stuck
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        // Check collision separately for X and Y movement
        let canMoveX = true;
        let canMoveY = true;
        
        // Check X movement only (test newX, currentY)
        const checkPointsX = 4;
        for (let i = 0; i < checkPointsX; i++) {
            const offset = (i / checkPointsX) * this.radius * 2 - this.radius;
            const checkX = newX;
            const checkY = this.y + offset;
            
            if (maze.isWall(checkX, checkY)) {
                canMoveX = false;
                break;
            }
        }
        
        // Check Y movement only (test currentX, newY)
        const checkPointsY = 4;
        for (let i = 0; i < checkPointsY; i++) {
            const offset = (i / checkPointsY) * this.radius * 2 - this.radius;
            const checkX = this.x + offset;
            const checkY = newY;
            
            if (maze.isWall(checkX, checkY)) {
                canMoveY = false;
                break;
            }
        }
        
        // If diagonal movement blocked, try sliding along wall
        if (!canMoveX && !canMoveY && (moveX !== 0 || moveY !== 0)) {
            // Try X movement only
            if (moveX !== 0) {
                let slideX = true;
                for (let i = 0; i < checkPointsX; i++) {
                    const offset = (i / checkPointsX) * this.radius * 2 - this.radius;
                    if (maze.isWall(newX, this.y + offset)) {
                        slideX = false;
                        break;
                    }
                }
                if (slideX) {
                    this.x = newX;
                    return; // Only move X, skip Y
                }
            }
            
            // Try Y movement only
            if (moveY !== 0) {
                let slideY = true;
                for (let i = 0; i < checkPointsY; i++) {
                    const offset = (i / checkPointsY) * this.radius * 2 - this.radius;
                    if (maze.isWall(this.x + offset, newY)) {
                        slideY = false;
                        break;
                    }
                }
                if (slideY) {
                    this.y = newY;
                    return; // Only move Y, skip X
                }
            }
        }
        
        // Apply movement
        if (canMoveX) this.x = newX;
        if (canMoveY) this.y = newY;
        
        // Update camera jitter (for candle flicker effect)
        this.jitterAmount = Utils.lerp(this.jitterAmount, this.jitterTarget, 0.1);
    }
    
    // Set camera jitter (called by candle flicker)
    setJitter(amount) {
        this.jitterTarget = amount;
    }
    
    // Get current camera angle with jitter
    getCameraAngle() {
        return this.angle + this.jitterAmount * 0.05;
    }
    
    // Get player position
    getPosition() {
        return { x: this.x, y: this.y };
    }
}
