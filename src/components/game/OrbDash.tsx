import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CLASSIC, STYLES, type Challenge } from "@/lib/challenge";
import { createChallenge } from "@/lib/challenge.functions";
import { GameAudio } from "@/lib/audio";
import { getCoachTip } from "@/lib/coach.functions";
import { addRun, parseHistory, summarize, HISTORY_KEY, type RunRecord } from "@/lib/history";

const LANE_X = [-2.2, 0, 2.2];
const laneX = (l: number) => LANE_X[l] ?? 0;
const SPAWN_Z = -80;
const GRAVITY = 32;
const JUMP_V = 11;
const RESUME_COUNTDOWN = 3;

type Thing = { id: number; lane: number; z: number; kind: "block" | "gem" | "bar"; hit: boolean };
type Phase = "menu" | "play" | "paused" | "over" | "won";

type Shared = {
  lane: number; x: number; y: number; vy: number; speed: number; dist: number; score: number;
  gems: number; bars: number; countdown: number;
  things: Thing[]; nextSpawn: number; id: number; phase: Phase; cfg: Challenge;
};

const fresh = (cfg: Challenge, phase: Phase = "menu"): Shared => ({
  lane: 1, x: 0, y: 0.6, vy: 0, speed: cfg.startSpeed, dist: 0, score: 0, gems: 0, bars: 0,
  countdown: 0, things: [], nextSpawn: 20, id: 0, phase, cfg,
});

const hasGoals = (c: Challenge) => c.targetScore > 0;
const goalsMet = (g: Shared) =>
  hasGoals(g.cfg) && g.score >= g.cfg.targetScore && g.gems >= g.cfg.gemGoal && g.bars >= g.cfg.barJumpGoal;

type Hud = { score: number; gems: number; bars: number; countdown: number };

function World({ s, onTick, onEnd, sfx }: {
  s: React.MutableRefObject<Shared>;
  onTick: (h: Hud) => void;
  onEnd: (won: boolean) => void;
  sfx: (n: "gem" | "crash") => void;
}) {
  const ball = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const stripes = useRef<THREE.Group>(null);
  const [, force] = useState(0);
  const tickAcc = useRef(0);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const g = s.current;
    if (g.phase === "play" && g.countdown > 0) {
      g.countdown = Math.max(0, g.countdown - dt);
    } else if (g.phase === "play") {
      g.speed = Math.min(g.cfg.maxSpeed, g.speed + dt * 0.6);
      const dz = g.speed * dt;
      g.dist += dz;
      g.score += dz * 0.5;

      g.x += (laneX(g.lane) - g.x) * (1 - Math.exp(-14 * dt));
      g.vy -= GRAVITY * dt;
      g.y += g.vy * dt;
      if (g.y < 0.6) { g.y = 0.6; g.vy = 0; }

      let changed = false;
      for (const t of g.things) {
        t.z += dz;
        if (!t.hit && Math.abs(t.z) < 0.9 && Math.abs(laneX(t.lane) - g.x) < 1.1) {
          if (t.kind === "gem") { t.hit = true; g.score += 25; g.gems++; changed = true; sfx("gem"); }
          else if (t.kind === "bar" && g.y >= 1.4) { t.hit = true; g.bars++; }
          else { g.phase = "over"; sfx("crash"); onEnd(false); }
        }
      }
      const before = g.things.length;
      g.things = g.things.filter((t) => t.z < 8 && !(t.kind === "gem" && t.hit));
      if (g.things.length !== before) changed = true;

      g.nextSpawn -= dz;
      if (g.nextSpawn <= 0) {
        const free = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === free) {
            if (Math.random() < g.cfg.gemFrequency)
              for (let k = 0; k < 3; k++) g.things.push({ id: g.id++, lane: l, z: SPAWN_Z - k * 3, kind: "gem", hit: false });
          } else if (Math.random() < g.cfg.obstacleDensity) {
            g.things.push({ id: g.id++, lane: l, z: SPAWN_Z, kind: Math.random() < g.cfg.barRatio ? "bar" : "block", hit: false });
          }
        }
        g.nextSpawn = 14 + Math.random() * 8 - Math.min(6, g.speed / 8);
        changed = true;
      }
      if (changed) force((n) => n + 1);
      if (g.phase === "play" && goalsMet(g)) { g.phase = "won"; onEnd(true); }
    }

    tickAcc.current += dt;
    if (tickAcc.current > 0.1) {
      tickAcc.current = 0;
      onTick({ score: Math.floor(g.score), gems: g.gems, bars: g.bars, countdown: Math.ceil(g.countdown) });
    }

    const moving = g.phase === "play" && g.countdown <= 0;
    if (ball.current) {
      ball.current.position.set(g.x, g.y, 0);
      if (g.phase !== "paused") ball.current.rotation.x -= (moving ? g.speed : 2) * dt / 0.6;
    }
    if (group.current) {
      for (const child of group.current.children) {
        const t = g.things.find((x) => x.id === child.userData["id"]);
        if (t) child.position.z = t.z;
        if (child.userData["gem"] && g.phase !== "paused") child.rotation.y += dt * 3;
      }
    }
    if (stripes.current) stripes.current.position.z = g.dist % 6;
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

