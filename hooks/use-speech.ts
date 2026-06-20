"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pickVoiceForProfile,
  type VoiceDeliveryProfile,
} from "@/lib/voice/profile";
import { chunkTextForSpeech, phraseRate } from "@/lib/voice/delivery";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (
    (w.SpeechRecognition as new () => SpeechRecognitionLike) ||
    (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) ||
    null
  );
}

type UseSpeechToTextOpts = {
  onFinalTranscript?: (text: string) => void;
  autoSend?: boolean;
};

const RETRYABLE_ERRORS = new Set(["network", "no-speech", "aborted"]);

function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked — allow mic access in your browser settings.";
    case "audio-capture":
      return "No microphone found — check your input device.";
    case "network":
    case "no-speech":
    case "aborted":
      return null;
    default:
      return "Voice input hit a snag — tap the mic to try again.";
  }
}

async function ensureMicPermission(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch {
    return "Microphone blocked — allow mic access in your browser settings.";
  }
}

export function useSpeechToText(
  onTranscript?: (text: string) => void,
  opts?: UseSpeechToTextOpts,
) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalBufferRef = useRef("");
  const interimRef = useRef("");
  const wantsListeningRef = useRef(false);
  const manualStopRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const networkRetriesRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const optsRef = useRef(opts);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    optsRef.current = opts;
  }, [onTranscript, opts]);

  const supported = getRecognitionConstructor() !== null;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const combinedTranscript = useCallback(() => {
    return (finalBufferRef.current + interimRef.current).trim();
  }, []);

  const finishListening = useCallback(
    (text: string) => {
      clearRestartTimer();
      const wasManualStop = manualStopRef.current;
      wantsListeningRef.current = false;
      manualStopRef.current = false;
      networkRetriesRef.current = 0;
      setListening(false);
      setInterim("");
      interimRef.current = "";
      finalBufferRef.current = "";

      if (text) {
        onTranscriptRef.current?.(text);
        if (optsRef.current?.autoSend && optsRef.current?.onFinalTranscript) {
          optsRef.current.onFinalTranscript(text);
        }
        return;
      }

      if (wasManualStop) {
        setError("No speech detected — tap the mic and speak, then tap Done.");
      }
    },
    [clearRestartTimer],
  );

  const scheduleRestart = useCallback(
    (delayMs = 180) => {
      if (!wantsListeningRef.current || manualStopRef.current) return;
      clearRestartTimer();
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!wantsListeningRef.current || manualStopRef.current) return;
        const recognition = recognitionRef.current;
        if (!recognition) return;
        try {
          recognition.start();
        } catch {
          scheduleRestart(350);
        }
      }, delayMs);
    },
    [clearRestartTimer],
  );

  const recreateRecognition = useCallback(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor) return null;

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    return recognition;
  }, []);

  const bindRecognition = useCallback(
    (recognition: SpeechRecognitionLike) => {
      recognition.onresult = (e) => {
        networkRetriesRef.current = 0;
        setError(null);
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          const chunk = result[0].transcript;
          if (result.isFinal) {
            finalBufferRef.current += chunk;
            interimRef.current = "";
          } else {
            interimText += chunk;
          }
        }
        interimRef.current = interimText;
        setInterim(interimText);
      };

      recognition.onend = () => {
        if (wantsListeningRef.current && !manualStopRef.current) {
          scheduleRestart();
          return;
        }
        finishListening(combinedTranscript());
      };

      recognition.onerror = (e) => {
        const code = e.error ?? "";

        if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
          wantsListeningRef.current = false;
          manualStopRef.current = false;
          clearRestartTimer();
          setListening(false);
          setInterim("");
          interimRef.current = "";
          setError(errorMessage(code));
          return;
        }

        if (RETRYABLE_ERRORS.has(code) && wantsListeningRef.current && !manualStopRef.current) {
          if (code === "network") {
            networkRetriesRef.current += 1;
            if (networkRetriesRef.current > 8) {
              wantsListeningRef.current = false;
              setListening(false);
              setError("Voice connection unstable — type your reply or try the mic again.");
              return;
            }
            if (networkRetriesRef.current % 3 === 0) {
              const fresh = recreateRecognition();
              if (fresh) bindRecognition(fresh);
            }
          }
          scheduleRestart(code === "network" ? 500 : 180);
          return;
        }

        if (!wantsListeningRef.current) return;

        const message = errorMessage(code);
        if (!message) return;

        wantsListeningRef.current = false;
        manualStopRef.current = false;
        clearRestartTimer();
        setListening(false);
        setInterim("");
        interimRef.current = "";
        setError(message);
      };
    },
    [clearRestartTimer, combinedTranscript, finishListening, recreateRecognition, scheduleRestart],
  );

  useEffect(() => {
    const recognition = recreateRecognition();
    if (!recognition) return;
    bindRecognition(recognition);

    return () => {
      wantsListeningRef.current = false;
      manualStopRef.current = true;
      clearRestartTimer();
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [bindRecognition, clearRestartTimer, recreateRecognition]);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !wantsListeningRef.current) return;

    try {
      recognition.start();
    } catch {
      scheduleRestart(300);
    }
  }, [scheduleRestart]);

  const start = useCallback(async () => {
    if (!recognitionRef.current || wantsListeningRef.current || requesting) return;

    setError(null);
    setRequesting(true);
    finalBufferRef.current = "";
    interimRef.current = "";
    setInterim("");
    networkRetriesRef.current = 0;

    const permissionError = await ensureMicPermission();
    if (permissionError) {
      setError(permissionError);
      setRequesting(false);
      return;
    }

    wantsListeningRef.current = true;
    manualStopRef.current = false;
    setListening(true);
    setRequesting(false);
    startRecognition();
  }, [requesting, startRecognition]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    manualStopRef.current = true;
    wantsListeningRef.current = false;
    clearRestartTimer();
    try {
      recognitionRef.current.stop();
    } catch {
      finishListening(combinedTranscript());
    }
  }, [clearRestartTimer, combinedTranscript, finishListening]);

  const clearError = useCallback(() => setError(null), []);

  return {
    supported,
    listening: listening || requesting,
    interim,
    error,
    start,
    stop,
    clearError,
  };
}

