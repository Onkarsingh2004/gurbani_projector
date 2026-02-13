import { useState, useEffect, useRef, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { cleanTranscript, isProbableNoise, attemptLocalMatch, getAcronym } from "@/util/gurbani";

// 🕉️ WAHEGURU FALLBACK MODE
const WAHEGURU_RESULT = {
    match: { id: "waheguru" },
    shabad: {
        id: -1,
        bani: "Simran",
        lines: [{
            id: "waheguru",
            gurmukhi: "ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ ਵਾਹਿਗੁਰੂ",
            translation: "Waheguru Waheguru Waheguru Waheguru",
            transliteration: "Waheguru Waheguru Waheguru Waheguru",
            transliteration_hi: "वाहेगुरु वाहेगुरु वाहेगुरु वाहेगुरु"
        }]
    }
};

export const useGurbaniProjector = () => {
    const [result, setResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [lastSearch, setLastSearch] = useState("");
    const activeLineRef = useRef<HTMLDivElement>(null);
    const wakeLockRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const previousTranscriptRef = useRef("");
    const abortControllerRef = useRef<AbortController | null>(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // Reset tracking when listening stops
    useEffect(() => {
        if (!listening) {
            previousTranscriptRef.current = "";
            setLastSearch("");
        }
    }, [listening]);

    const searchLine = useCallback(async (spokenText: string, fullTranscriptAtTime: string) => {
        let fullText = cleanTranscript(spokenText);

        // Show full line as search indicator
        setLastSearch(fullText);

        // 1. Try local match (Text based)
        if (result?.shabad) {
            const matchData = attemptLocalMatch(spokenText, result);
            if (matchData) {
                setResult((prev: any) => ({ ...prev, match: matchData.line, confidence: matchData.confidence }));
                previousTranscriptRef.current = fullTranscriptAtTime;
                return;
            }
        }

        // 2. Global Search using Full Text
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: fullText, // Send full text to the API
                    isAcronym: false
                }),
                signal: abortControllerRef.current.signal
            });

            if (res.ok) {
                const data = await res.json();
                if (data.match) {
                    setResult(data);
                    setErrorMessage("");
                    previousTranscriptRef.current = fullTranscriptAtTime;
                } else {
                    // Don't set error if it's just a partial word being accumulated
                    if (spokenText.split(" ").length > 2) {
                        setErrorMessage("No Match Found");
                        setResult(WAHEGURU_RESULT); // �️ Show Waheguru instead of clearing
                        setLastSearch(""); // Clear text from display
                        // 🛑 Erase the failed line so we can detect the next line freshly
                        previousTranscriptRef.current = fullTranscriptAtTime;
                    }
                }
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') console.error("Search failed", e);
        }
    }, [result]);

    // Handle incoming transcript with auto-trigger
    useEffect(() => {
        if (transcript) {
            console.log("🎤 Raw Transcript:", transcript);
        }

        if (transcript && transcript !== previousTranscriptRef.current) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // Accumulate speech
            const currentUnmatchedSpeech = transcript.startsWith(previousTranscriptRef.current)
                ? transcript.slice(previousTranscriptRef.current.length).trim()
                : transcript.trim();

            console.log("🗣️ Unmatched Speech:", currentUnmatchedSpeech);

            if (!currentUnmatchedSpeech) return;

            if (isProbableNoise(currentUnmatchedSpeech)) {
                console.log("⚠️ Ignored as Noise:", currentUnmatchedSpeech);
                return;
            }


            // 📺 LIVE ACOUSTIC FEEDBACK: Show words being formed
            if (currentUnmatchedSpeech) {
                console.log("✅ LIVE UPDATE:", currentUnmatchedSpeech);
                setLastSearch(currentUnmatchedSpeech);
                // Update debug element directly for minimal latency
                const debugEl = document.getElementById('debug-live-text');
                if (debugEl) debugEl.innerText = currentUnmatchedSpeech;
            } else {
                const debugEl = document.getElementById('debug-live-text');
                if (debugEl) debugEl.innerText = "...";
            }

            // 🕒 Wait for a full line pause (2.0s)
            silenceTimerRef.current = setTimeout(() => {
                const words = currentUnmatchedSpeech.trim().split(/\s+/);

                // Only search if we have a significant phrase (usually 2+ words)
                // or if it's a long single word that's likely a complete short verse.
                if (words.length >= 2 || (words.length === 1 && words[0].length > 2)) {
                    console.log("Full line pause detected. Searching for:", currentUnmatchedSpeech);
                    searchLine(currentUnmatchedSpeech, transcript);
                }
            }, 1500); // ⚡ Optimized for Fast Kirtan (1.5s pause)

            // 🚀 FAST MODE: If line is long (> 10 words), search immediately!
            const words = currentUnmatchedSpeech.trim().split(/\s+/);
            if (words.length > 10) {
                console.log("🚀 Long line detected (Fast Mode). Searching immediately...");
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                searchLine(currentUnmatchedSpeech, transcript);
            }
        }
    }, [transcript, searchLine]);

    const startListening = useCallback(() => {
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            setErrorMessage("HTTPS Required for Mic");
            return;
        }

        if (!browserSupportsSpeechRecognition) {
            setErrorMessage("Browser Not Supported");
            return;
        }

        try {
            SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
            if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
                (navigator as any).wakeLock.request('screen').then((wl: any) => wakeLockRef.current = wl).catch(() => { });
            }
            setErrorMessage("");
        } catch (e: any) {
            console.error("Speech Recognition Error:", e);
            setErrorMessage("Mic Initialization Failed");
        }
    }, [browserSupportsSpeechRecognition]);

    const stopListening = useCallback(() => {
        SpeechRecognition.stopListening();
        resetTranscript();
        previousTranscriptRef.current = "";
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, [resetTranscript]);

    return {
        result,
        setResult,
        errorMessage,
        listening,
        transcript,
        lastSearch,
        activeLineRef,
        startListening,
        stopListening,
        browserSupportsSpeechRecognition
    };
};
