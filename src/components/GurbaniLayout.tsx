import React from 'react';

export const LotusBackground = () => (
    <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-10 pointer-events-none">
        <div className="w-[120vh] h-[120vh] animate-[spin_180s_linear_infinite]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 0 C60 20 80 40 100 50 C80 60 60 80 50 100 C40 80 20 60 0 50 C20 40 40 20 50 0 Z' fill='%23d42c5c' /%3E%3C/svg%3E")`,
            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(2px)'
        }}></div>
    </div>
);

export const StatusIndicator = ({ listening, errorMessage }: { listening: boolean, errorMessage: string }) => (
    <div className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${listening ? 'bg-[#d42c5c] shadow-[0_0_15px_#d42c5c]' : 'bg-black/10'}`}></div>
        <div className="flex flex-col">
            <span className="text-black/30 text-[10px] tracking-[0.4em] uppercase font-black">{listening ? 'LISTENING' : 'STANDBY'}</span>
            {listening && <span className="text-[#d42c5c]/50 text-[8px] tracking-widest font-bold uppercase mt-1">ENGLISH MODE (EN-IN)</span>}
            <span id="debug-live-text" className="text-black/20 text-[10px] uppercase font-mono mt-1 max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis"></span>
        </div>
        {errorMessage && <span className="text-red-600 text-[10px] font-bold uppercase border-l pl-4 border-black/10">{errorMessage}</span>}
    </div>
);

export const HomePlaceholder = () => (
    <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="space-y-8 transform translate-y-12 md:translate-y-24">
            <p className="text-[12rem] md:text-[28rem] text-[#d42c5c]/5 font-bold leading-none select-none">ੴ</p>
            <div className="space-y-2">
                <p className="text-3xl md:text-5xl text-black/10 font-light tracking-[0.5em] uppercase">Gurbani Projector</p>
                <p className="text-[#d42c5c]/30 text-lg italic tracking-widest">Voice-Sync System</p>
            </div>
        </div>
    </div>
);
