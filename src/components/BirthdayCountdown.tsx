"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * Birthday countdown:
 *   "Happy 0...1...2...27" then "1" walks in from far right (steps),
 *   stops at a distance, aims, BANG, "7" collapses, "1" walks to 7's spot.
 *   Final: "Happy 21 🎉"
 */
export function BirthdayCountdown() {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<
    "counting" | "show27" | "walking" | "aiming" | "shoot" | "collapse" | "advance" | "done"
  >("counting");

  // Counting phase
  useEffect(() => {
    if (phase !== "counting") return;
    if (count >= 27) {
      setPhase("show27");
      const t = setTimeout(() => setPhase("walking"), 1400);
      return () => clearTimeout(t);
    }
    const speed = count < 10 ? 120 : count < 20 ? 100 : 80;
    const t = setTimeout(() => setCount(count + 1), speed);
    return () => clearTimeout(t);
  }, [count, phase]);

  // Phase transitions
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === "walking") t = setTimeout(() => setPhase("aiming"), 1700);
    else if (phase === "aiming") t = setTimeout(() => setPhase("shoot"), 700);
    else if (phase === "shoot") t = setTimeout(() => setPhase("collapse"), 400);
    else if (phase === "collapse") t = setTimeout(() => setPhase("advance"), 800);
    else if (phase === "advance") t = setTimeout(() => setPhase("done"), 900);
    return () => { if (t) clearTimeout(t); };
  }, [phase]);

  const textStyle: React.CSSProperties = {
    fontFamily: "Caveat, cursive",
    fontSize: "clamp(36px, 7vw, 56px)",
    color: "#FAF7F2",
    fontWeight: 700,
    textShadow: "0 4px 20px rgba(0,0,0,0.4)",
  };

  // The "1" character's animated position (px offset from 7's location)
  let oneAnim: { x: number | number[]; y: number | number[] } = { x: 0, y: 0 };
  let oneTrans: object = { duration: 0 };

  if (phase === "walking") {
    // Walks in from far right, bobbing each step, stops at x=90 (a few chars away)
    oneAnim = { x: [220, 190, 160, 140, 120, 100, 90], y: [0, -7, 0, -7, 0, -7, 0] };
    oneTrans = { duration: 1.7, ease: "linear", times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1] };
  } else if (phase === "aiming" || phase === "shoot" || phase === "collapse") {
    oneAnim = { x: 90, y: 0 };
    oneTrans = { duration: 0 };
  } else if (phase === "advance") {
    // 1 walks to where 7 was
    oneAnim = { x: [90, 70, 50, 30, 10, 0], y: [0, -7, 0, -7, 0, 0] };
    oneTrans = { duration: 0.9, ease: "linear", times: [0, 0.2, 0.4, 0.6, 0.8, 1] };
  } else {
    oneAnim = { x: 0, y: 0 };
    oneTrans = { duration: 0 };
  }

  return (
    <motion.div
      className="flex items-center justify-center mt-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 1.6 } }}
    >
      <div className="inline-flex items-baseline gap-3" style={textStyle}>
        <span>Happy</span>

        {phase === "counting" && <span>{count}</span>}
        {phase === "show27" && <span>27</span>}

        {(phase === "walking" || phase === "aiming" || phase === "shoot" || phase === "collapse" || phase === "advance") && (
          <span className="relative inline-flex items-baseline" style={{ minWidth: "5em", height: "1.2em" }}>
            <span>2</span>

            {/* 7 — gets shot, then collapses */}
            <motion.span
              style={{ position: "absolute", left: "0.55em" }}
              initial={{ y: 0, opacity: 1, rotate: 0, color: "#FAF7F2" }}
              animate={
                phase === "collapse" || phase === "advance"
                  ? { y: 70, opacity: 0, rotate: 80, color: "#ff6b6b" }
                  : phase === "shoot"
                  ? { color: "#ff6b6b" }
                  : { color: "#FAF7F2" }
              }
              transition={{ duration: 0.7, ease: "easeIn" }}
            >
              7
            </motion.span>

            {/* 1 walking in with gun */}
            <motion.span
              style={{ position: "absolute", left: "0.55em", display: "inline-flex", alignItems: "baseline" }}
              animate={oneAnim}
              transition={oneTrans}
            >
              <span
                style={{
                  fontSize: "0.55em",
                  marginRight: "4px",
                  filter: "grayscale(1) brightness(0.4) contrast(1.5)",
                }}
              >
                {"\uD83D\uDD2B"}
              </span>

              {/* Bang flash */}
              {phase === "shoot" && (
                <motion.span
                  style={{ position: "absolute", left: "-0.6em", top: "-0.5em", fontSize: "0.7em" }}
                  initial={{ opacity: 1, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 2.2 }}
                  transition={{ duration: 0.4 }}
                >
                  {"\uD83D\uDCA5"}
                </motion.span>
              )}

              <span>1</span>
            </motion.span>
          </span>
        )}

        {phase === "done" && (
          <motion.span
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            21 {"\uD83C\uDF89"}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
