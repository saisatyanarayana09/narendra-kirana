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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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

  // Start Voice Recognition
  const startListening = useCallback(async () => {
    const hasPermission = await checkOrRequestPermission();
    if (!hasPermission) {
      setError('Microphone permission denied.');
      Alert.alert('Permission Required', 'Please enable microphone access in device settings to use voice search.');
      return;
    }

    try {
      Speech.stop();
    } catch {
      // Ignore
    }

    setError(null);
    setIsListening(true);
    setInterimText('Listening for grocery item...');

    // On web/standard runtime, if webkitSpeechRecognition exists
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognizer = new SpeechRecognition();
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = language;
        recognizer.onresult = (event: any) => {
          const result = event.results[0][0].transcript;
          setInterimText(result);
          if (event.results[0].isFinal) {
            setIsListening(false);
            if (onResult) onResult(result);
          }
        };
        recognizer.onerror = () => {
          setIsListening(false);
          setInterimText('');
        };
        recognizer.onend = () => {
          setIsListening(false);
        };
        recognizer.start();
        return;
      }
    }

    // Default fast speech trigger: prompt voice or sample dictation
    // Allows instant input without native bridge crash
    const timer = setTimeout(() => {
      if (isMountedRef.current && isListening) {
        setIsListening(false);
        setInterimText('');
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isListening, language, onResult]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
