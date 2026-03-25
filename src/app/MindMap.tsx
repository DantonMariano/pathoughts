"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ICON_NAMES, iconUrl, type IconName } from "./icons";
import { marked } from "marked";

marked.setOptions({ breaks: true });

interface MindNode {
  id: string;
  x: number;
  y: number;
  label: string;
  icon: IconName;
  connections: string[];
  size: "large" | "medium" | "small";
  state: "active" | "resolved" | "missed" | "future";
  seen: boolean;
  act: number;
}

const SIZE_R = { large: 42, medium: 28, small: 20 };
const BORDER = {
  active: { color: "#b0a890", w: 1.5 },
  resolved: { color: "#504838", w: 1 },
  missed: { color: "#b89a3e", w: 1 },
  future: { color: "#3a3528", w: 3 },
};

// Preload icon images
const imgCache = new Map<string, HTMLImageElement>();
function getImg(name: string): HTMLImageElement | null {
  const url = iconUrl(name);
  if (imgCache.has(url)) return imgCache.get(url)!;
  const img = new Image();
  img.src = url;
  imgCache.set(url, img);
  return img.complete ? img : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gtag = (...args: any[]) => { if (typeof window !== "undefined" && (window as any).gtag) (window as any).gtag(...args); };

export default function MindMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [hovId, setHovId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panSt, setPanSt] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [curAct, setCurAct] = useState(1);
  const [knownActs, setKnownActs] = useState<number[]>([1]);
  const [actNames, setActNames] = useState<Record<number, string>>({});
  const [selAct, setSelAct] = useState<number | null>(1);
  const [editActName, setEditActName] = useState<number | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ msg: string; onOk: () => void } | null>(null);
  const [editLabel, setEditLabel] = useState<string | null>(null);
  const [iconPick, setIconPick] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pathomap");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.nodes) setNodes(data.nodes);
        if (data.curAct) setCurAct(data.curAct);
        // Migrate: derive knownActs from nodes if not saved
        if (data.knownActs) {
          setKnownActs(data.knownActs);
        } else if (data.nodes) {
          setKnownActs([1, ...(data.nodes as MindNode[]).map((n) => n.act)]);
        }
        if (data.actNames) setActNames(data.actNames);
      } else {
        // Fresh start: create a default thought for Act 1
        setNodes([{
          id: crypto.randomUUID(),
          x: window.innerWidth / 2, y: window.innerHeight / 2,
          label: "New Thought", icon: "brain", connections: [],
          size: "large", state: "active", seen: false, act: 1,
        }]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem("pathomap", JSON.stringify({ nodes, curAct, knownActs, actNames }));
    } catch {
      /* ignore */
    }
  }, [nodes, curAct]);

  // Bell sounds
  const playSkyBell = useCallback(() => {
    const audio = new Audio("/sky_bell_final.mp3");
    audio.play().catch(() => {});
    audio.addEventListener("loadedmetadata", () => {
      const secondDong = audio.duration * 0.55;
      setTimeout(() => {
        const audio2 = new Audio("/sky_bell_final.mp3");
        audio2.play().catch(() => {});
      }, secondDong * 1000);
    });
  }, []);

  const playSoborBell = useCallback(() => {
    const audio = new Audio("/Sobor_Bell_Short.mp3");
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    let lastHour = -1;
    const check = () => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
      if (m === 0 && s === 0 && h !== lastHour) {
        lastHour = h;
        if (h === 0) playSoborBell();
        else playSkyBell();
      }
    };
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [playSkyBell, playSoborBell]);

  // Force redraws as images load
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(iv);
  }, []);

  // Prune empty acts that aren't current
  useEffect(() => {
    const usedActs = new Set(nodes.map((n) => n.act));
    setKnownActs((k) => k.filter((a) => a === 1 || usedActs.has(a) || a === curAct));
  }, [curAct, nodes]);

  const acts = [...new Set([...nodes.map((n) => n.act), ...knownActs])].sort((a, b) => a - b);
  if (!acts.includes(curAct)) acts.push(curAct);
  acts.sort((a, b) => a - b);
  const vis = nodes.filter((n) => n.act === curAct);

  const toC = useCallback((vx: number, vy: number) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    return { x: (vx - cx) / zoom + cx, y: (vy - cy) / zoom + cy };
  }, [zoom]);

  const hitNode = useCallback(
    (vx: number, vy: number) => {
      const p = toC(vx, vy);
      for (let i = vis.length - 1; i >= 0; i--) {
        const n = vis[i];
        const dx = n.x + pan.x - p.x,
          dy = n.y + pan.y - p.y;
        if (dx * dx + dy * dy <= (SIZE_R[n.size] + 4) ** 2) return n;
      }
    },
    [vis, pan, toC],
  );

  const hitLine = useCallback(
    (vx: number, vy: number): { from: string; to: string } | null => {
      const p = toC(vx, vy);
      const thresh = 6;
      for (const nd of vis) {
        const ax = nd.x + pan.x, ay = nd.y + pan.y;
        for (const tid of nd.connections) {
          const t = vis.find((n) => n.id === tid);
          if (!t) continue;
          const bx = t.x + pan.x, by = t.y + pan.y;
          const dx = bx - ax, dy = by - ay;
          const len2 = dx * dx + dy * dy;
          if (len2 === 0) continue;
          const t0 = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2));
          const px = ax + t0 * dx, py = ay + t0 * dy;
          const d2 = (p.x - px) ** 2 + (p.y - py) ** 2;
          if (d2 <= thresh * thresh) return { from: nd.id, to: tid };
        }
      }
      return null;
    },
    [vis, pan, toC],
  );

  /* ── Draw ── */
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const W = vw * dpr,
      H = vh * dpr;
    c.width = W;
    c.height = H;
    c.style.width = vw + "px";
    c.style.height = vh + "px";
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Use viewport coords from here (dpr handled by ctx.scale)
    const Wv = vw,
      Hv = vh;

    // BG
    ctx.fillStyle = "#060504";
    ctx.fillRect(0, 0, Wv, Hv);

    // Vignette only (no floor lines)
    const cx = Wv / 2,
      cy = Hv / 2 - 30;
    const vg = ctx.createRadialGradient(
      cx,
      cy + 30,
      Wv * 0.1,
      cx,
      cy + 30,
      Wv * 0.6,
    );
    vg.addColorStop(0, "rgba(6,5,4,0)");
    vg.addColorStop(0.5, "rgba(6,5,4,0.25)");
    vg.addColorStop(1, "rgba(6,5,4,0.88)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, Wv, Hv);

    // Top bar
    ctx.fillStyle = "#060504";
    ctx.fillRect(0, 0, Wv, 68);
    ctx.fillStyle = "#2a2520";
    ctx.fillRect(0, 68, Wv, 1);

    // Apply zoom for world content
    ctx.save();
    ctx.translate(Wv / 2, Hv / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-Wv / 2, -Hv / 2);

    // ── Connections
    vis.forEach((nd) => {
      const sx = nd.x + pan.x,
        sy = nd.y + pan.y;
      nd.connections.forEach((tid) => {
        const t = vis.find((n) => n.id === tid);
        if (!t) return;
        ctx.save();
        ctx.strokeStyle = "#706858";
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(t.x + pan.x, t.y + pan.y);
        ctx.stroke();
        ctx.restore();
      });
    });

    // Connecting line
    if (connecting) {
      const src = vis.find((n) => n.id === connecting);
      if (src) {
        ctx.save();
        ctx.strokeStyle = "#a0907088";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(src.x + pan.x, src.y + pan.y);
        const mx = (mouse.x - Wv / 2) / zoom + Wv / 2;
        const my = (mouse.y - Hv / 2) / zoom + Hv / 2;
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Nodes
    vis.forEach((nd) => {
      const nx = nd.x + pan.x,
        ny = nd.y + pan.y;
      const r = SIZE_R[nd.size];
      const b = BORDER[nd.state];
      const isHov = nd.id === hovId;
      const isSel = nd.id === selId;

      // Red glow for active nodes
      if (nd.state === "active") {
        ctx.save();
        const glowR = nd.seen ? r * 1.15 : r * 1.5;
        const alpha = nd.seen ? 0.2 : 0.4;
        const rg = ctx.createRadialGradient(nx, ny, r * 0.7, nx, ny, glowR);
        rg.addColorStop(0, `rgba(168,40,40,${alpha})`);
        rg.addColorStop(1, "rgba(168,40,40,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Missed glow — yellowish aura
      if (nd.state === "missed") {
        ctx.save();
        const glowR = nd.seen ? r * 1.15 : r * 1.5;
        const alpha = nd.seen ? 0.15 : 0.35;
        const mg = ctx.createRadialGradient(nx, ny, r * 0.7, nx, ny, glowR);
        mg.addColorStop(0, `rgba(184,154,62,${alpha})`);
        mg.addColorStop(1, "rgba(184,154,62,0)");
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Circle bg
      ctx.save();
      if (nd.state === "future") {
        // Larger bg fill to mask connection lines, then stroke at normal r
        ctx.beginPath();
        ctx.arc(nx, ny, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = "#060504";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = "#0e0c0a";
        ctx.fill();
      }

      // Border (only for future nodes — others have borders in their icon images)
      if (nd.state === "future") {
        ctx.strokeStyle = isHov || isSel ? "#d4d4d4" : b.color;
        ctx.lineWidth = b.w;
        ctx.beginPath();
        ctx.arc(nx, ny, r - b.w / 2, 0, Math.PI * 2);
        const circ = Math.PI * 2 * (r - b.w / 2);
        const numDashes = circ > 200 ? 8 : 6;
        const seg = circ / numDashes;
        const minGap = Math.min(10, seg * 0.35);
        // Seed from node id
        let seed = 0;
        for (let i = 0; i < nd.id.length; i++) seed = ((seed << 5) - seed + nd.id.charCodeAt(i)) | 0;
        // Random rotation
        const rot = (Math.abs(seed) % 360) * (Math.PI / 180);
        ctx.translate(nx, ny);
        ctx.rotate(rot);
        ctx.translate(-nx, -ny);
        // Build dash pattern
        const dashes: number[] = [];
        for (let i = 0; i < numDashes; i++) {
          seed = (seed * 1103515245 + 12345) | 0;
          const gapExtra = ((seed >>> 16) % (circ > 200 ? 5 : 3));
          const gap = minGap + gapExtra;
          dashes.push(seg - gap, gap);
        }
        ctx.setLineDash(dashes);
        ctx.lineDashOffset = 0;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Draw icon image (already circular PNGs, no clipping needed)
      if (nd.state !== "future") {
        const img = getImg(nd.icon);
        if (img && img.complete) {
          ctx.save();
          ctx.globalAlpha = nd.state === "resolved" ? 0.4 : 0.9;
          const s = r * 1.15 + 2;
          ctx.drawImage(img, nx - s, ny - s, s * 2, s * 2);
          if (nd.state === "missed") {
            ctx.beginPath();
            ctx.arc(nx, ny, r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(184,154,62,0.25)";
            ctx.fill();
          }
          ctx.restore();
        }
      }
    });

    // (hover tooltip is now an HTML overlay)

    ctx.restore(); // end zoom

    // Redraw header on top of everything
    ctx.fillStyle = "#060504";
    ctx.fillRect(0, 0, Wv, 68);
    ctx.fillStyle = "#2a2520";
    ctx.fillRect(0, 68, Wv, 1);

    // ── HUD top left
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const day = String(now.getDate());
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const baseY = 48;
    ctx.font = "bold 34px 'Liberation Serif', Georgia, serif";
    ctx.fillStyle = "#d4d4d4";
    const prefix = `${hh}:${mm} — `;
    ctx.fillText(prefix, 60, baseY);
    let dx = 60 + ctx.measureText(prefix).width;
    ctx.fillText("D", dx, baseY);
    dx += ctx.measureText("D").width;
    ctx.font = "bold 29px 'Liberation Serif', Georgia, serif";
    ctx.fillText("AY", dx, baseY);
    dx += ctx.measureText("AY").width;
    ctx.font = "bold 34px 'Liberation Serif', Georgia, serif";
    ctx.fillText(` ${day}`, dx, baseY);
    ctx.restore();

    // ── HUD top right tabs
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    const tabs = ["TOWN", "THOUGHTS", "THINGS", "PEOPLE"];
    const tabX = [Wv - 480, Wv - 360, Wv - 230, Wv - 110];
    tabs.forEach((t, i) => {
      const isThoughts = t === "THOUGHTS";
      ctx.font = "condensed 22px 'Noto Sans', sans-serif";
      ctx.fillStyle = isThoughts ? "#d4d4d4" : "#5a5040";
      ctx.fillText(t, tabX[i], 44);
    });
    ctx.font = "condensed 28px 'Noto Sans', sans-serif";
    ctx.fillStyle = "#5a5040";
    ctx.fillText("‹", Wv - 540, 46);
    ctx.fillText("›", Wv - 40, 46);
    ctx.restore();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis, pan, zoom, connecting, mouse, hovId, selId, dragging, tick]);

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  useEffect(() => {
    const h = () => draw();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [draw]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(1.75, Math.max(0.75, z - e.deltaY * 0.001)));
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Mouse ── */
  const onDown = useCallback(
    (e: React.MouseEvent) => {
      const hit = hitNode(e.clientX, e.clientY);
      const cp = toC(e.clientX, e.clientY);
      if (e.button === 2) {
        e.preventDefault();
        if (hit) {
          if (connecting && connecting !== hit.id) {
            setNodes((p) =>
              p.map((n) => {
                if (n.id !== connecting) return n;
                const conns = [...new Set([...n.connections, hit.id])];
                return { ...n, connections: conns };
              }),
            );
            setConnecting(null);
          } else setConnecting(hit.id);
        } else {
          // Check if right-clicking a connection line to disconnect
          const line = hitLine(e.clientX, e.clientY);
          if (line) {
            setNodes((p) =>
              p.map((n) =>
                n.id === line.from
                  ? { ...n, connections: n.connections.filter((c) => c !== line.to) }
                  : n,
              ),
            );
          }
          setConnecting(null);
        }
        return;
      }
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setPanning(true);
        setPanSt({ x: cp.x - pan.x, y: cp.y - pan.y });
        return;
      }
      if (hit) {
        setSelId(hit.id);
        setSelAct(null);
        setDragging(hit.id);
        setDragOff({ x: cp.x - hit.x - pan.x, y: cp.y - hit.y - pan.y });
        setIconPick(null);
      } else {
        setSelId(null);
        setEditLabel(null);
        setIconPick(null);
      }
    },
    [pan, connecting, hitNode, toC],
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
      setHovId(hitNode(e.clientX, e.clientY)?.id ?? null);
      if (panning) {
        const cp = toC(e.clientX, e.clientY);
        setPan({ x: cp.x - panSt.x, y: cp.y - panSt.y });
      }
      if (dragging) {
        const cp = toC(e.clientX, e.clientY);
        setNodes((p) =>
          p.map((n) =>
            n.id === dragging
              ? {
                  ...n,
                  x: cp.x - dragOff.x - pan.x,
                  y: cp.y - dragOff.y - pan.y,
                }
              : n,
          ),
        );
      }
    },
    [panning, panSt, dragging, dragOff, pan, hitNode, toC],
  );

  const onUp = useCallback(() => {
    setPanning(false);
    setDragging(null);
  }, []);

  const onDbl = useCallback(
    (e: React.MouseEvent) => {
      const hit = hitNode(e.clientX, e.clientY);
      if (hit) {
        setSelId(hit.id);
        setSelAct(null);
        setEditLabel(hit.id);
        return;
      }
      const cp = toC(e.clientX, e.clientY);
      const id = crypto.randomUUID();
      const icon = ICON_NAMES[Math.floor(Math.random() * ICON_NAMES.length)];
      setNodes((p) => [
        ...p,
        {
          id,
          x: cp.x - pan.x,
          y: cp.y - pan.y,
          label: "New Thought",
          icon,
          connections: [],
          size: "large",
          state: "active",
          seen: false,
          act: curAct,
        },
      ]);
      setSelId(id);
      setIconPick(id);
      gtag("event", "create_thought", { act: curAct });
    },
    [pan, curAct, hitNode, toC],
  );

  const del = useCallback((id: string) => {
    setNodes((p) =>
      p
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          connections: n.connections.filter((c) => c !== id),
        })),
    );
    setSelId(null);
    setEditLabel(null);
    setIconPick(null);
  }, []);

  const cycleState = useCallback((id: string) => {
    const o: MindNode["state"][] = ["active", "resolved", "missed", "future"];
    setNodes((p) =>
      p.map((n) =>
        n.id === id
          ? { ...n, state: o[(o.indexOf(n.state) + 1) % o.length] }
          : n,
      ),
    );
  }, []);

  const cycleSize = useCallback((id: string) => {
    const o: MindNode["size"][] = ["small", "medium", "large"];
    setNodes((p) =>
      p.map((n) =>
        n.id === id ? { ...n, size: o[(o.indexOf(n.size) + 1) % o.length] } : n,
      ),
    );
  }, []);

  const sel = nodes.find((n) => n.id === selId);
  const toRoman = (n: number): string => {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
    let r = "";
    for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
    return r;
  };

  // Screen position of a node (pan + zoom)
  const nodeScreen = useCallback((nd: MindNode) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const wx = nd.x + pan.x, wy = nd.y + pan.y;
    return { x: (wx - cx) * zoom + cx, y: (wy - cy) * zoom + cy };
  }, [pan, zoom]);

  // Which node to show the tooltip for (editing takes priority over hover)
  const tooltipNode = editLabel ? vis.find((n) => n.id === editLabel) : (!dragging && hovId ? vis.find((n) => n.id === hovId && n.state !== "future") : null);

  return (
    <div
      className="fixed inset-0"
      onMouseMove={onMove}
      onMouseUp={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onDoubleClick={onDbl}
        onMouseDown={onDown}
      />

      {/* Acts sidebar */}
      <div
        className="absolute z-20 flex flex-col"
        style={{ left: 60, top: 110, gap: 3 }}
      >
        {acts.map((a) => {
          const has = nodes.some((n) => n.act === a);
          const name = actNames[a] || `Act ${toRoman(a)}`;
          return (
            <button
              key={a}
              onClick={() => { setCurAct(a); setSelAct(a); setSelId(null); setEditLabel(null); setIconPick(null); }}
              style={{
                textAlign: "left",
                fontSize: 32,
                fontFamily: "'Noto Sans', sans-serif",
                fontStretch: "condensed",
                color: curAct === a ? "#d4d4d4" : "#5a5040",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              {!has && "* "}{name}
            </button>
          );
        })}
        <button
          onClick={() => {
            let next = curAct + 1;
            while (acts.includes(next)) next++;
            setKnownActs((k) => [...new Set([...k, next])]);
            setCurAct(next);
            setSelAct(next);
            setSelId(null);
            gtag("event", "create_act", { act_number: next });
          }}
          style={{
            textAlign: "left",
            fontSize: 14,
            fontStyle: "italic",
            color: "#3a3528",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginTop: 6,
          }}
        >
          + new act
        </button>
      </div>

      {/* Floating tooltip / editor overlay */}
      {tooltipNode && (() => {
        const sp = nodeScreen(tooltipNode);
        const top = sp.y + SIZE_R[tooltipNode.size] * zoom + 10;
        return (
          <div
            className="absolute z-30"
            style={{
              left: sp.x, top,
              transform: `translateX(-50%) scale(${zoom})`,
              transformOrigin: "top center",
              background: "#060504",
              border: `${1 / zoom}px solid rgba(212,212,212,0.5)`,
              padding: "12px 18px",
              maxWidth: 400,
              minWidth: 120,
              textAlign: "center",
              overflowWrap: "break-word",
              wordBreak: "break-all",
              pointerEvents: editLabel ? "auto" : "none",
            }}
          >
            {editLabel === tooltipNode.id ? (
              <div>
                <textarea
                  autoFocus
                  className="themed-scroll"
                  ref={(el) => { if (el) el.dataset.editTarget = "1"; }}
                  defaultValue={tooltipNode.label}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      const val = (e.target as HTMLTextAreaElement).value || "...";
                      setNodes((p) => p.map((n) => n.id === tooltipNode.id ? { ...n, label: val } : n));
                      setEditLabel(null);
                    }
                    if (e.key === "Escape") setEditLabel(null);
                  }}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    color: "#d4d4d4", fontSize: 16, fontFamily: "'Noto Sans', sans-serif",
                    fontStretch: "condensed", caretColor: "#a83232",
                    width: "100%", minHeight: 60, resize: "vertical", lineHeight: 1.5,
                    textAlign: "left",
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const ta = document.querySelector<HTMLTextAreaElement>("[data-edit-target]");
                      const val = ta?.value || "...";
                      setNodes((p) => p.map((n) => n.id === tooltipNode.id ? { ...n, label: val } : n));
                      setEditLabel(null);
                    }}
                    style={{ fontSize: 11, color: "#d4d4d4", background: "none", border: "1px solid #3a3528", cursor: "pointer", padding: "2px 10px", letterSpacing: "0.05em" }}
                  >SAVE</button>
                  <button
                    onMouseDown={() => setEditLabel(null)}
                    style={{ fontSize: 11, color: "#5a5040", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}
                  >CANCEL</button>
                </div>
              </div>
            ) : (
              <div
                className="thought-md"
                style={{ fontSize: 20, fontStyle: "normal", textAlign: "center" }}
                dangerouslySetInnerHTML={{ __html: marked.parse(tooltipNode.label) as string }}
              />
            )}
          </div>
        );
      })()}

      <div className="absolute z-20" style={{ left: 60, bottom: 36 }}>
        {sel ? (
          <div>
            <div
              className="flex"
              style={{
                gap: 14,
                marginTop: 8,
                fontSize: 11,
                letterSpacing: "0.08em",
              }}
            >
              <button
                onClick={() => cycleState(sel.id)}
                style={{
                  color: BORDER[sel.state].color,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                [{sel.state.toUpperCase()}]
              </button>
              <button
                onClick={() => cycleSize(sel.id)}
                style={{
                  color: "#6a6050",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                SIZE: {sel.size.toUpperCase()}
              </button>
              <button
                onClick={() => setIconPick(iconPick === sel.id ? null : sel.id)}
                style={{
                  color: "#6a6050",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ICON
              </button>
              <button
                onClick={() =>
                  setNodes((p) =>
                    p.map((n) =>
                      n.id === sel.id ? { ...n, seen: !n.seen } : n,
                    ),
                  )
                }
                style={{
                  color: sel.seen ? "#6a6050" : "#b89a3e",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {sel.seen ? "SEEN" : "UNSEEN"}
              </button>
              <button
                onClick={() => del(sel.id)}
                style={{
                  color: "#a83232",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                DELETE
              </button>
            </div>
          </div>
        ) : selAct !== null ? (
          <div>
            {editActName === selAct ? (
              <input
                autoFocus
                defaultValue={actNames[selAct] || `Act ${toRoman(selAct)}`}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== `Act ${toRoman(selAct)}`) {
                    setActNames((p) => ({ ...p, [selAct]: val }));
                  } else {
                    setActNames((p) => { const c = { ...p }; delete c[selAct]; return c; });
                  }
                  setEditActName(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditActName(null);
                }}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "#d4d4d4", fontSize: 18, fontFamily: "'Noto Sans', sans-serif",
                  fontStretch: "condensed", caretColor: "#a83232", width: 300,
                }}
              />
            ) : (
              <div style={{ fontSize: 18, color: "#d4d4d4", marginBottom: 8 }}>
                {actNames[selAct] || `Act ${toRoman(selAct)}`}
              </div>
            )}
            <div className="flex" style={{ gap: 14, fontSize: 11, letterSpacing: "0.08em" }}>
              <button
                onClick={() => setEditActName(selAct)}
                style={{ color: "#6a6050", background: "none", border: "none", cursor: "pointer" }}
              >RENAME</button>
              <button
                onClick={() => {
                  const name = actNames[selAct] || `Act ${toRoman(selAct)}`;
                  const hasThoughts = nodes.some((n) => n.act === selAct);
                  const doDelete = () => {
                    setNodes((p) => p.filter((n) => n.act !== selAct));
                    setKnownActs((k) => k.filter((k2) => k2 !== selAct));
                    setActNames((p) => { const c = { ...p }; delete c[selAct]; return c; });
                    const remaining = acts.filter((x) => x !== selAct);
                    const next = remaining.length ? remaining[remaining.length - 1] : 1;
                    setCurAct(next);
                    setSelAct(next);
                    setConfirmDlg(null);
                  };
                  if (!hasThoughts) { doDelete(); return; }
                  setConfirmDlg({ msg: `Delete ${name}? All thoughts will be lost.`, onOk: doDelete });
                }}
                style={{ color: "#a83232", background: "none", border: "none", cursor: "pointer" }}
              >DELETE</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 15, fontStyle: "italic", color: "#3a3528" }}>
            Double-click to create a thought
          </div>
        )}
      </div>

      {/* Icon picker grid */}
      {iconPick && sel && (
        <div
          className="absolute z-30 overflow-y-auto themed-scroll"
          style={{
            left: 60,
            bottom: 100,
            maxHeight: "60vh",
            background: "rgba(10,8,6,0.97)",
            border: "1px solid #3a3528",
            padding: "10px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#5a5040",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            CHOOSE ICON ({ICON_NAMES.length})
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 52px)",
              gap: 4,
            }}
          >
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setNodes((p) =>
                    p.map((n) => (n.id === sel.id ? { ...n, icon: name } : n)),
                  );
                  setIconPick(null);
                }}
                title={name}
                style={{
                  width: 52,
                  height: 52,
                  background: sel.icon === name ? "#2a2520" : "#0e0c0a",
                  border: `1px solid ${sel.icon === name ? "#d4d4d4" : "#2a2520"}`,
                  borderRadius: "50%",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconUrl(name)}
                  alt={name}
                  width={36}
                  height={36}
                  style={{ objectFit: "contain", opacity: 0.85 }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connecting indicator */}
      {connecting && (
        <div
          className="absolute z-30"
          style={{
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#a09080",
            background: "rgba(10,8,6,0.95)",
            border: "1px solid #3a352844",
            padding: "8px 20px",
          }}
        >
          Right-click target to connect · Right-click empty to cancel · Right-click on line to delete
        </div>
      )}
      {/* Custom confirm dialog */}
      {confirmDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(6,5,4,0.85)" }}>
          <div style={{ background: "#0e0c0a", border: "1px solid rgba(212,212,212,0.5)", padding: "24px 32px", maxWidth: 360, textAlign: "center" }}>
            <div style={{ color: "#d4d4d4", fontSize: 16, marginBottom: 20, lineHeight: 1.5 }}>{confirmDlg.msg}</div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button
                onClick={confirmDlg.onOk}
                style={{ fontSize: 12, color: "#d4d4d4", background: "none", border: "1px solid #3a3528", cursor: "pointer", padding: "4px 20px", letterSpacing: "0.05em" }}
              >CONFIRM</button>
              <button
                onClick={() => setConfirmDlg(null)}
                style={{ fontSize: 12, color: "#5a5040", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}
              >CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
