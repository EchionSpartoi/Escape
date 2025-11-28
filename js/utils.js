// Utility functions for Night Cage

class Utils {
    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    // Linear interpolation
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }
    
    // Distance between two points
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    // Normalize angle to -PI to PI range
    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
    
    // Check if point is inside rectangle
    static pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
    }
    
    // Random integer between min and max (inclusive)
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Random float between min and max
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Shuffle array
    static shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    // Generate procedural texture pattern
    static generateWallTexture(width, height, seed = 0) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Set seed for reproducibility
        const rng = this.seededRandom(seed);
        
        // Base color (dark, gritty)
        ctx.fillStyle = `rgb(${20 + rng() * 30}, ${15 + rng() * 25}, ${10 + rng() * 20})`;
        ctx.fillRect(0, 0, width, height);
        
        // Add texture noise
        for (let i = 0; i < width; i += 2) {
            for (let j = 0; j < height; j += 2) {
                const brightness = 30 + rng() * 40;
                ctx.fillStyle = `rgba(${brightness}, ${brightness * 0.8}, ${brightness * 0.6}, ${0.3 + rng() * 0.4})`;
                ctx.fillRect(i, j, 2, 2);
            }
        }
        
        // Add vertical streaks (rust, wear)
        for (let i = 0; i < 5; i++) {
            const x = rng() * width;
            const streakWidth = 1 + rng() * 3;
            ctx.fillStyle = `rgba(${40 + rng() * 20}, ${20 + rng() * 10}, ${10 + rng() * 5}, ${0.4 + rng() * 0.3})`;
            ctx.fillRect(x, 0, streakWidth, height);
        }
        
        return canvas;
    }
    
    // Seeded random number generator
    static seededRandom(seed) {
        let value = seed;
        return function() {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        };
    }
    
    // Convert degrees to radians
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    // Convert radians to degrees
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
    
    // Get localStorage with fallback
    static getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    
    // Set localStorage with error handling
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    }
}
