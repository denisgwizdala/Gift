"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * Birthday countdown:
 *   "Happy 0...1...2...27" then "1" walks in from far right (steps),
 *   stops at a distance, aims, BANG, "7" collapses, "1" walks to 7's spot.
 *   Final: "Happy 21 🎉"
 */
export function BirthdayCountdown({ triggerShoot = false }: { triggerShoot?: boolean }) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<
    "counting" | "show27" | "walking" | "aiming" | "shoot" | "collapse" | "advance" | "done"
  >("counting");

  // Counting phase
  useEffect(() => {
    if (phase !== "counting") return;
    if (count >= 27) {
      setPhase("show27");
      return;
    }
    const speed = count < 10 ? 120 : count < 20 ? 100 : 80;
    const t = setTimeout(() => setCount(count + 1), speed);
    return () => clearTimeout(t);
  }, [count, phase]);

  // Trigger walking when triggerShoot becomes true
  useEffect(() => {
    if (triggerShoot && phase === "show27") {
      setPhase("walking");
    }
  }, [triggerShoot, phase]);

  // Phase transitions (without auto-starting walking from show27)
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
      className="flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 1.6 } }}
    >
      <div className="inline-flex items-baseline gap-3" style={textStyle}>
        <span>Happy</span>

        {/* Fixed-width number container so "Happy" never shifts */}
        <span
          className="relative inline-block"
          style={{ width: "1.8em", height: "1.2em" }}
        >
          {phase === "counting" && <span style={{ position: "absolute", left: 0 }}>{count}</span>}
          {phase === "show27" && <span style={{ position: "absolute", left: 0 }}>27</span>}

          {(phase === "walking" || phase === "aiming" || phase === "shoot" || phase === "collapse" || phase === "advance" || phase === "done") && (
            <>
              <span style={{ position: "absolute", left: 0 }}>2</span>

              {/* 7 — gets shot, then collapses */}
              {phase !== "done" && (
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
              )}

              {/* 1 walking in with gun (or final position when done) */}
              <motion.span
                style={{ position: "absolute", left: "0.55em", display: "inline-flex", alignItems: "baseline" }}
                animate={oneAnim}
                transition={oneTrans}
              >
                {phase !== "done" && (
                  <span
                    style={{
                      fontSize: "0.5em",
                      marginRight: "-6px",
                      filter: "grayscale(1) brightness(0.4) contrast(1.5)",
                    }}
                  >
                    {"\uD83D\uDD2B"}
                  </span>
                )}

                {/* Bang flash at the barrel tip */}
                {phase === "shoot" && (
                  <motion.span
                    style={{ position: "absolute", left: "-0.5em", top: "1.5em", fontSize: "0.4em", lineHeight: 1 }}
                    initial={{ opacity: 1, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    transition={{ duration: 0.4 }}
                  >
                    {"\uD83D\uDCA5"}
                  </motion.span>
                )}

                <span>1</span>
              </motion.span>

              {/* 🎉 emoji slides in when done */}
              {phase === "done" && (
                <motion.span
                  style={{ position: "absolute", left: "1.2em" }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
                >
                  {"\uD83C\uDF89"}
                </motion.span>
              )}
            </>
          )}
        </span>
      </div>
    </motion.div>
  );
}
