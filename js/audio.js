// Horror sound design with Tone.js

class AudioManager {
    constructor() {
        this.masterVolume = 0.7;
        this.audioContext = null;
        this.oscillators = [];
        this.ambientDrone = null;
        this.footstepInterval = null;
        this.lastFootstepTime = 0;
        this.footstepDelay = 500; // ms between footsteps
        
        // Audio state
        this.lowFreqOsc = null; // 20-60 Hz anxiety bass
        this.highFreqOsc = null; // 2-6 kHz tension cues
        this.ambientGain = null;
        
        this.initialized = false;
    }
    
    // Initialize audio system
    async initialize() {
        if (this.initialized) return;
        
        // Check if Tone.js is available
        if (typeof Tone === 'undefined') {
            console.warn('Tone.js not loaded - audio features disabled');
            return;
        }
        
        try {
            // Initialize Tone.js (user interaction required)
            // Don't wait if context isn't running - will start on first user interaction
            if (Tone.context && Tone.context.state === 'running') {
                // Already running, continue
            } else if (Tone.context) {
                // Try to start, but don't block if it requires user interaction
                try {
                    await Promise.race([
                        Tone.start(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                    ]);
                } catch (e) {
                    // Will start on first user interaction
                    console.log('Audio context will start on user interaction');
                }
            }
            
            // Only create oscillators if context is running
            if (Tone.context && Tone.context.state === 'running') {
                // Create low-frequency anxiety hum (20-60 Hz)
                this.lowFreqOsc = new Tone.Oscillator({
                    frequency: 30,
                    type: 'sine',
                    volume: -20
                }).toDestination();
                
                // Create high-frequency tension cues (2-6 kHz)
                this.highFreqOsc = new Tone.Oscillator({
                    frequency: 4000,
                    type: 'sawtooth',
                    volume: -30
                }).toDestination();
                
                // Create ambient drone
                this.ambientDrone = new Tone.Oscillator({
                    frequency: 110, // A2
                    type: 'triangle',
                    volume: -25
                }).toDestination();
                
                // Add reverb for spatialization
                const reverb = new Tone.Reverb({
                    roomSize: 0.9,
                    dampening: 3000
                }).toDestination();
                
                this.ambientDrone.connect(reverb);
                
                this.initialized = true;
                this.startAmbient();
            } else {
                // Mark as initialized but will create oscillators on first use
                this.initialized = true;
                console.log('Audio initialized (will create oscillators on first user interaction)');
            }
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    // Start ambient soundscape
    startAmbient() {
        if (!this.initialized || typeof Tone === 'undefined') return;
        
        // Create oscillators if they don't exist and context is running
        if (!this.lowFreqOsc && Tone.context && Tone.context.state === 'running') {
            try {
                this.lowFreqOsc = new Tone.Oscillator({
                    frequency: 30,
                    type: 'sine',
                    volume: -20
                }).toDestination();
                
                this.highFreqOsc = new Tone.Oscillator({
                    frequency: 4000,
                    type: 'sawtooth',
                    volume: -30
                }).toDestination();
                
                this.ambientDrone = new Tone.Oscillator({
                    frequency: 110,
                    type: 'triangle',
                    volume: -25
                }).toDestination();
                
                const reverb = new Tone.Reverb({
                    roomSize: 0.9,
                    dampening: 3000
                }).toDestination();
                
                this.ambientDrone.connect(reverb);
            } catch (e) {
                console.warn('Failed to create audio oscillators:', e);
                return;
            }
        }
        
        // Start low-frequency hum
        if (this.lowFreqOsc) {
            this.lowFreqOsc.start();
            // Slight frequency modulation for unease
            this.lowFreqOsc.frequency.rampTo(35, 5);
        }
        
        // Start ambient drone
        if (this.ambientDrone) {
            this.ambientDrone.start();
            // Minor key intervals for dissonance
            const minorThird = 110 * Math.pow(2, 3/12); // E
            this.ambientDrone.frequency.rampTo(minorThird, 3);
        }
    }
    
    // Play footstep sound
    playFootstep() {
        const now = Date.now();
        if (now - this.lastFootstepTime < this.footstepDelay) return;
        
        this.lastFootstepTime = now;
        
        if (!this.initialized || typeof Tone === 'undefined') return;
        
        // Create footstep sound (white noise burst with low-pass filter)
        const noise = new Tone.Noise('white').start();
        const filter = new Tone.Filter({
            frequency: 800,
            type: 'lowpass'
        }).toDestination();
        
        noise.connect(filter);
        
        // Stop after short duration
        setTimeout(() => {
            noise.stop();
            noise.dispose();
            filter.dispose();
        }, 100);
        
        // Add echo effect (delay)
        const delay = new Tone.FeedbackDelay({
            delayTime: 0.2,
            feedback: 0.3
        }).toDestination();
        
        noise.connect(delay);
        
        setTimeout(() => {
            delay.dispose();
        }, 500);
    }
    
    // Play candle flicker sound
    playCandleFlicker() {
        if (!this.initialized) return;
        
        // Soft crackle sound
        const osc = new Tone.Oscillator({
            frequency: 2000,
            type: 'sine',
            volume: -35
        }).toDestination();
        
        osc.start();
        osc.stop('+0.05');
    }
    
    // Trigger tension spike (sudden micro-cue)
    triggerTensionSpike() {
        if (!this.initialized) return;
        
        // High-frequency burst
        if (this.highFreqOsc) {
            this.highFreqOsc.start();
            this.highFreqOsc.frequency.rampTo(6000, 0.1);
            
            setTimeout(() => {
                if (this.highFreqOsc) {
                    this.highFreqOsc.frequency.rampTo(4000, 0.5);
                    this.highFreqOsc.stop('+1');
                }
            }, 200);
        }
    }
    
    // Update audio based on game state
    update(playerMoving, candleFlicker, nearHazard, fearLevel) {
        if (!this.initialized) return;
        
        // Footsteps when moving
        if (playerMoving) {
            this.playFootstep();
        }
        
        // Candle flicker audio
        if (candleFlicker > 0.3 && Math.random() < 0.1) {
            this.playCandleFlicker();
        }
        
        // Adjust ambient based on fear level
        if (this.ambientDrone) {
            const targetFreq = 110 + fearLevel * 20;
            this.ambientDrone.frequency.rampTo(targetFreq, 1);
        }
        
        // Tension spikes near hazards
        if (nearHazard && Math.random() < 0.01) {
            this.triggerTensionSpike();
        }
    }
    
    // Set master volume
    setMasterVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        try {
            if (Tone.getDestination()) {
                Tone.getDestination().volume.value = Tone.gainToDb(this.masterVolume);
            }
        } catch (e) {
            // Fallback if Tone.js not fully initialized
            console.warn('Audio volume adjustment failed:', e);
        }
    }
    
    // Stop all audio
    stop() {
        if (this.lowFreqOsc) {
            this.lowFreqOsc.stop();
        }
        if (this.highFreqOsc) {
            this.highFreqOsc.stop();
        }
        if (this.ambientDrone) {
            this.ambientDrone.stop();
        }
    }
    
    // Cleanup
    dispose() {
        this.stop();
        if (this.lowFreqOsc) this.lowFreqOsc.dispose();
        if (this.highFreqOsc) this.highFreqOsc.dispose();
        if (this.ambientDrone) this.ambientDrone.dispose();
    }
}
