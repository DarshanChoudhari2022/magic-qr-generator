import React, { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BrandedQRCardProps {
  value: string;
  businessName: string;
  logoUrl?: string;
  theme?: 'lightBlue' | 'darkNavy' | 'blackGold' | 'whiteBlue';
  size?: number;
}

const THEMES = {
  lightBlue: {
    background: '#E0F7FA',
    primary: '#00BCD4',
    secondary: '#006064',
    badge: '#00ACC1',
    text: '#000000',
    border: '#80DEEA'
  },
  darkNavy: {
    background: '#1A1A2E',
    primary: '#FF4444',
    secondary: '#FFFFFF',
    badge: '#FF4444',
    text: '#FFFFFF',
    border: '#FF6B6B'
  },
  blackGold: {
    background: '#000000',
    primary: '#FFD700',
    secondary: '#FFFFFF',
    badge: '#FFC107',
    text: '#FFFFFF',
    border: '#FFED4E'
  },
  whiteBlue: {
    background: '#FFFFFF',
    primary: '#2196F3',
    secondary: '#1976D2',
    badge: '#03A9F4',
    text: '#000000',
    border: '#64B5F6'
  }
};

export const BrandedQRCard: React.FC<BrandedQRCardProps> = ({
  value,
  businessName,
  logoUrl,
  theme = 'lightBlue',
  size = 300
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const currentTheme = THEMES[theme];

  useEffect(() => {
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLogoLoaded(true);
        setLogoError(false);
      };
      img.onerror = () => {
        setLogoLoaded(false);
        setLogoError(true);
      };
      img.src = logoUrl;
    }
  }, [logoUrl]);

  const downloadQRCard = () => {
    if (!canvasRef.current) return;

    import('html2canvas').then((html2canvas) => {
      html2canvas.default(canvasRef.current!, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: currentTheme.background
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `${businessName.replace(/\s+/g, '-')}-qr-card.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      });
    });
  };

  return (
    <div className="space-y-6">
      <div
        ref={canvasRef}
        className="rounded-2xl shadow-2xl p-8 max-w-md mx-auto transform transition-transform hover:scale-105"
        style={{
          backgroundColor: currentTheme.background,
          border: `3px solid ${currentTheme.border}`,
          boxShadow: `0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px ${currentTheme.border}`
        }}
      >
        <div className="text-center mb-6">
          {logoUrl && !logoError ? (
            <div className="relative inline-block">
              <div
                className="absolute inset-0 rounded-full blur-lg opacity-20"
                style={{ backgroundColor: currentTheme.primary }}
              />
              <img
                src={logoUrl}
                alt={businessName}
                className="relative h-24 w-24 rounded-full object-cover border-4 shadow-lg"
                style={{ borderColor: currentTheme.primary }}
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div
              className="h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-2 text-4xl font-bold shadow-lg"
              style={{
                backgroundColor: currentTheme.primary,
                color: currentTheme.background
              }}
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
          )}
          <h2
            className="text-xl font-bold mt-4"
            style={{ color: currentTheme.text }}
          >
            {businessName}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <div
            className="px-4 py-2 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-md"
            style={{ backgroundColor: currentTheme.badge }}
          >
            <span>✨</span>
            <span>AI-Powered</span>
          </div>
          <div
            className="px-4 py-2 rounded-full text-xs font-bold shadow-md"
            style={{
              backgroundColor: currentTheme.primary,
              color: theme === 'whiteBlue' || theme === 'lightBlue' ? '#000' : '#fff'
            }}
          >
            SMART QR
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div
            className="px-6 py-3 rounded-xl font-bold text-base flex items-center gap-2 shadow-lg transform transition-transform hover:scale-105"
            style={{
              backgroundColor: currentTheme.primary,
              color: theme === 'whiteBlue' || theme === 'lightBlue' ? '#000' : '#fff'
            }}
          >
            <span>📱</span>
            <span>SCAN ME</span>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl mb-6 relative flex items-center justify-center shadow-lg"
          style={{
            border: `2px solid ${currentTheme.primary}`,
            boxShadow: `inset 0 0 20px ${currentTheme.primary}22`
          }}
        >
          <QRCodeCanvas
            ref={qrRef}
            value={value}
            size={size}
            level="H"
            includeMargin={true}
            imageSettings={
              logoUrl && logoLoaded
                ? {
                    src: logoUrl,
                    height: Math.max(size * 0.25, 60),
                    width: Math.max(size * 0.25, 60),
                    excavate: true
                  }
                : undefined
            }
          />
        </div>

        <div className="text-center mb-6">
          <p className="text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
            Scan the QR Code
          </p>
          <p className="text-sm font-medium" style={{ color: currentTheme.secondary }}>
            Leave a Review on Google
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mb-6">
          <img
            src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
            alt="Google"
            className="h-6"
          />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-yellow-400 text-xl drop-shadow">★</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        <Button
          onClick={downloadQRCard}
          variant="outline"
          className="max-w-xs font-semibold"
          style={{
            borderColor: currentTheme.primary,
            color: currentTheme.primary
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download QR Card
        </Button>
      </div>
    </div>
  );
};
