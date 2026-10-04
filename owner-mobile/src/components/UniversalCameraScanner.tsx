import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Vibration,
  DimensionValue,
} from 'react-native';
import { Camera, CameraView, BarcodeScanningResult, BarcodeType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import jsQR from 'jsqr';

interface UniversalCameraScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  mode?: 'qr' | 'barcode' | 'all';
  title?: string;
  subtitle?: string;
  minimal?: boolean;
  continuous?: boolean;
  torch?: boolean;
  onToggleTorch?: () => void;
  height?: DimensionValue;
  isScanned?: boolean;
  isActive?: boolean;
  hideFloatingTorch?: boolean;
  showModeSelector?: boolean;
  onModeChange?: (mode: 'all' | 'barcode' | 'qr') => void;
}

const ALL_BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf14',
  'pdf417',
  'aztec',
  'datamatrix',
];

export default function UniversalCameraScanner({
  onScan,
  onClose,
  mode = 'all',
  title = 'Camera Scanner',
  subtitle = 'Point your camera at a QR code or barcode',
  minimal = false,
  continuous = false,
  torch: propTorch,
  onToggleTorch,
  height = 320,
  isScanned,
  isActive = true,
  hideFloatingTorch = false,
  showModeSelector = false,
  onModeChange,
}: UniversalCameraScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [internalScanned, setInternalScanned] = useState(false);
  const [internalMode, setInternalMode] = useState<'qr' | 'barcode' | 'all'>(mode);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [internalTorch, setInternalTorch] = useState(false);
  const [laserAnim] = useState(() => new Animated.Value(0));

  const activeMode = mode !== undefined ? mode : internalMode;
  const scanned = isScanned !== undefined ? isScanned : internalScanned;
  const activeTorch = propTorch !== undefined ? propTorch : internalTorch;

  const reticleWidth = activeMode === 'barcode' ? 270 : activeMode === 'qr' ? 210 : 245;
  const reticleHeight = activeMode === 'barcode' ? 130 : activeMode === 'qr' ? 210 : 175;

  const triggerScanFeedback = () => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
    } catch {}
  };

  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    if (!scanned) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      loopAnim.start();
    } else {
      laserAnim.setValue(0.5);
    }
    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [scanned, laserAnim]);

  // Web video & canvas refs
  const videoContainerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Native camera permission request
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (isMounted) {
          setHasPermission(status === 'granted');
          if (status !== 'granted') {
            setCameraError('Camera permission was denied. Please enable it in device settings.');
          }
        }
      } catch {
        if (isMounted) {
          setHasPermission(false);
          setCameraError('Could not access native camera.');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Web camera initialization using getUserMedia + jsQR (and BarcodeDetector if available in browser)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isActive) {
      if (animFrameRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        streamRef.current = null;
      }
      if (typeof document !== 'undefined' && videoContainerRef.current) {
        (videoContainerRef.current as HTMLElement).innerHTML = '';
      }
      return;
    }
    let isMounted = true;
    let videoEl: HTMLVideoElement | null = null;
    let canvasEl: HTMLCanvasElement | null = null;

    const stopWebCamera = () => {
      if (animFrameRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        streamRef.current = null;
      }
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch {}
        html5QrCodeRef.current = null;
      }
    };

    const startWebCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (isMounted) {
          setHasPermission(false);
          setCameraError(
            'Web camera API is not supported in this browser or requires HTTPS / localhost.'
          );
        }
        return;
      }

      try {
        setCameraError(null);
        stopWebCamera();

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing === 'back' ? { ideal: 'environment' } : { ideal: 'user' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);

        if (typeof document !== 'undefined' && videoContainerRef.current) {
          const container = videoContainerRef.current as HTMLElement;
          container.innerHTML = '';

          videoEl = document.createElement('video');
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.muted = true;
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'cover';
          videoEl.srcObject = stream;
          container.appendChild(videoEl);

          canvasEl = document.createElement('canvas');
          canvasEl.style.display = 'none';
          container.appendChild(canvasEl);

          await videoEl.play().catch(() => {});

          // Optional native browser BarcodeDetector for 1D/2D barcodes
          let barcodeDetector: any = null;
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
              const BD = (window as any).BarcodeDetector;
              barcodeDetector = new BD({
                formats: [
                  'qr_code',
                  'ean_13',
                  'ean_8',
                  'upc_a',
                  'upc_e',
                  'code_128',
                  'code_39',
                ],
              });
            } catch {}
          }

          let isSessionScanned = false;

          const scanTick = async () => {
            if (!isMounted || !videoEl || !canvasEl) return;

            if (!scanned && !isSessionScanned && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
              const width = videoEl.videoWidth;
              const height = videoEl.videoHeight;
              if (width > 0 && height > 0) {
                // 1. Try native BarcodeDetector first if available (supports 1D & QR)
                if (barcodeDetector) {
                  try {
                    const barcodes = await barcodeDetector.detect(videoEl);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                      triggerScanFeedback();
                      isSessionScanned = true;
                      setInternalScanned(true);
                      onScan(String(barcodes[0].rawValue));
                      if (continuous) {
                        setTimeout(() => {
                          isSessionScanned = false;
                          setInternalScanned(false);
                        }, 1400);
                      }
                      return;
                    }
                  } catch {}
                }

                // 2. Always run jsQR fallback on canvas frame
                canvasEl.width = width;
                canvasEl.height = height;
                const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(videoEl, 0, 0, width, height);
                  const imageData = ctx.getImageData(0, 0, width, height);
                  const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                  });
                  if (qrResult && qrResult.data) {
                    triggerScanFeedback();
                    isSessionScanned = true;
                    setInternalScanned(true);
                    onScan(qrResult.data);
                    if (continuous) {
                      setTimeout(() => {
                        isSessionScanned = false;
                        setInternalScanned(false);
                      }, 1400);
                    }
                    return;
                  }
                }
              }
            }

            animFrameRef.current = requestAnimationFrame(scanTick);
          };

          animFrameRef.current = requestAnimationFrame(scanTick);
        }
      } catch (err: any) {
        if (isMounted) {
          setHasPermission(false);
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser address bar.'
              : err?.name === 'NotFoundError'
                ? 'No camera device found on this computer/device.'
                : 'Unable to start camera stream. You can also enter the code manually below.'
          );
        }
      }
    };

    startWebCamera();

    return () => {
      isMounted = false;
      stopWebCamera();
    };
  }, [facing, onScan, continuous, scanned, isActive]);

  const handleNativeBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result?.data) return;
    triggerScanFeedback();
    setInternalScanned(true);
    onScan(result.data);
    if (continuous) {
      setTimeout(() => {
        setInternalScanned(false);
      }, 1400);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleTorch = async () => {
    if (onToggleTorch) {
      onToggleTorch();
      return;
    }
    const next = !activeTorch;
    setInternalTorch(next);
    if (Platform.OS === 'web' && streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track && (track.getCapabilities as any)?.torch) {
          await (track as any).applyConstraints({
            advanced: [{ torch: next }],
          });
        }
      } catch {}
    }
  };

  return (
    <View style={[styles.wrapper, minimal && styles.wrapperMinimal]}>
      {!minimal && (
        <View style={styles.headerBar}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={toggleCameraFacing}
              accessibilityLabel="Switch Camera"
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#f8fafc" />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                style={[styles.iconBtn, styles.closeBtn]}
                onPress={onClose}
                accessibilityLabel="Close Scanner"
              >
                <Ionicons name="close" size={20} color="#f8fafc" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={[styles.cameraBox, { height: height as any }]}>
        {hasPermission === null && !cameraError && (
          <View style={styles.statusCenter}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.statusText}>Starting camera...</Text>
          </View>
        )}

        {cameraError ? (
          <View style={styles.statusCenter}>
            <Ionicons name="videocam-off-outline" size={44} color="#ef4444" />
            <Text style={styles.errorText}>{cameraError}</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          isActive ? (
            <View ref={videoContainerRef} style={styles.webVideoContainer} />
          ) : (
            <View style={styles.statusCenter}>
              <Ionicons name="videocam-off-outline" size={44} color="#64748b" />
              <Text style={styles.statusText}>Camera is paused</Text>
            </View>
          )
        ) : (
          hasPermission && isActive ? (
            <CameraView
              facing={facing}
              enableTorch={activeTorch}
              onBarcodeScanned={scanned ? undefined : handleNativeBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes:
                  activeMode === 'qr'
                    ? ['qr']
                    : activeMode === 'barcode'
                      ? ALL_BARCODE_TYPES.filter((t) => t !== 'qr')
                      : ALL_BARCODE_TYPES,
              }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.statusCenter}>
              <Ionicons name="videocam-off-outline" size={44} color="#64748b" />
              <Text style={styles.statusText}>Camera is paused</Text>
            </View>
          )
        )}

        {/* Floating Controls Overlay (Visible in all modes for fast access) */}
        {!cameraError && (
          <View style={styles.floatingTopBar}>
            {onClose && (
              <TouchableOpacity
                style={styles.floatingActionBtn}
                onPress={onClose}
                accessibilityLabel="Close Scanner"
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            )}

            {showModeSelector && (
              <View style={styles.modeSegmentedPill}>
                {(['all', 'barcode', 'qr'] as const).map((m) => {
                  const isSelected = activeMode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => {
                        setInternalMode(m);
                        if (onModeChange) onModeChange(m);
                      }}
                      style={[
                        styles.modeSegmentBtn,
                        isSelected && styles.modeSegmentBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeSegmentText,
                          isSelected && styles.modeSegmentTextActive,
                        ]}
                      >
                        {m === 'all' ? 'All' : m === 'barcode' ? 'Barcode' : 'QR'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Flashlight / Torch Toggle (Hidden when parent provides external torch button) */}
            {!hideFloatingTorch && (
              <TouchableOpacity
                style={[
                  styles.floatingActionBtn,
                  activeTorch && styles.floatingActionBtnActive,
                ]}
                onPress={toggleTorch}
                accessibilityLabel="Toggle Flashlight"
              >
                <Ionicons
                  name={activeTorch ? 'flash' : 'flash-outline'}
                  size={17}
                  color={activeTorch ? '#facc15' : '#ffffff'}
                />
              </TouchableOpacity>
            )}

            {/* Camera Facing Flip */}
            <TouchableOpacity
              style={styles.floatingActionBtn}
              onPress={toggleCameraFacing}
              accessibilityLabel="Flip Camera"
            >
              <Ionicons name="camera-reverse-outline" size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Precision Optical Viewfinder Mask & Reticle Overlay */}
        {!cameraError && (
          <View style={[styles.reticleOverlay, { pointerEvents: 'none' }]}>
            {/* Shaded Top Area */}
            <View style={styles.maskTop} />

            {/* Middle Row: Shaded Left, Clear Scan Window, Shaded Right */}
            <View style={[styles.maskMiddleRow, { height: reticleHeight }]}>
              <View style={styles.maskSide} />
              <View
                style={[
                  styles.reticleBox,
                  { width: reticleWidth, height: reticleHeight },
                  scanned && styles.reticleBoxScanned,
                ]}
              >
                <View style={[styles.corner, styles.topLeft, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.topRight, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.bottomLeft, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.bottomRight, scanned && styles.cornerScanned]} />

                {/* Animated Glowing Laser Beam */}
                {!scanned && (
                  <Animated.View
                    style={[
                      styles.laserBeam,
                      {
                        transform: [
                          {
                            translateY: laserAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-(reticleHeight / 2 - 14), reticleHeight / 2 - 14],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.laserLineCore} />
                    <View style={styles.laserGlow} />
                  </Animated.View>
                )}
              </View>
              <View style={styles.maskSide} />
            </View>

            {/* Shaded Bottom Area with Centered Floating Status Pill */}
            <View style={styles.maskBottom}>
              <View style={[styles.reticleBadge, scanned && styles.reticleBadgeScanned]}>
                <View
                  style={[
                    styles.reticleDot,
                    { backgroundColor: scanned ? '#34d399' : '#10b981' },
                  ]}
                />
                <Text style={styles.reticleBadgeText}>
                  {scanned
                    ? 'Code Detected!'
                    : activeMode === 'barcode'
                      ? 'Align 1D Product Barcode'
                      : activeMode === 'qr'
                        ? 'Align 2D Customer QR'
                        : 'Align Barcode or QR Code'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {scanned && !continuous && isScanned === undefined && (
          <View style={styles.rescanOverlay}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.rescanBtn}
              onPress={() => {
                setInternalScanned(false);
              }}
            >
              <Ionicons name="scan-outline" size={17} color="#ffffff" />
              <Text style={styles.rescanBtnText}>Tap to Scan Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
  },
  wrapperMinimal: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  cameraBox: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 20,
  },
  webVideoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  floatingTopBar: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  floatingActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  floatingActionBtnActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderColor: '#facc15',
  },
  modeSegmentedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  modeSegmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  modeSegmentBtnActive: {
    backgroundColor: '#10b981',
  },
  modeSegmentText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  modeSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  statusCenter: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#cbd5e1',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.46)',
  },
  maskMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 190,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.46)',
    height: '100%',
  },
  maskBottom: {
    flex: 1.3,
    backgroundColor: 'rgba(5, 10, 20, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  reticleBox: {
    width: 230,
    height: 190,
    position: 'relative',
    justifyContent: 'center',
  },
  reticleBoxSquare: {
    width: 210,
    height: 190,
  },
  reticleBoxWide: {
    width: 260,
    height: 140,
  },
  reticleBoxScanned: {
    transform: [{ scale: 1.02 }],
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#10b981',
  },
  cornerScanned: {
    borderColor: '#34d399',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  laserBeam: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  laserLineCore: {
    height: 2.5,
    width: '100%',
    backgroundColor: '#34d399',
    borderRadius: 2,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 5,
  },
  laserGlow: {
    position: 'absolute',
    height: 10,
    width: '95%',
    backgroundColor: 'rgba(52, 211, 153, 0.28)',
    borderRadius: 5,
  },
  reticleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  reticleBadgeScanned: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
  },
  reticleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  reticleBadgeText: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '700',
  },
  rescanOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#10b981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  rescanBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
});
