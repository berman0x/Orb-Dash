# Orb Dash

<div align="center">

[![Open Source Ready](https://img.shields.io/badge/Project-Open%20Source%20Ready-2E7D32?style=for-the-badge&logo=github)](https://github.com/berman0x/Orb-Dash)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite)](https://vite.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-9-7C3AED?style=for-the-badge&logo=react)](https://r3f.docs.pmnd.rs/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF6B6B?style=for-the-badge&logo=tanstack)](https://tanstack.com/start)
[![Game Dev](https://img.shields.io/badge/Stack-3D%20Runner%20Gameplay-FF9800?style=for-the-badge)](https://github.com/berman0x/Orb-Dash)

</div>

A polished 3D lane-based runner built with React, TypeScript, and Three.js. Orb Dash is a fast, mobile-friendly arcade game that blends responsive lane switching, procedural obstacle generation, interactive sound, and generated challenge modes into a single compact game loop.

This project was originally created in [Lovable](https://lovable.dev) and is structured to be a clean, extensible foundation for a browser-based game with a strong emphasis on runtime feel, accessibility, and easy iteration.

- Live app: https://fun-day.lovable.app
- Lovable project: https://lovable.dev/projects/2aef52f3-7f25-42df-8627-e94c78532ac3

## Why Orb Dash?

Orb Dash is more than a toy prototype. It is a compact example of a modern browser game architecture:

- 3D scene composition through React Three Fiber
- Real-time game state updates with deterministic lane, jump, and collision logic
- Audio synthesis without external asset files
- Mobile-first controls with keyboard and pointer/touch support
- AI-assisted challenge generation using a constrained server function and validation pipeline
- A modular challenge configuration system that can be extended with many game modes and tuning profiles

The result is a project that feels playable, is easy to understand structurally, and remains flexible enough to evolve into a larger game product, a learning demo, or an experimental arcade system.

## Gameplay Overview

Orb Dash follows a classic lane runner pattern:

- The player moves between three lanes
- Obstacles and collectibles spawn ahead of the orb
- The orb auto-runs forward with increasing speed over time
- Jumping allows the player to clear low barriers and avoid collisions
- Gems add score and progression goals
- Challenge rules can be configured around score, gem collection, and bar-jumping objectives

The game loop intentionally keeps logic simple and readable while still producing a satisfying sense of pace and tension. The physics model is lightweight, updated on every frame via `useFrame`, and tuned to remain performant while preserving responsive input.

## Core Technical Features

### 3D Rendering with React Three Fiber
The world is rendered using @react-three/fiber and configured with a custom scene hierarchy:

- A central orb player object
- Procedural environment geometry
- Lane separators and decorative terrain elements
- Dynamic obstacle meshes for blocks, gems, and jump bars
- Shadow support and lighting using Three.js primitives

The render loop updates camera position and world motion in real time, creating a smooth runner feeling without requiring a heavier game engine.

### Game State Architecture
The runtime state is stored in a strongly typed `Shared` object in `src/components/game/OrbDash.tsx`. It tracks:

- current lane
- player x/y positioning and vertical velocity
- movement speed and distance
- accumulated score and collected items
- active obstacles and spawning cadence
- game phase (`menu`, `play`, `paused`, `over`, `won`)
- active challenge configuration

This design keeps gameplay logic centralized and makes it easy to tune difficulty, spawn density, and goal conditions.

### Challenge System
The challenge configuration lives in `src/lib/challenge.ts`, which defines:

- title and briefing text
- target score
- gem goal
- bar-jump goal
- obstacle density and ratio
- gem frequency
- start and max speed

The project includes a normalization and validation layer so generated values remain within ranges the game can actually support. This is important for any game project because it prevents inconsistent or impossible combinations from entering the live loop.

### AI Challenge Generator
The repository includes an AI-assisted challenge generation workflow:

- client form captures target score and style
- server function validates and normalizes input
- a challenge is generated and returned as typed configuration data
- the game immediately applies the challenge without reloading

This pattern demonstrates a practical integration between client-side UX and server-side validation, while maintaining strong boundaries around what the game can accept.

### WebAudio Synthesis
All audio is synthesized directly in JavaScript using `AudioContext` rather than shipping external sound files.

This keeps the project self-contained and makes the sound system easy to modify. The implementation includes:

- tone generation
- oscillator shaping
- frequency transitions for jump and crash events
- periodic melodic background loops
- toggleable music and SFX state driven by localStorage

This is a lightweight and portable approach ideal for prototyping and small game projects.

## Project Structure

```text
Orb-Dash/
├── src/
│   ├── components/
│   │   └── game/
│   │       └── OrbDash.tsx            # main game scene and UI
│   ├── lib/
│   │   ├── audio.ts                   # procedural audio
│   │   ├── challenge.ts               # challenge schema and tuning logic
│   │   ├── challenge.functions.ts      # server entry for challenge generation
│   │   └── challenge.server.ts        # challenge generation flow
│   ├── routes/
│   │   ├── __root.tsx                 # app shell and root metadata
│   │   └── index.tsx                  # route entry for the game
│   └── styles.css                     # broad styling and game UI
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── public/
```

Even though the repository is small, its structure is intentionally organized so gameplay, rendering, and challenge logic remain separated by responsibility.

## Stack and Tooling

- TypeScript 5.8
- React 19
- Vite 8
- TanStack Router and TanStack Start
- @react-three/fiber
- @react-three/drei
- three
- Tailwind CSS
- Vitest
- ESLint + Prettier

This stack is appropriate for a fast, modern browser game where developer experience, performance, and visual fidelity all matter.

## Local Development

This project expects Node.js and npm to be available locally.

```bash
git clone https://github.com/berman0x/Orb-Dash.git
cd Orb-Dash
npm install
npm run dev
```

Then open the local Vite development URL shown in the terminal.

## Useful Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

### Script Notes

- `dev`: starts the local Vite/TanStack development environment
- `build`: compiles the production application
- `preview`: serves the built app locally
- `test`: runs the Vitest suite
- `lint`: validates code quality and consistency

## Build and Runtime Considerations

A few implementation details matter for long-term maintainability:

- The game uses client-side rendering for the interactive experience
- Some logic intentionally avoids overcomplexity to preserve performance and readability
- Audio is initialized only after user interaction to comply with browser autoplay rules
- Local storage is used to persist sound preferences and best-score tracking
- The app is designed with touch and pointer interactions first, while still supporting keyboard controls

## Open Source Intent

This repository is organized as a clean, open-source-friendly project with a clear separation of game logic, rendering, and configuration. It is intentionally structured to be understandable to contributors, playable by users, and easy to extend with new mechanics, visual styles, or content systems.

The codebase is especially well-suited for:

- game prototypes and learning projects
- browser arcade experiments
- educational Three.js / React game development examples
- community contributions around mechanics, visuals, and UX

If you are evaluating it as a foundation for a larger open-source game, the project already demonstrates a maintainable architecture without artificially over-engineering the space.

## Contributing

Contributions are welcome in a spirit of building a better, more polished arcade runner. Recommended areas for contribution include:

- game balancing and tuning
- level generation and procedural content
- input handling improvements
- UI and polish
- additional game modes and challenge presets
- accessibility and mobile interaction improvements
- visual art direction and scene variety

## Credits

- Built with React, Vite, TypeScript, and Three.js
- 3D scene logic driven by React Three Fiber
- Project started in the Lovable environment and continued in a code-first workflow
- Open-source-ready structure designed for iteration and collaboration

## Status

The project is in active development as a playable prototype and a reusable game foundation. It is intentionally designed to stay approachable for contributors while maintaining a professional, production-minded structure.

---

If you want, this project can also be extended with a more formal section for:

- gameplay screenshots
- architecture diagrams
- a roadmap
- contribution guidelines
- a dedicated license file and public release checklist

For the current repository state, the README above preserves the existing app and project intent while making the project significantly more descriptive and presentation-ready for an open-source audience.

