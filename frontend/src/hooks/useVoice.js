import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for Speech-to-Text using native browser SpeechRecognition API
 */
export function useSpeechRecognition({ onResult, lang = 'en-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.lang = lang;

    recognizer.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimTranscript('');
    };

    recognizer.onresult = (event) => {
      let liveInterim = '';
      let accumulatedFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcriptSegment = item[0].transcript;

        if (item.isFinal) {
          accumulatedFinal += transcriptSegment;
        } else {
          liveInterim += transcriptSegment;
        }
      }

      setInterimTranscript(liveInterim);

      if (accumulatedFinal && onResult) {
        onResult(accumulatedFinal.trim());
      }
    };

    recognizer.onerror = (event) => {
      let message = 'Voice recognition error.';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          message = 'Microphone access blocked. Please allow microphone permissions in browser settings.';
          break;
        case 'no-speech':
          message = 'No speech detected. Please speak closer to the microphone.';
          break;
        case 'audio-capture':
          message = 'No microphone detected or microphone is in use by another app.';
          break;
        case 'network':
          message = 'Network error connecting to voice service.';
          break;
        case 'aborted':
          return;
        default:
          message = `Voice error: ${event.error}`;
      }
      setError(message);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognizer.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognizer;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [lang, onResult]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available on this browser.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    } else {
      setError(null);
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Handle rapid toggle restart
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 150);
        } catch {
          setError('Could not start microphone. Please try again.');
        }
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, [isListening]);

  return {
    isListening,
    interimTranscript,
    error,
    setError,
    toggleListening,
    stopListening,
    isSupported: typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
}

/**
 * Hook for Text-to-Speech using native browser SpeechSynthesis API
 */
export function useTextToSpeech() {
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text, { rate = 1.0, pitch = 1.0, lang = 'en-IN' } = {}) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setError('Text-to-speech is not supported in this browser.');
        return;
      }

      window.speechSynthesis.cancel();

      if (!text || !text.trim()) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = lang;

      if (voices.length > 0) {
        const preferredVoice = voices.find(
          (v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0]) || v.default
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          setError(`Speech playback error: ${e.error}`);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [voices]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    voices,
    isSpeaking,
    error,
    speak,
    stop,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
