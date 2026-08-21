import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  const streamRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    let isMounted = true;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
        if (!isMounted) {
          // The user clicked "Close" while we were waiting for the camera to start!
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream; // Store in ref immediately
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        if (isMounted) {
          setError('Please grant camera permission to scan QR codes.');
        }
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          onScan(code.data);
          return; // stop scanning after success
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startVideo();

    return () => {
      isMounted = false; // Prevent orphaned streams from starting!
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [onScan]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Camera size={20} className="text-indigo-600" />
            Scan Customer QR
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative bg-black aspect-square flex items-center justify-center">
          {error ? (
            <div className="text-white text-center p-6">
              <Camera size={48} className="mx-auto mb-4 text-red-400 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner Overlay UI */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="w-full h-full border-[40px] border-black/40"></div>
                <div className="absolute top-10 left-10 w-16 h-16 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                <div className="absolute top-10 right-10 w-16 h-16 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                <div className="absolute bottom-10 left-10 w-16 h-16 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                <div className="absolute bottom-10 right-10 w-16 h-16 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                
                <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[scan_2s_ease-in-out_infinite] pointer-events-none"></div>
              </div>
            </>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">Position the QR code within the frame to automatically scan and approve the referral reward.</p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100px); opacity: 0; }
        }
      `}} />
    </div>
  ), document.body);
}
