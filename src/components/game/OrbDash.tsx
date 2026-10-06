import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const LANE_X = [-2.2, 0, 2.2];
const laneX = (l: number) => LANE_X[l] ?? 0;
const SPAWN_Z = -80;
const GRAVITY = 32;
const JUMP_V = 11;

type Thing = { id: number; lane: number; z: number; kind: "block" | "gem" | "bar"; hit: boolean };

type Phase = "menu" | "play" | "over";

type Shared = {
  lane: number;
  x: number;
  y: number;
  vy: number;
  speed: number;
  dist: number;
  score: number;
  things: Thing[];
  nextSpawn: number;
  id: number;
  phase: Phase;
};

const fresh = (): Shared => ({
  lane: 1, x: 0, y: 0.6, vy: 0, speed: 16, dist: 0, score: 0,
  things: [], nextSpawn: 20, id: 0, phase: "menu",
});

function World({ s, onTick, onOver }: { s: React.MutableRefObject<Shared>; onTick: (score: number) => void; onOver: () => void }) {
  const ball = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const stripes = useRef<THREE.Group>(null);
  const [, force] = useState(0);
  const tickAcc = useRef(0);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const g = s.current;
    if (g.phase === "play") {
      g.speed = Math.min(40, g.speed + dt * 0.6);
      const dz = g.speed * dt;
      g.dist += dz;
      g.score += dz * 0.5;

      // player
      g.x += (laneX(g.lane) - g.x) * (1 - Math.exp(-14 * dt));
      g.vy -= GRAVITY * dt;
      g.y += g.vy * dt;
      if (g.y < 0.6) { g.y = 0.6; g.vy = 0; }

      // move things
      let changed = false;
      for (const t of g.things) {
        t.z += dz;
        if (!t.hit && Math.abs(t.z) < 0.9 && Math.abs(laneX(t.lane) - g.x) < 1.1) {
          if (t.kind === "gem") { t.hit = true; g.score += 25; changed = true; }
          else if (t.kind === "block" || (t.kind === "bar" && g.y < 1.4)) {
            g.phase = "over"; onOver();
          }
        }
      }
      const before = g.things.length;
      g.things = g.things.filter((t) => t.z < 8 && !(t.kind === "gem" && t.hit));
      if (g.things.length !== before) changed = true;

      // spawn
      g.nextSpawn -= dz;
      if (g.nextSpawn <= 0) {
        const free = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === free) {
            if (Math.random() < 0.7) for (let k = 0; k < 3; k++) g.things.push({ id: g.id++, lane: l, z: SPAWN_Z - k * 3, kind: "gem", hit: false });
          } else if (Math.random() < 0.6) {
            g.things.push({ id: g.id++, lane: l, z: SPAWN_Z, kind: Math.random() < 0.3 ? "bar" : "block", hit: false });
          }
        }
        g.nextSpawn = 14 + Math.random() * 8 - Math.min(6, g.speed / 8);
        changed = true;
      }
      if (changed) force((n) => n + 1);

      tickAcc.current += dt;
      if (tickAcc.current > 0.1) { tickAcc.current = 0; onTick(Math.floor(g.score)); }
    }

    // visuals
    if (ball.current) {
      ball.current.position.set(g.x, g.y, 0);
      ball.current.rotation.x -= (g.phase === "play" ? g.speed : 4) * dt / 0.6;
    }
    if (group.current) {
      for (const child of group.current.children) {
        const t = g.things.find((x) => x.id === child.userData["id"]);
        if (t) child.position.z = t.z;
        if (child.userData["gem"]) child.rotation.y += dt * 3;
      }
    }
    if (stripes.current) stripes.current.position.z = (g.dist % 6);
    const cam = state.camera;
    cam.position.x += (g.x * 0.5 - cam.position.x) * (1 - Math.exp(-5 * dt));
    cam.lookAt(g.x * 0.3, 1, -10);
  });

  return (
    <>
      <mesh ref={ball} castShadow>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#ff7a59" flatShading roughness={0.4} />
      </mesh>

      {/* track */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]} receiveShadow>
        <planeGeometry args={[7.5, 120]} />
        <meshStandardMaterial color="#fff1dc" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -40]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#9ad8c4" />
      </mesh>
      <group ref={stripes}>
        {Array.from({ length: 20 }).map((_, i) =>
          [-1.1, 1.1].map((x) => (
            <mesh key={`${i}${x}`} rotation-x={-Math.PI / 2} position={[x, 0.01, -i * 6]}>
              <planeGeometry args={[0.12, 2.5]} />
              <meshStandardMaterial color="#f3c58f" />
            </mesh>
          )),
        )}
      </group>

      {/* side hills */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[(i % 2 ? 1 : -1) * (9 + (i % 3) * 3), 0, -i * 8]} castShadow>
          <coneGeometry args={[2 + (i % 3), 4 + (i % 4), 6]} />
          <meshStandardMaterial color={i % 3 ? "#5fb89a" : "#ffb3a7"} flatShading />
        </mesh>
      ))}

      <group ref={group}>
        {s.current.things.map((t) =>
          t.kind === "gem" ? (
            <mesh key={t.id} userData={{ id: t.id, gem: true }} position={[laneX(t.lane), 0.9, t.z]} castShadow>
              <octahedronGeometry args={[0.4]} />
              <meshStandardMaterial color="#ffd23f" emissive="#ffb400" emissiveIntensity={0.4} metalness={0.3} roughness={0.2} />
            </mesh>
          ) : t.kind === "bar" ? (
            <mesh key={t.id} userData={{ id: t.id }} position={[laneX(t.lane), 0.4, t.z]} castShadow>
              <boxGeometry args={[1.9, 0.6, 0.5]} />
              <meshStandardMaterial color="#6c63c7" roughness={0.5} />
            </mesh>
          ) : (
            <mesh key={t.id} userData={{ id: t.id }} position={[laneX(t.lane), 1, t.z]} castShadow>
              <boxGeometry args={[1.8, 2, 1.2]} />
              <meshStandardMaterial color="#2f4858" roughness={0.6} />
            </mesh>
          ),
        )}
      </group>
    </>
  );
}

