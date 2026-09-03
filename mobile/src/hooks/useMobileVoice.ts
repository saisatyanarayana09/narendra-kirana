import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { apiClient } from '../api/client';

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
  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (recognizerRef.current) {
        try {
          recognizerRef.current.abort ? recognizerRef.current.abort() : recognizerRef.current.stop();
        } catch {
          // Ignore
        }
        recognizerRef.current = null;
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      try {
        Speech.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  const stopListening = useCallback(async () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    // Web Speech API cleanup
    if (recognizerRef.current) {
      try {
        recognizerRef.current.abort ? recognizerRef.current.abort() : recognizerRef.current.stop();
      } catch {
        // Ignore
      }
      recognizerRef.current = null;
    }

    // Mobile Audio Recording cleanup & backend speech-to-text
    const recording = recordingRef.current;
    if (recording) {
      recordingRef.current = null;
      if (isMountedRef.current) {
        setIsListening(false);
        setInterimText('Transcribing speech...');
      }

      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri) {
          const formData = new FormData();
          const filename = uri.split('/').pop() || 'voice_search.m4a';
          
          formData.append('audio', {
            uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
            name: filename,
            type: 'audio/m4a',
          } as any);
          formData.append('language', language);

          const res = await apiClient.post('/store/voice-search/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          const recognizedText = res.data?.query || res.data?.text || '';
          if (recognizedText && recognizedText.trim()) {
            if (isMountedRef.current) {
              setInterimText(recognizedText);
            }
            if (onResultRef.current) {
              onResultRef.current(recognizedText.trim());
            }
          } else {
            if (isMountedRef.current) {
              setInterimText('');
              setError('Could not understand speech. Please try again.');
            }
          }
        }
      } catch (err: any) {
        console.error('Speech transcription error:', err);
        if (isMountedRef.current) {
          setInterimText('');
          setError('Voice search failed. Please try typing.');
        }
      } finally {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });
        } catch {
          // Ignore
        }
      }
      return;
    }

    if (isMountedRef.current) {
      setIsListening(false);
      setInterimText('');
    }
  }, [language]);

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

    // 2. Mobile Native Platform (Android / iOS): Use expo-av recording + backend speech-to-text
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission denied.');
        Alert.alert(
          'Permission Required',
          'Please enable microphone access in device settings to use voice search.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore
        }
        recordingRef.current = null;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      setError(null);
      setIsListening(true);
      setInterimText('Listening... Say grocery item');

      // Auto-stop after 4.5 seconds of speaking
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          stopListening();
        }
      }, 4500);

    } catch (err: any) {
      console.error('Audio recording start error:', err);
      setIsListening(false);
      setInterimText('');
      setError('Could not start microphone.');
    }
  }, [language, stopListening]);

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
