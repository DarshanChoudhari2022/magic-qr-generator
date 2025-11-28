import { QrCode, Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <div className="text-center space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
        <Sparkles className="w-4 h-4" />
        Free QR Code Generator
      </div>
      
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
        Create Custom
        <span className="bg-gradient-primary bg-clip-text text-transparent"> QR Codes</span>
      </h1>
      
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
        Generate, customize, and download high-quality QR codes instantly. Perfect for websites, 
        marketing materials, and digital content.
      </p>

      <div className="flex items-center justify-center gap-8 pt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>Instant Generation</span>
        </div>
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>Full Customization</span>
        </div>
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>High Quality</span>
        </div>
      </div>
    </div>
  );
};