export function OrbDash() {
  const s = useRef<Shared>(fresh());
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => { setBest(Number(localStorage.getItem("orbdash-best") || 0)); }, []);

  const start = () => {
    const keepBest = s.current;
    s.current = { ...fresh(), phase: "play" };
    void keepBest;
    setScore(0);
    setPhase("play");
  };
  const move = (d: number) => { const g = s.current; if (g.phase === "play") g.lane = Math.max(0, Math.min(2, g.lane + d)); };
  const jump = () => { const g = s.current; if (g.phase === "play" && g.y <= 0.61) g.vy = JUMP_V; };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowLeft", "a"].includes(e.key)) move(-1);
      if (["ArrowRight", "d"].includes(e.key)) move(1);
      if (["ArrowUp", "w", " "].includes(e.key)) { if (s.current.phase !== "play") start(); else jump(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { touch.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    if (!touch.current || s.current.phase !== "play") return;
    const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
      // tap: left/right third moves, middle jumps
      const w = window.innerWidth;
      if (e.clientX < w / 3) move(-1); else if (e.clientX > (2 * w) / 3) move(1); else jump();
    } else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
  };

  const onOver = () => {
    const sc = Math.floor(s.current.score);
    setScore(sc);
    setBest((b) => { const nb = Math.max(b, sc); localStorage.setItem("orbdash-best", String(nb)); return nb; });
    setPhase("over");
  };

  return (
    <div className="game-root" onPointerDown={onDown} onPointerUp={onUp}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 4, 7], fov: 60 }}>
        <color attach="background" args={["#ffd9c2"]} />
        <fog attach="fog" args={["#ffd9c2", 25, 75]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-30} />
        <Environment>
          <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1} color="#ffc0a0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <World s={s} onTick={setScore} onOver={onOver} />
      </Canvas>

      <div className="game-hud">
        <div className="game-score">{score}</div>
        <div className="game-best">best {best}</div>
      </div>

      {phase !== "play" && (
        <div className="game-overlay">
          <div className="game-card">
            <h1 className="game-title">{phase === "menu" ? "Orb Dash" : "Crashed!"}</h1>
            {phase === "over" && <p className="game-final">Score {score}</p>}
            <p className="game-help">Swipe or tap sides to switch lanes.<br />Swipe up or tap middle to jump purple bars.<br />Grab the gold gems!</p>
            <button className="game-btn" onPointerDown={(e) => e.stopPropagation()} onClick={start}>
              {phase === "menu" ? "Play" : "Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
