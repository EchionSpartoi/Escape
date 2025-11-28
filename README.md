# Night Cage: Echoes of the Maze

A first-person horror maze escape game with procedural generation, raycasting rendering, character dialogue, and psychological sound design.

## Features

- **First-Person Raycasting**: Classic 3D illusion using raycasting algorithm
- **Procedural Maze Generation**: Unique mazes generated each run with surreal effects
- **Character Dialogue**: Internal monologue subtitles that reflect psychological descent
- **Horror Sound Design**: Psychological frequency manipulation using Tone.js
- **Items & Collectibles**: Keys, artifacts, notes, and light sources to manage
- **Hazards**: Shadow creatures, collapsing floors, and flickering lights
- **Puzzles**: Locked doors requiring keys or sequences
- **Meta-Progression**: RPG-style upgrades and achievements across runs
- **Mobile-Optimized**: Touch controls and responsive design for iOS/Android

## Tech Stack

- **Vanilla JavaScript (ES6)**: No build step required
- **HTML5 Canvas**: Raycasting-based rendering
- **Tone.js**: Audio synthesis and psychological frequency manipulation
- **localStorage**: Save progression data
- **Vercel**: Static site hosting

## Getting Started

### Local Development

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Or use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```

### Deployment

The project is configured for Vercel deployment:

1. Push to GitHub
2. Connect repository to Vercel
3. Deploy automatically

Or use Vercel CLI:
```bash
npm i -g vercel
vercel
```

## Controls

### Desktop
- **WASD** or **Arrow Keys**: Move
- **Mouse**: Rotate camera
- **Escape**: Pause menu

### Mobile
- **Virtual Joystick**: Move (bottom left)
- **Swipe**: Rotate camera
- **Touch**: Interact with UI

## Gameplay

1. **Explore** the procedurally generated maze
2. **Collect** keys, artifacts, and light sources
3. **Solve** puzzles to unlock doors
4. **Avoid** shadow creatures and collapsing floors
5. **Escape** to earn experience and upgrades
6. **Progress** through levels with permanent upgrades

## Project Structure

```
Escape/
├── index.html          # Main entry point
├── style.css           # Responsive styles
├── vercel.json         # Vercel deployment config
├── js/
│   ├── main.js        # Game loop & initialization
│   ├── raycast.js     # Raycasting renderer
│   ├── maze.js        # Procedural maze generation
│   ├── player.js      # Player movement & controls
│   ├── dialogue.js    # Dialogue/subtitle system
│   ├── audio.js       # Horror sound design
│   ├── items.js       # Collectibles system
│   ├── hazards.js     # Hazards & enemies
│   ├── puzzles.js     # Puzzle system
│   ├── progression.js # Meta-RPG progression
│   └── utils.js        # Utility functions
└── assets/            # Future: textures, audio files
```

## License

This project is open source and available for modification and distribution.

## Credits

Built with vanilla JavaScript, Tone.js, and a passion for horror game design.