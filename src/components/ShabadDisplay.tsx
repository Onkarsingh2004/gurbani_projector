import React from 'react';

// Interface Update
interface Line {
    id: string;
    gurmukhi: string;
    translation: string;
    transliteration_hi?: string;
    transliteration: string;
}

interface ShabadDisplayProps {
    shabad: {
        lines: Line[];
        bani: string;
    };
    matchId: string;
    activeLineRef: React.RefObject<HTMLDivElement | null>;
}

export const ShabadDisplay = React.memo(({ shabad, matchId, activeLineRef }: ShabadDisplayProps) => (
    <main className="flex-1 overflow-y-auto px-6 md:px-12 space-y-12 md:space-y-24 py-[35vh] relative z-10 scroll-smooth">
        {shabad.lines.map((line: Line) => {
            const isActive = line.id === matchId;
            return (
                <div key={line.id} ref={isActive ? activeLineRef : null} className={`text-center transition-all duration-700 transform ${isActive ? "opacity-100 scale-105 py-12" : "opacity-20 scale-100 py-6"}`}>
                    <p className={`leading-tight transition-all duration-300 ${isActive ? "text-[#d42c5c] text-5xl md:text-8xl font-bold" : "text-[#2d0a0a] text-3xl md:text-6xl"}`} style={{ fontFamily: "'Noto Serif Gurmukhi', serif" }}>{line.gurmukhi}</p>
                    {isActive && (
                        <div className="mt-8 md:mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

                            {/* Hindi Transliteration (Script) - Replaces English Transliteration visually */}
                            {line.transliteration_hi && (
                                <p className="text-[#2d0a0a] text-4xl md:text-7xl font-bold max-w-6xl mx-auto leading-relaxed opacity-95">
                                    {line.transliteration_hi}
                                </p>
                            )}

                            {/* English Translation */}
                            <p className="text-[#2d0a0a]/80 text-2xl md:text-4xl font-medium max-w-6xl mx-auto leading-relaxed italic opacity-90">{line.translation}</p>

                            {/* English Transliteration (Small) */}
                            <p className="text-[#d42c5c]/40 text-sm md:text-xl tracking-widest uppercase mt-4">{line.transliteration}</p>
                        </div>
                    )}
                </div>
            );
        })}
    </main>
));

ShabadDisplay.displayName = 'ShabadDisplay';
