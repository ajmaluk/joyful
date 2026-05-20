import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceInputStatus = 'idle' | 'recording' | 'processing';

interface UseVoiceInputOptions {
  onTranscript: (transcript: string) => void;
  language?: string;
  minimumProcessingMs?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionConstructor() {
  const browserWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function getSpeechRecognitionErrorMessage(error?: string) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow it in your browser settings and try again.';
    case 'no-speech':
      return 'No speech was detected. Try again and speak a little more clearly.';
    case 'audio-capture':
      return 'No microphone was found. Check your audio input and try again.';
    default:
      return 'Voice input could not be started right now.';
  }
}

export function mergeVoiceTranscript(currentValue: string, transcript: string) {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) return currentValue;

  const trimmedCurrent = currentValue.trim();
  if (!trimmedCurrent) return trimmedTranscript;

  return `${trimmedCurrent} ${trimmedTranscript}`;
}

export function useVoiceInput({ onTranscript, language = 'en-US', minimumProcessingMs = 500 }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const statusRef = useRef<VoiceInputStatus>('idle');
  const transcriptRef = useRef('');
  const processingStartedAtRef = useRef(0);
  const finalizeTimerRef = useRef<number | null>(null);

  const updateStatus = useCallback((nextStatus: VoiceInputStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const clearFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current !== null) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }, []);

  const finalizeRecognition = useCallback(() => {
    clearFinalizeTimer();
    const transcript = transcriptRef.current.trim();

    if (transcript) {
      onTranscript(transcript);
    }

    transcriptRef.current = '';
    recognitionRef.current = null;
    updateStatus('idle');
  }, [clearFinalizeTimer, onTranscript]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      clearFinalizeTimer();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [clearFinalizeTimer]);

  const scheduleFinalize = useCallback(() => {
    clearFinalizeTimer();
    const elapsed = Date.now() - processingStartedAtRef.current;
    const delay = Math.max(minimumProcessingMs - elapsed, 0);
    finalizeTimerRef.current = window.setTimeout(finalizeRecognition, delay);
  }, [clearFinalizeTimer, finalizeRecognition, minimumProcessingMs]);

  const stopRecording = useCallback(() => {
    if (statusRef.current !== 'recording') return;

    updateStatus('processing');
    processingStartedAtRef.current = Date.now();
    scheduleFinalize();

    try {
      recognitionRef.current?.stop();
    } catch {
      finalizeRecognition();
    }
  }, [finalizeRecognition, scheduleFinalize, updateStatus]);

  const startRecording = useCallback(() => {
    if (!isSupported || statusRef.current !== 'idle') return false;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setIsSupported(false);
      return false;
    }

    clearFinalizeTimer();
    transcriptRef.current = '';

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      updateStatus('recording');
    };

    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        const finalTranscript = result[0]?.transcript ?? '';
        if (finalTranscript) {
          transcriptRef.current = mergeVoiceTranscript(transcriptRef.current, finalTranscript);
        }
      }
    };

    recognition.onerror = (event) => {
      clearFinalizeTimer();
      transcriptRef.current = '';
      recognitionRef.current = null;
      updateStatus('idle');

      // Reuse the same processing path for browser and permission failures.
      if (event.error) {
        console.error(getSpeechRecognitionErrorMessage(event.error));
      }
    };

    recognition.onend = () => {
      if (statusRef.current === 'recording' && recognitionRef.current === recognition) {
        updateStatus('processing');
        processingStartedAtRef.current = Date.now();
      }

      scheduleFinalize();
    };

    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      updateStatus('idle');
      return false;
    }
  }, [clearFinalizeTimer, isSupported, language, scheduleFinalize, updateStatus]);

  const toggleRecording = useCallback(() => {
    if (statusRef.current === 'recording') {
      stopRecording();
      return true;
    }

    return startRecording();
  }, [startRecording, stopRecording]);

  const stopAndProcess = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  return {
    status,
    isSupported,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    toggleRecording,
    stopAndProcess,
    startRecording,
    clearFinalizeTimer,
  };
}