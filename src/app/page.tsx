"use client";
import "regenerator-runtime/runtime";
import { useState, useEffect } from "react";
import { useGurbaniProjector } from "@/hooks/useGurbaniProjector";
import { LotusBackground, StatusIndicator, HomePlaceholder } from "@/components/GurbaniLayout";
import { ShabadDisplay } from "@/components/ShabadDisplay";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const {
    result,
    errorMessage,
    listening,
    transcript,
    lastSearch,
    activeLineRef,
    startListening,
    stopListening,
    browserSupportsSpeechRecognition
  } = useGurbaniProjector();

  // Handle mounting to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard Controls
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        listening ? stopListening() : startListening();
      }
      if (e.code === "KeyF") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, listening, startListening, stopListening]);

  // Handle Auto-Scroll
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [result?.match?.id, activeLineRef]);

  if (!mounted) return (
    <div className="h-screen bg-[#fffafa] flex flex-col items-center justify-center">
      <div className="animate-pulse text-[#d42c5c]/20 text-4xl">ੴ</div>
    </div>
  );

  return (
    <div className="h-screen bg-[#fffafa] text-[#2d0a0a] flex flex-col relative select-none overflow-hidden font-sans">
      <LotusBackground />
      <StatusIndicator listening={listening} errorMessage={errorMessage} />

      {result?.shabad ? (
        <ShabadDisplay
          shabad={result.shabad}
          matchId={result.match?.id}
          activeLineRef={activeLineRef}
        />
      ) : (
        <HomePlaceholder />
      )}

      {/* Footer Controls */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 z-50 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 bg-linear-to-t from-[#fffafa] via-[#fffafa]/90 to-transparent">
        <div className="text-center md:text-left">
          {result?.shabad && (
            <div className="animate-in fade-in duration-1000">
              <h2 className="text-[#d42c5c] text-xl font-bold tracking-widest uppercase">{result.shabad.bani}</h2>
              <p className="text-black/10 text-[10px] tracking-widest mt-2 uppercase font-medium">Gurbani Projection Enabled</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          {listening && (lastSearch || transcript) && (
            <div className="bg-black/5 backdrop-blur-md px-6 py-2 rounded-full border border-black/5 animate-pulse max-w-[90vw] transition-all">
              <p className="text-[#d42c5c] text-[10px] font-black tracking-[0.3em] uppercase mb-1 opacity-40">
                {lastSearch ? "Matching" : "Listening"}
              </p>
              <p className="text-[#2d0a0a] text-xl font-bold tracking-wide truncate" style={{ fontFamily: "'Noto Serif Gurmukhi', serif" }}>
                {transcript.split(" ").slice(-1)[0] || ""}
              </p>
            </div>
          )}
          {!listening && (
            <button
              onClick={startListening}
              className="bg-[#d42c5c] text-white font-bold text-[11px] tracking-[0.4em] uppercase py-5 px-14 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto cursor-pointer"
            >
              INITIALIZE SYSTEM
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
