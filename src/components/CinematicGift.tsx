"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { AnimatePresence, motion } from "motion/react";
import { PHOTOS, GIFT_TITLE, GIFT_SUBTITLE, type GiftPhoto } from "@/lib/photos";
import { BirthdayCountdown } from "./BirthdayCountdown";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

function applyCream(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const trySet = (n: string, v: unknown) => {
      try { map.setPaintProperty(layer.id, n, v as never); } catch {}
    };
    switch (layer.type) {
      case "background": trySet("background-color", "#FAF7F2"); break;
      case "fill": case "fill-extrusion": {
        const h = `${("source-layer" in layer ? layer["source-layer"] : "") ?? ""} ${layer.id}`.toLowerCase();
        trySet("fill-color", h.includes("water") || h.includes("ocean") || h.includes("sea") ? "hsl(205,40%,78%)" : "#F3EEE4");
        break;
      }
      case "line": trySet("line-color", "#CFC6B3"); break;
      case "symbol":
        trySet("text-color", "#4A4238");
        trySet("text-halo-color", "#FAF7F2");
        trySet("text-halo-width", 1.25);
        break;
    }
  }
}

// Filter photos with GPS
const allPhotos = PHOTOS.filter((p) => p.lat != null && p.lng != null && p.lat !== 0 && p.lng !== 0);

// Base path for GitHub Pages (set via env during build)
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

function withBase(src: string): string {
  return BASE_PATH + src;
}

// ============================================================
// SCRIPTED STORY SEQUENCE
// Each step is either a "text" overlay, a "photo" reveal, or a "flash" sequence
// ============================================================

interface StepText { type: "text"; text: string; duration?: number }
interface StepPhoto { type: "photo"; photoIndex: number; caption: string; flyTo?: boolean }
interface StepFlash { type: "flash" }
interface StepSlotMachine { type: "slot-machine" }
type Step = StepText | StepPhoto | StepFlash | StepSlotMachine;

// Map photo src to index in allPhotos
function findPhoto(srcFragment: string): number {
  return allPhotos.findIndex((p) => p.src.includes(srcFragment));
}

const STORY: Step[] = [
  // Intro — first image (no more "pierwszy wypad" as separate step, it's in the intro sequence)
  // Image 1 — NYE
  { type: "photo", photoIndex: findPhoto("20191231_234723_144 (1)"), caption: "Grudniowy wieczór" },
  // Family growing
  { type: "text", text: "Od tamtego czasu trochę się zmieniło...", duration: 3000 },
  // Image 2 — First cat
  { type: "photo", photoIndex: findPhoto("Snapchat-1358228142"), caption: "Od pierwszego dziecka" },
  // Image 3 — Second cat
  { type: "photo", photoIndex: findPhoto("20240721_185041_IMG_6935"), caption: "Po kolejne" },
  // More kids
  { type: "text", text: "A potem jeszcze więcej...", duration: 2500 },
  // Image 4 — More cats
  { type: "photo", photoIndex: findPhoto("20250131_162754_IMG_9092"), caption: "Więcej dzieci" },
  // Pandemic/war
  { type: "text", text: "Przeżyliśmy razem wojny,\npandemie, kryzysy...", duration: 3500 },
  // Image 5
  { type: "photo", photoIndex: findPhoto("Snapchat-1802505104"), caption: "Pandemie, wojny i kryzysy" },
  // Celebrations
  { type: "text", text: "Były momenty świętowań!", duration: 2500 },
  // Image 6
  { type: "photo", photoIndex: findPhoto("Snapchat-2039348225"), caption: "Zanim potrafiło się piec, trzeba było sobie jakoś radzić" },
  // Nice photos
  { type: "text", text: "Porobiliśmy przez ten czas\ntrochę ładnych zdjęć...", duration: 3000 },
  // Image 5
  { type: "photo", photoIndex: findPhoto("20250418_105112"), caption: "Takie jak to..." },
  // Image 6
  { type: "photo", photoIndex: findPhoto("20250420_170017"), caption: "Albo to..." },
  // New home
  { type: "text", text: "Zwiedziliśmy razem dużo miejsc...", duration: 3000 },
  // Image 7
  { type: "photo", photoIndex: findPhoto("20250426_115409"), caption: "Młodzi my, i szczęśliwi" },
  // Image 8
  { type: "photo", photoIndex: findPhoto("20250426_115845"), caption: "I ładni..." },
  // Years passing
  { type: "text", text: "A pomimo tego, lata mijają...", duration: 3000 },
  // Image 9
  { type: "photo", photoIndex: findPhoto("20250427_112847"), caption: "A my szczęśliwsi i starsi o kolejne lata" },
  // Image 10
  { type: "photo", photoIndex: findPhoto("20250429_181135"), caption: "Choć za to lepiej gotować potrafimy!" },
  // Image 11
  { type: "photo", photoIndex: findPhoto("20240507_133716"), caption: "I pozować" },
  // Flash montage of ALL images then final message
  { type: "flash" },
];

