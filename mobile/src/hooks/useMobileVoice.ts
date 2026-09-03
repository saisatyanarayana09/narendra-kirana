import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Speech from 'expo-speech';

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

  // Request Android Runtime Permission for audio recording
  const checkOrRequestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Narendra Kirana needs microphone access so you can search products by voice.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const stopListening = useCallback(() => {
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

    // 1. Web Platform: Native Web Speech API
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

    // 2. Mobile Native Platform (Android / iOS)
    const hasPermission = await checkOrRequestPermission();
    if (!hasPermission) {
      setError('Microphone permission denied.');
      Alert.alert(
        'Permission Required',
        'Please enable microphone access in device settings to use voice search.'
      );
      return;
    }

    // Check if native voice bridge is installed, otherwise alert gracefully
    const NativeVoiceModule = (globalThis as any).Voice || (globalThis as any).ReactNativeVoice;
    if (NativeVoiceModule) {
      try {
        setError(null);
        setIsListening(true);
        setInterimText('Listening for grocery item...');
        await NativeVoiceModule.start(language);
        return;
      } catch (err: any) {
        console.error('Native voice error:', err);
        setIsListening(false);
        setInterimText('');
        setError('Voice service unavailable.');
      }
    } else {
      // Graceful feedback for native Expo managed environment
      setIsListening(false);
      setInterimText('');
      setError('Voice recognition is available on web browsers or with native voice service.');
      Alert.alert(
        'Voice Search',
        'Voice recognition is available in web mode (Chrome / Safari) or requires device speech services. Please type your search query above.',
        [{ text: 'OK' }]
      );
    }
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
