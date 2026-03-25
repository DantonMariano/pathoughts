"use client";

import { useEffect, useState } from "react";
import MindMap from "./MindMap";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(https://wallpaperaccess.com/full/3468566.jpg)",
            backgroundSize: "cover", backgroundPosition: "80% center",
            backgroundRepeat: "no-repeat",
            transform: "scale(1.1)", transformOrigin: "80% center",
          }}
        />
        <div style={{
          position: "relative", width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "rgba(6,5,4,0.92)", border: "1px solid rgba(212,212,212,0.5)",
            padding: "32px 28px", maxWidth: 320, textAlign: "center",
          }}>
          <div style={{ color: "#d4d4d4", fontSize: 20, fontFamily: "'Noto Sans', sans-serif", fontStretch: "condensed", marginBottom: 12 }}>
            Pathologic 2 — Mind Map
          </div>
          <div style={{ color: "#6a6050", fontSize: 14, fontFamily: "'Noto Sans', sans-serif", fontStretch: "condensed", lineHeight: 1.6 }}>
            This website doesn&apos;t work on mobile.<br />Please access it via desktop.
          </div>
          </div>
        </div>
      </div>
    );
  }

  return <MindMap />;
}