// Birthday countdown is in BirthdayCountdown.tsx (imported above)

// Auto-advance helper — fires onDone after duration ms (if set)
function AutoAdvance({ duration, onDone }: { duration?: number; onDone: () => void }) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);
  return null;
}

export function CinematicGift() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [introText, setIntroText] = useState("");
  const [rouletteDate, setRouletteDate] = useState("");
  const [flashImages, setFlashImages] = useState<string[]>([]);
  const [flashActive, setFlashActive] = useState(false);
  const [finalMessage, setFinalMessage] = useState(false);

  const currentStep = STORY[stepIndex] as Step | undefined;

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const first = allPhotos[0];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [first?.lng ?? -0.42, first?.lat ?? 51.88],
      zoom: 3,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => { applyCream(map); setMapReady(true); });
    map.on("styledata", () => applyCream(map));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const [shootTriggered, setShootTriggered] = useState(false);
  const [giftStep, setGiftStep] = useState<"none" | "buttons" | "nie-tak-szybko" | "remont-text" | "prezent1" | "prezent2-tease">("none");

  // Start the journey — fly to Luton + intro sequence
  const startJourney = useCallback(() => {
    // First trigger the shoot animation
    setShootTriggered(true);
    // Wait for the animation to finish (~5s) before starting the journey
    setTimeout(() => {
      setStarted(true);
      const map = mapRef.current;
      const first = allPhotos[0];
      if (!map || !first) { setStepIndex(0); return; }

      map.flyTo({ center: [first.lng, first.lat], zoom: 12, duration: 2500, essential: true });

      setTimeout(() => {
        setIntroText("tutaj wszystko się zaczęło...");
      }, 2300);

      setTimeout(() => {
        setIntroText("");
        startDateRoulette(first.date, () => {
          setIntroText("Jak się poznaliśmy miałaś 20 lat...");
          setTimeout(() => {
            setIntroText("Nasz pierwszy wspólny wypad na miasto...");
            setTimeout(() => {
              setIntroText("");
              setStepIndex(0);
            }, 2500);
          }, 2800);
        });
      }, 4800);
    }, 5500);
  }, []);

  const startDateRoulette = useCallback((targetDate: string, onDone: () => void) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let count = 0;
    const totalTicks = 18;
    const tick = () => {
      count++;
      if (count < totalTicks) {
        const rDay = Math.floor(Math.random() * 28) + 1;
        const rMonth = months[Math.floor(Math.random() * 12)];
        const rYear = 2018 + Math.floor(Math.random() * 8);
        setRouletteDate(`${rDay} ${rMonth} ${rYear}`);
        setTimeout(tick, count < 10 ? 80 : count < 14 ? 150 : 250);
      } else {
        const d = new Date(targetDate);
        setRouletteDate(d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }));
        setTimeout(() => { setRouletteDate(""); onDone(); }, 1200);
      }
    };
    tick();
  }, []);

  // Advance to next step
  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= STORY.length) return;

    const nextS = STORY[next];
    if (nextS?.type === "photo" && nextS.flyTo) {
      const photo = allPhotos[nextS.photoIndex];
      if (photo && mapRef.current) {
        mapRef.current.flyTo({ center: [photo.lng, photo.lat], zoom: 13, duration: 1500, essential: true });
      }
    }
    if (nextS?.type === "flash") {
      runFlashMontage(() => {});
      return;
    }
    setStepIndex(next);
  }, [stepIndex]);

  // Flash montage — rapidly show all remaining photos then show final message
  const runFlashMontage = useCallback((onDone: () => void) => {
    setFlashActive(true);
    const srcs = allPhotos.map((p) => p.src);
    let i = 0;
    const interval = setInterval(() => {
      setFlashImages([srcs[i % srcs.length]]);
      i++;
      if (i >= srcs.length * 2) {
        clearInterval(interval);
        setFlashActive(false);
        setFlashImages([]);
        setFinalMessage(true);
      }
    }, 120);
  }, []);

  // No photos guard
  if (allPhotos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#FAF7F2" }}>
        <div className="text-center px-6">
          <p className="text-4xl mb-4">📍</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">No photos with locations yet</h1>
          <a href="/setup" className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm font-bold text-white">Open Setup Tool</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: "#FAF7F2" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Title Card — before starting */}
      <AnimatePresence>
        {!started && mapReady && (
          <motion.div
            key="title"
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "radial-gradient(120% 80% at 50% 40%, rgba(14,10,8,0.2) 0%, rgba(14,10,8,0.85) 100%)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            <div className="flex flex-col items-center gap-1 text-center px-6">
              <motion.p style={{ fontFamily: "Caveat, cursive", color: "rgba(250,247,242,0.7)", fontSize: "18px" }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}>
                dla Darii Krejzolki
              </motion.p>
              <motion.h1 style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(40px, 8vw, 80px)", lineHeight: 1.1, textShadow: "0 4px 28px rgba(0,0,0,0.55)" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.6 } }}>
                {GIFT_TITLE}
              </motion.h1>
              <motion.div className="h-0.5 w-48" style={{ background: "linear-gradient(90deg, rgba(199,111,74,0) 0%, #C76F4A 50%, rgba(199,111,74,0) 100%)" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1, transition: { delay: 0.9, duration: 0.5 } }} />
              <motion.p style={{ fontFamily: "Caveat, cursive", color: "rgba(250,247,242,0.85)", fontSize: "clamp(20px, 3vw, 28px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.1 } }}>
              </motion.p>
              <BirthdayCountdown triggerShoot={shootTriggered} />
              {!shootTriggered && (
                <motion.button onClick={startJourney} className="mt-4 rounded-full px-8 py-3 text-sm font-bold text-white shadow-lg" style={{ background: "#C76F4A" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 1.4 } }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  Wyrusz na przygodę
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Roulette */}
      <AnimatePresence>
        {rouletteDate && (
          <motion.div key="roulette" className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(14,10,8,0.6)", backdropFilter: "blur(6px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <p style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(32px, 6vw, 56px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>{rouletteDate}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro text overlay */}
      <AnimatePresence>
        {introText && (
          <motion.div key="intro-text" className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(14,10,8,0.6)", backdropFilter: "blur(6px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <p className="text-center px-8" style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(28px, 5vw, 44px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>{introText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Steps */}
      <AnimatePresence mode="wait">
        {started && !rouletteDate && !introText && currentStep && !flashActive && !finalMessage && stepIndex >= 0 && (
          <>
            {currentStep.type === "text" && (
              <motion.div
                key={`text-${stepIndex}`}
                className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(14,10,8,0.6)", backdropFilter: "blur(6px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                onClick={nextStep}
              >
                <motion.p
                  className="text-center px-8 whitespace-pre-line"
                  style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(26px, 5vw, 44px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)", lineHeight: 1.4 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                >
                  {currentStep.text}
                </motion.p>
                {/* Auto-advance for timed text steps */}
                <AutoAdvance duration={currentStep.duration} onDone={nextStep} />
              </motion.div>
            )}

            {currentStep.type === "photo" && (
              <motion.div
                key={`photo-${stepIndex}`}
                className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                onClick={nextStep}
              >
                <div className="absolute inset-0" style={{ background: "rgba(14,10,8,0.35)", backdropFilter: "blur(2px)" }} />
                <motion.div
                  className="relative z-10 flex flex-col items-center gap-0"
                  initial={{ opacity: 0, y: 60, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20, stiffness: 200 } }}
                >
                  <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ maxWidth: "min(82vw, 540px)", maxHeight: "min(45vh, 400px)" }}>
                    <img
                      src={withBase(allPhotos[currentStep.photoIndex]?.src)}
                      alt={currentStep.caption}
                      className="h-full w-full object-cover"
                      style={{ maxHeight: "min(45vh, 400px)" }}
                    />
                  </div>
                  {/* Location, caption, date — under image */}
                  {allPhotos[currentStep.photoIndex] && (
                    <p className="text-center" style={{ fontFamily: "Caveat, cursive", fontSize: "26px", color: "#FAF7F2", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                      {allPhotos[currentStep.photoIndex].city}, {allPhotos[currentStep.photoIndex].country}
                    </p>
                  )}
                  {currentStep.caption && (
                    <p className="text-center" style={{ fontFamily: "Caveat, cursive", fontSize: "22px", color: "rgba(250,247,242,0.8)" }}>
                      {currentStep.caption}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Flash Montage */}
      {flashActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: flashImages[0] === "__flash__" ? "#fff" : "rgba(14,10,8,0.5)", backdropFilter: "blur(2px)" }}>
          {flashImages[0] && flashImages[0] !== "__flash__" && (
            <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ maxWidth: "min(82vw, 540px)", maxHeight: "52vh" }}>
              <img src={withBase(flashImages[0])} className="h-full w-full object-cover" style={{ maxHeight: "52vh" }} alt="" />
            </div>
          )}
        </div>
      )}

      {/* Final Message */}
      <AnimatePresence>
        {finalMessage && (
          <motion.div
            key="final"
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(14,10,8,0.7)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6 } }}
          >
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(36px, 7vw, 64px)", textShadow: "0 4px 28px rgba(0,0,0,0.55)", lineHeight: 1.2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.6 } }}
              >
                Wszystkiego Najlepszego Krejzolko,
              </motion.p>
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "rgba(250,247,242,0.85)", fontSize: "clamp(24px, 4vw, 40px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.2 } }}
              >
                nie zmieniaj się!
              </motion.p>
              <motion.div
                className="h-0.5 w-48 mt-2"
                style={{ background: "linear-gradient(90deg, rgba(199,111,74,0) 0%, #C76F4A 50%, rgba(199,111,74,0) 100%)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, transition: { delay: 1.8, duration: 0.5 } }}
              />
              {giftStep === "none" && (
                <motion.button
                  onClick={() => setGiftStep("buttons")}
                  className="mt-6 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg"
                  style={{ background: "#C76F4A" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 2.5 } }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Pokaż w końcu ten prezent...
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift reveal — two prezent buttons */}
      <AnimatePresence>
        {giftStep === "buttons" && (
          <motion.div
            key="gift-buttons"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "rgba(14,10,8,0.85)", backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-6 px-6">
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(28px, 5vw, 44px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
              >
                Który najpierw?
              </motion.p>
              <div className="flex gap-4 flex-wrap justify-center">
                <motion.button
                  onClick={() => setGiftStep("remont-text")}
                  className="rounded-full px-8 py-3 text-base font-bold text-white shadow-lg"
                  style={{ background: "#C76F4A" }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎁 Prezent 1
                </motion.button>
                <motion.button
                  onClick={() => setGiftStep("nie-tak-szybko")}
                  className="rounded-full px-8 py-3 text-base font-bold text-white shadow-lg"
                  style={{ background: "rgba(74,66,56,0.8)" }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: 0.5 } }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎁 Prezent 2
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {giftStep === "nie-tak-szybko" && (
          <motion.div
            key="nie-tak-szybko"
            className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(14,10,8,0.85)", backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0 }}
            onClick={() => setGiftStep("buttons")}
          >
            <div className="text-center px-6">
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(32px, 6vw, 56px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)", lineHeight: 1.3 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
              >
                Nie tak szybko!{"\n"}
                Najpierw pierwszy! 😂
              </motion.p>
              <AutoAdvance duration={3000} onDone={() => setGiftStep("buttons")} />
            </div>
          </motion.div>
        )}

        {giftStep === "remont-text" && (
          <motion.div
            key="remont-text"
            className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(14,10,8,0.85)", backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0 }}
            onClick={() => setGiftStep("prezent1")}
          >
            <div className="text-center px-6">
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(28px, 5vw, 44px)", textShadow: "0 4px 20px rgba(0,0,0,0.5)", lineHeight: 1.4 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
              >
                Remont się skończył...{"\n"}
                Ale zawsze jest dobry czas...{"\n"}
                By pobawić się farbą! 🎨
              </motion.p>
              <AutoAdvance duration={4500} onDone={() => setGiftStep("prezent1")} />
            </div>
          </motion.div>
        )}

        {giftStep === "prezent1" && (
          <motion.div
            key="prezent1"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "rgba(14,10,8,0.92)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6 } }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4 px-4 w-full" style={{ maxWidth: "min(90vw, 800px)" }}>
              <motion.div
                className="overflow-hidden rounded-2xl shadow-2xl bg-white"
                style={{ width: "100%", height: "min(70vh, 700px)" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { type: "spring", damping: 20, stiffness: 150 } }}
              >
                <iframe
                  src={withBase("/Prezent_1.pdf")}
                  className="w-full h-full border-0"
                  title="Prezent 1"
                />
              </motion.div>
              <motion.button
                onClick={() => setGiftStep("prezent2-tease")}
                className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg"
                style={{ background: "#C76F4A" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Jest jeszcze drugi prezent!
              </motion.button>
            </div>
          </motion.div>
        )}

        {giftStep === "prezent2-tease" && (
          <motion.div
            key="prezent2-tease"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "rgba(14,10,8,0.9)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6 } }}
          >
            <div className="text-center px-6 flex flex-col items-center gap-3">
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "rgba(250,247,242,0.7)", fontSize: "clamp(20px, 3vw, 28px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
              >
                Część druga nastąpi...
              </motion.p>
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "#FAF7F2", fontSize: "clamp(40px, 8vw, 72px)", textShadow: "0 4px 28px rgba(0,0,0,0.55)" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.6, type: "spring", damping: 15 } }}
              >
                30 / 05 / 2026
              </motion.p>
              <motion.div
                className="h-0.5 w-48"
                style={{ background: "linear-gradient(90deg, rgba(199,111,74,0) 0%, #C76F4A 50%, rgba(199,111,74,0) 100%)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, transition: { delay: 1.2, duration: 0.5 } }}
              />
              <motion.p
                style={{ fontFamily: "Caveat, cursive", color: "rgba(250,247,242,0.6)", fontSize: "clamp(18px, 2.5vw, 24px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.5 } }}
              >
                Stay tuned ✨
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap hint */}
      {started && !rouletteDate && !introText && currentStep && !flashActive && !finalMessage && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <p className="text-xs" style={{ color: "rgba(250,247,242,0.4)" }}></p>
        </div>
      )}
    </div>
  );
}