const stop = (e: React.PointerEvent) => e.stopPropagation();

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="game-toggle" data-on={on} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span>{label}</span>
      <span className="game-switch"><span className="game-knob" /></span>
    </button>
  );
}

export function OrbDash() {
  const [challenge, setChallenge] = useState<Challenge>(CLASSIC);
  const s = useRef<Shared>(fresh(CLASSIC));
  const audio = useRef<GameAudio | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<Hud>({ score: 0, gems: 0, bars: 0, countdown: 0 });
  const [best, setBest] = useState(0);
  const [music, setMusic] = useState(false);
  const [sfx, setSfx] = useState(false);
  const [panel, setPanel] = useState<"none" | "settings" | "ai" | "coach" | "history">("none");
  const [target, setTarget] = useState("1500");
  const [style, setStyle] = useState(STYLES[1] ?? "");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [coachIn, setCoachIn] = useState({ score: "", gems: "", hits: "1" });
  const [tip, setTip] = useState<{ focus: string; tip: string } | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");

  const getAudio = () => (audio.current ??= new GameAudio());

  useEffect(() => {
    setBest(Number(localStorage.getItem("orbdash-best") || 0));
    setHistory(parseHistory(localStorage.getItem(HISTORY_KEY)));
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    const m = localStorage.getItem("orbdash-music");
    const f = localStorage.getItem("orbdash-sfx");
    setMusic(m === null ? !mobile : m === "1");
    setSfx(f === null ? !mobile : f === "1");
  }, []);

  useEffect(() => {
    const a = getAudio();
    a.music = music;
    a.sfx = sfx;
    if (music && phase === "play") a.startMusic(); else a.stopMusic();
  }, [music, sfx, phase]);

  const saveMusic = (v: boolean) => { setMusic(v); localStorage.setItem("orbdash-music", v ? "1" : "0"); };
  const saveSfx = (v: boolean) => { setSfx(v); localStorage.setItem("orbdash-sfx", v ? "1" : "0"); };

  const start = (cfg: Challenge = challenge) => {
    s.current = { ...fresh(cfg, "play"), countdown: 0 };
    setChallenge(cfg);
    setHud({ score: 0, gems: 0, bars: 0, countdown: 0 });
    setPanel("none");
    setPhase("play");
    getAudio().play("click");
  };

  const pause = () => {
    if (s.current.phase !== "play") return;
    s.current.phase = "paused";
    setPhase("paused");
  };
  const resume = () => {
    if (s.current.phase !== "paused") return;
    s.current.phase = "play";
    s.current.countdown = RESUME_COUNTDOWN;
    setPanel("none");
    setPhase("play");
  };

  const move = (d: number) => { const g = s.current; if (g.phase === "play" && g.countdown <= 0) g.lane = Math.max(0, Math.min(2, g.lane + d)); };
  const jump = () => {
    const g = s.current;
    if (g.phase === "play" && g.countdown <= 0 && g.y <= 0.61) { g.vy = JUMP_V; getAudio().play("jump"); }
  };

  // Auto-pause when the app goes to background (phone call, tab switch, lock screen).
  useEffect(() => {
    const onHide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", pause);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("blur", pause); };
  }, []);

  const keysRef = useRef({ start, pause, resume, move, jump });
  keysRef.current = { start, pause, resume, move, jump };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const a = keysRef.current;
      const ph = s.current.phase;
      if (e.key === "Escape" || e.key === "p") { if (ph === "play") a.pause(); else if (ph === "paused") a.resume(); return; }
      if (["ArrowLeft", "a"].includes(e.key)) a.move(-1);
      if (["ArrowRight", "d"].includes(e.key)) a.move(1);
      if (["ArrowUp", "w", " "].includes(e.key)) {
        if (ph === "play") a.jump(); else if (ph === "paused") a.resume(); else if (ph !== "menu" || true) a.start();
      }
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
      const w = window.innerWidth;
      if (e.clientX < w / 3) move(-1); else if (e.clientX > (2 * w) / 3) move(1); else jump();
    } else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
  };

  const onEnd = (won: boolean) => {
    const sc = Math.floor(s.current.score);
    setHud((h) => ({ ...h, score: sc, gems: s.current.gems, bars: s.current.bars }));
    setBest((b) => { const nb = Math.max(b, sc); localStorage.setItem("orbdash-best", String(nb)); return nb; });
    const run: RunRecord = {
      at: Date.now(), score: sc, gems: s.current.gems, bars: s.current.bars, hits: won ? 0 : 1,
      challenge: s.current.cfg.title, won: hasGoals(s.current.cfg) ? won : null,
    };
    setHistory((l) => { const nl = addRun(l, run); localStorage.setItem(HISTORY_KEY, JSON.stringify(nl)); return nl; });
    setCoachIn({ score: String(sc), gems: String(run.gems), hits: String(run.hits) });
    setTip(null);
    if (won) getAudio().play("win");
    setPhase(won ? "won" : "over");
  };

  const askCoach = async () => {
    setCoachBusy(true);
    setCoachError("");
    try {
      const res = await getCoachTip({ data: {
        score: Number(coachIn.score) || 0, gems: Number(coachIn.gems) || 0, hits: Number(coachIn.hits) || 0,
        best, challenge: challenge.title,
      } });
      if (res.ok) setTip({ focus: res.focus, tip: res.tip }); else setCoachError(res.error);
    } catch {
      setCoachError("Couldn't reach the coach. Check your connection and try again.");
    } finally {
      setCoachBusy(false);
    }
  };

  const clearHistory = () => { setHistory([]); localStorage.removeItem(HISTORY_KEY); };

  const generate = async () => {
    setAiBusy(true);
    setAiError("");
    try {
      const res = await createChallenge({ data: { targetScore: Number(target) || 1000, style } });
      if (res.ok) { setChallenge(res.challenge); setPanel("none"); }
      else setAiError(res.error);
    } catch {
      setAiError("Couldn't reach the challenge maker. Check your connection and try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const goals = hasGoals(challenge);
  const overlay = phase !== "play" || panel !== "none";

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
        <World s={s} onTick={setHud} onEnd={onEnd} sfx={(n) => getAudio().play(n)} />
      </Canvas>

      <div className="game-hud">
        <div className="game-score">{hud.score}</div>
        <div className="game-best">best {best}</div>
        {goals && phase !== "menu" && (
          <div className="game-goals">
            <span data-done={hud.score >= challenge.targetScore}>★ {Math.min(hud.score, challenge.targetScore)}/{challenge.targetScore}</span>
            {challenge.gemGoal > 0 && <span data-done={hud.gems >= challenge.gemGoal}>◆ {hud.gems}/{challenge.gemGoal}</span>}
            {challenge.barJumpGoal > 0 && <span data-done={hud.bars >= challenge.barJumpGoal}>⤒ {hud.bars}/{challenge.barJumpGoal}</span>}
          </div>
        )}
      </div>

      {phase === "play" && (
        <button className="game-icon-btn game-pause" aria-label="Pause" onPointerDown={stop} onPointerUp={stop} onClick={pause}>
          <span className="game-pause-glyph" />
        </button>
      )}
      {phase === "play" && hud.countdown > 0 && <div className="game-countdown">{hud.countdown}</div>}

      {overlay && (
        <div className="game-overlay" onPointerDown={stop} onPointerUp={stop}>
          {panel === "settings" ? (
            <div className="game-card">
              <h2 className="game-subtitle">Settings</h2>
              <div className="game-stack">
                <Toggle label="Music" on={music} onChange={saveMusic} />
                <Toggle label="Sound effects" on={sfx} onChange={saveSfx} />
              </div>
              <button className="game-btn" onClick={() => setPanel("none")}>Done</button>
            </div>
          ) : panel === "ai" ? (
            <div className="game-card">
              <h2 className="game-subtitle">AI challenge</h2>
              <label className="game-label">Target score
                <input className="game-input" type="number" inputMode="numeric" min={100} max={20000} value={target} onChange={(e) => setTarget(e.target.value)} />
              </label>
              <div className="game-label">Challenge style</div>
              <div className="game-chips">
                {STYLES.map((st) => (
                  <button key={st} className="game-chip" data-on={style === st} onClick={() => setStyle(st)}>{st}</button>
                ))}
              </div>
              <input className="game-input" placeholder="…or describe your own" value={style} maxLength={120} onChange={(e) => setStyle(e.target.value)} />
              {aiError && <p className="game-error">{aiError}</p>}
              <button className="game-btn" disabled={aiBusy} onClick={generate}>{aiBusy ? "Designing…" : "Create challenge"}</button>
              <button className="game-link" onClick={() => setPanel("none")}>Back</button>
            </div>
          ) : (
            <div className="game-card">
              <h1 className="game-title">
                {phase === "menu" ? "Orb Dash" : phase === "paused" ? "Paused" : phase === "won" ? "Challenge done!" : "Crashed!"}
              </h1>
              {(phase === "over" || phase === "won") && <p className="game-final">Score {hud.score}</p>}
              <div className="game-challenge">
                <strong>{challenge.title}</strong>
                <span>{challenge.briefing}</span>
                {goals && (
                  <span className="game-goal-list">
                    Reach {challenge.targetScore}
                    {challenge.gemGoal > 0 && ` · ${challenge.gemGoal} gems`}
                    {challenge.barJumpGoal > 0 && ` · jump ${challenge.barJumpGoal} bars`}
                  </span>
                )}
              </div>
              {phase === "menu" && (
                <p className="game-help">Swipe or tap sides to switch lanes. Swipe up or tap middle to jump purple bars.</p>
              )}
              {phase === "paused" ? (
                <>
                  <button className="game-btn" onClick={resume}>Resume</button>
                  <button className="game-link" onClick={() => { setPhase("menu"); s.current = fresh(challenge); }}>Quit run</button>
                </>
              ) : (
                <button className="game-btn" onClick={() => start()}>{phase === "menu" ? "Play" : "Again"}</button>
              )}
              <div className="game-row">
                {phase !== "paused" && <button className="game-pill" onClick={() => setPanel("ai")}>✦ AI challenge</button>}
                {goals && phase !== "paused" && <button className="game-pill" onClick={() => setChallenge(CLASSIC)}>Classic</button>}
                <button className="game-pill" onClick={() => setPanel("settings")}>Settings</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