const DEFAULT_PROFILE: VoiceDeliveryProfile = {
  rate: 0.98,
  pitch: 1,
  volume: 1,
  label: "Natural & conversational",
  voiceHints: ["Natural", "Premium", "Neural", "Samantha", "Karen"],
};

export function useTextToSpeech(deliveryProfile?: VoiceDeliveryProfile | null) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const profileRef = useRef(deliveryProfile ?? DEFAULT_PROFILE);
  const speakSessionRef = useRef(0);

  useEffect(() => {
    profileRef.current = deliveryProfile ?? DEFAULT_PROFILE;
  }, [deliveryProfile]);

  const loadVoice = useCallback(() => {
    if (!supported) return;
    const voices = window.speechSynthesis.getVoices();
    voiceRef.current = pickVoiceForProfile(voices, profileRef.current);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    loadVoice();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoice);
  }, [supported, loadVoice, deliveryProfile?.label]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();

      const chunks = chunkTextForSpeech(text);
      if (!chunks.length) return;

      const profile = profileRef.current;
      const session = ++speakSessionRef.current;

      const speakNext = (index: number) => {
        if (session !== speakSessionRef.current || index >= chunks.length) return;

        const utterance = new SpeechSynthesisUtterance(chunks[index]!);
        utterance.rate = phraseRate(profile.rate, index);
        utterance.pitch = profile.pitch;
        utterance.volume = profile.volume;
        if (voiceRef.current) utterance.voice = voiceRef.current;

        utterance.onend = () => {
          if (session !== speakSessionRef.current) return;
          const pauseMs = index < chunks.length - 1 ? 160 + (index % 2) * 40 : 0;
          window.setTimeout(() => speakNext(index + 1), pauseMs);
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext(0);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    speakSessionRef.current += 1;
    window.speechSynthesis.cancel();
  }, [supported]);

  return {
    supported,
    speak,
    cancel,
    profileLabel: deliveryProfile?.label ?? DEFAULT_PROFILE.label,
  };
}
