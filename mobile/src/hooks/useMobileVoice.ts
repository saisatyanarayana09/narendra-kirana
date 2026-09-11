import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import * as IntentLauncher from 'expo-intent-launcher';

interface UseMobileVoiceOptions {
  onResult?: (text: string) => void;
  language?: string;
}

export function useMobileVoice({ onResult, language = 'en-IN' }: UseMobileVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognizerRef.current) {
        try {
          recognizerRef.current.abort ? recognizerRef.current.abort() : recognizerRef.current.stop();
        } catch {
          // Ignore
        }
        recognizerRef.current = null;
      }
      try {
        Speech.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  const stopListening = useCallback(async () => {
    // Web Speech API cleanup
    if (recognizerRef.current) {
      try {
        recognizerRef.current.abort ? recognizerRef.current.abort() : recognizerRef.current.stop();
      } catch {
        // Ignore
      }
      recognizerRef.current = null;
    }

    if (isMountedRef.current) {
      setIsListening(false);
      setInterimText('');
    }
  }, []);

  // Start Voice Recognition
  const startListening = useCallback(async () => {
    try {
      Speech.stop();
    } catch {
      // Ignore
    }

    // 1. Android Platform: Native Google SpeechRecognizer Intent (built into all Android devices, 0 native crashes)
    if (Platform.OS === 'android') {
      try {
        setError(null);
        setIsListening(true);
        setInterimText('Listening... Speak grocery item');

        const intentLanguage = language?.toLowerCase().includes('te')
          ? 'te-IN'
          : language?.toLowerCase().includes('hi')
          ? 'hi-IN'
          : 'en-IN';

        const result = await IntentLauncher.startActivityAsync(
          'android.speech.action.RECOGNIZE_SPEECH',
          {
            extra: {
              'android.speech.extra.LANGUAGE_MODEL': 'free_form',
              'android.speech.extra.LANGUAGE': intentLanguage,
              'android.speech.extra.PROMPT': 'Say grocery item (e.g. Milk, Rice, Atta)...',
              'android.speech.extra.MAX_RESULTS': 1,
            },
          }
        );

        if (isMountedRef.current) {
          setIsListening(false);
        }

        if (result.resultCode === IntentLauncher.ResultCode.Success) {
          const extraObj = (result.extra || {}) as any;
          const matches =
            extraObj['android.speech.extra.RESULTS'] ||
            extraObj['results'] ||
            [];

          let spokenText = '';
          if (Array.isArray(matches) && matches.length > 0) {
            spokenText = String(matches[0] || '').trim();
          } else if (typeof matches === 'string') {
            spokenText = matches.trim();
          }

          if (spokenText && isMountedRef.current) {
            setInterimText(spokenText);
            if (onResultRef.current) {
              onResultRef.current(spokenText);
            }
          } else if (isMountedRef.current) {
            setInterimText('');
          }
        } else {
          // User canceled or pressed back
          if (isMountedRef.current) {
            setInterimText('');
          }
        }
        return;
      } catch (err: any) {
        if (isMountedRef.current) {
          setIsListening(false);
          setInterimText('');
        }
        console.warn('[useMobileVoice] Android speech recognition intent unavailable:', err);
        Alert.alert(
          'Voice Search',
          'Voice input was canceled or speech recognition is not enabled on this device. Please type your search.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // 2. Web Platform: Native Web Speech API
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Voice recognition is not supported in this browser.');
        Alert.alert(
          'Voice Search Unsupported',
          'Voice recognition is not supported in this browser. Please use Google Chrome or Safari, or type your query.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        if (recognizerRef.current) {
          try {
            recognizerRef.current.abort ? recognizerRef.current.abort() : recognizerRef.current.stop();
          } catch {
            // Ignore
          }
        }

        const recognizer = new SpeechRecognition();
        recognizerRef.current = recognizer;
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = language;

        setError(null);
        setIsListening(true);
        setInterimText('Listening for grocery item...');

        recognizer.onresult = (event: any) => {
          if (!isMountedRef.current) return;
          const result = event.results?.[0]?.[0]?.transcript || '';
          setInterimText(result);
          if (event.results?.[0]?.isFinal) {
            setIsListening(false);
            if (onResultRef.current) {
              onResultRef.current(result);
            }
          }
        };

        recognizer.onerror = (event: any) => {
          if (!isMountedRef.current) return;
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          setInterimText('');
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`);
          }
        };

        recognizer.onend = () => {
          if (!isMountedRef.current) return;
          setIsListening(false);
          recognizerRef.current = null;
        };

        recognizer.start();
        return;
      } catch (err: any) {
        console.error('Failed to start web speech recognition:', err);
        setError('Could not initialize microphone.');
        setIsListening(false);
        setInterimText('');
        return;
      }
    }

    // Other platforms (iOS without native speech module)
    Alert.alert(
      'Voice Search',
      'Please use your keyboard microphone to dictate your search.',
      [{ text: 'OK' }]
    );
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Text-to-Speech (TTS) via expo-speech
  const speak = useCallback(
    (textToSpeak: string, options: { rate?: number; pitch?: number } = {}) => {
      if (!textToSpeak || !textToSpeak.trim()) return;

      try {
        Speech.stop();
        setIsSpeaking(true);

        Speech.speak(textToSpeak, {
          language: language,
          pitch: options.pitch || 1.0,
          rate: options.rate || 0.9,
          onDone: () => {
            if (isMountedRef.current) setIsSpeaking(false);
          },
          onError: () => {
            if (isMountedRef.current) setIsSpeaking(false);
          },
          onStopped: () => {
            if (isMountedRef.current) setIsSpeaking(false);
          },
        });
      } catch (err) {
        console.error('Speech synthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [language]
  );

  const stopSpeaking = useCallback(() => {
    try {
      Speech.stop();
      setIsSpeaking(false);
    } catch {
      // Ignore
    }
  }, []);

  return {
    isListening,
    interimText,
    isSpeaking,
    error,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
