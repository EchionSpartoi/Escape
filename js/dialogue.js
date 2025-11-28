// Character dialogue and subtitle system

class DialogueManager {
    constructor() {
        this.currentDialogue = null;
        this.dialogueQueue = [];
        this.lastDialogueTime = 0;
        this.dialogueCooldown = 5000; // 5 seconds between dialogues
        this.dialogueDuration = 4000; // 4 seconds display time
        
        // Dialogue pool
        this.dialoguePool = {
            exploration: [
                "I know I've walked this corridor before... but it isn't the same.",
                "The walls shift when I'm not looking. I'm sure of it.",
                "How long have I been here? Time doesn't feel right.",
                "The shadows are laughing... or am I?",
                "What is real if these walls can breathe?",
                "I can't trust the sound of my own footsteps.",
                "Each turn looks familiar, yet completely alien.",
                "The maze is alive. I can feel it watching me."
            ],
            fear: [
                "Something's following me. I can feel it.",
                "The darkness is getting closer. I need light.",
                "I shouldn't have come here. But where is 'here'?",
                "My heart is racing. Is it fear or something else?",
                "The shadows move. They're not just shadows.",
                "I'm not alone. I've never been alone here.",
                "The key... it mocks me from the darkness.",
                "I can hear them. They're getting closer."
            ],
            discovery: [
                "A key. But will it unlock what I need?",
                "Another artifact. What do they mean?",
                "A note. Someone else was here. Or... am I reading my own words?",
                "Light. Precious, flickering light.",
                "This might help. Or it might be another trap.",
                "I found something. But at what cost?"
            ],
            puzzle: [
                "A locked door. Of course.",
                "The pattern... I've seen this before. Or have I?",
                "The sequence doesn't make sense. Nothing here does.",
                "Another puzzle. Another test. Another failure waiting to happen."
            ],
            danger: [
                "Something's wrong. I need to move.",
                "The floor... it's not stable.",
                "They're here. They found me.",
                "I can't stay here. I need to run.",
                "The shadows are closing in.",
                "This is it. This is how I die."
            ],
            escape: [
                "The exit. Is it real? Can I trust it?",
                "Freedom. Or just another cage?",
                "I made it. But at what cost?",
                "The maze releases me. For now."
            ]
        };
        
        this.setupSubtitleUI();
    }
    
    setupSubtitleUI() {
        this.subtitleOverlay = document.getElementById('subtitle-overlay');
        this.subtitleText = document.getElementById('subtitle-text');
    }
    
    // Trigger dialogue
    triggerDialogue(category, force = false) {
        const now = Date.now();
        
        // Check cooldown
        if (!force && now - this.lastDialogueTime < this.dialogueCooldown) {
            return;
        }
        
        // Get random dialogue from category
        const dialogues = this.dialoguePool[category];
        if (!dialogues || dialogues.length === 0) return;
        
        const dialogue = dialogues[Utils.randomInt(0, dialogues.length - 1)];
        
        // Show dialogue
        this.showDialogue(dialogue);
        this.lastDialogueTime = now;
    }
    
    // Show dialogue subtitle
    showDialogue(text) {
        if (!this.subtitleText || !this.subtitleOverlay) return;
        
        this.currentDialogue = {
            text: text,
            startTime: Date.now()
        };
        
        this.subtitleText.textContent = text;
        this.subtitleOverlay.classList.remove('subtitle-hidden');
        this.subtitleOverlay.classList.add('subtitle-visible');
        
        // Auto-hide after duration
        setTimeout(() => {
            this.hideDialogue();
        }, this.dialogueDuration);
    }
    
    // Hide dialogue
    hideDialogue() {
        if (!this.subtitleOverlay) return;
        
        this.subtitleOverlay.classList.remove('subtitle-visible');
        this.subtitleOverlay.classList.add('subtitle-hidden');
        this.currentDialogue = null;
    }
    
    // Update dialogue triggers based on game state
    update(playerX, playerY, inventory, hazards, timeInMaze) {
        // Time-based dialogue
        if (timeInMaze > 30000 && Math.random() < 0.001) {
            this.triggerDialogue('exploration');
        }
        
        // Fear-based dialogue (near hazards)
        if (hazards && hazards.length > 0) {
            for (const hazard of hazards) {
                const dist = Utils.distance(playerX, playerY, hazard.x, hazard.y);
                if (dist < 3 && Math.random() < 0.002) {
                    this.triggerDialogue('fear');
                    break;
                }
            }
        }
        
        // Discovery dialogue (when collecting items - handled externally)
        // Puzzle dialogue (when near puzzles - handled externally)
        // Danger dialogue (when health low or near death - handled externally)
    }
    
    // Trigger discovery dialogue
    onItemCollected(itemType) {
        this.triggerDialogue('discovery', true);
    }
    
    // Trigger puzzle dialogue
    onPuzzleEncountered() {
        this.triggerDialogue('puzzle', true);
    }
    
    // Trigger danger dialogue
    onDanger() {
        this.triggerDialogue('danger', true);
    }
    
    // Trigger escape dialogue
    onEscape() {
        this.triggerDialogue('escape', true);
    }
    
    // Get current dialogue
    getCurrentDialogue() {
        return this.currentDialogue;
    }
}
