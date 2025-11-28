import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Download, Link, Type, Palette } from "lucide-react";
import { toast } from "sonner";

export const QRGenerator = () => {
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [qrValue, setQrValue] = useState("https://example.com");
  const [qrSize, setQrSize] = useState(256);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = qrSize;
    canvas.height = qrSize;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "qrcode.png";
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR Code downloaded successfully!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      <Card className="p-6 lg:p-8 space-y-6 shadow-medium">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">Generate QR Code</h2>
          <p className="text-muted-foreground">Customize and create your QR code</p>
        </div>

        <Tabs value={inputType} onValueChange={(v) => setInputType(v as "url" | "text")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Enter URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com"
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                className="transition-all"
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-input">Enter Text</Label>
              <Textarea
                id="text-input"
                placeholder="Enter any text..."
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                rows={4}
                className="transition-all resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Palette className="w-4 h-4" />
            <span className="font-medium text-foreground">Customization</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size-slider">Size: {qrSize}px</Label>
            <Slider
              id="size-slider"
              min={128}
              max={512}
              step={32}
              value={[qrSize]}
              onValueChange={(value) => setQrSize(value[0])}
              className="py-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fg-color">Foreground Color</Label>
              <div className="flex gap-2">
                <Input
                  id="fg-color"
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 lg:p-8 space-y-6 shadow-medium flex flex-col">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">Preview</h2>
          <p className="text-muted-foreground">Your QR code will appear here</p>
        </div>

        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg p-8 transition-all">
          {qrValue ? (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrValue}
                size={Math.min(qrSize, 400)}
                fgColor={fgColor}
                bgColor={bgColor}
                level="H"
                includeMargin
                className="shadow-soft rounded-lg"
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-center">Enter a URL or text to generate QR code</p>
          )}
        </div>

        <Button
          onClick={downloadQRCode}
          disabled={!qrValue}
          size="lg"
          className="w-full bg-gradient-primary hover:opacity-90 transition-all shadow-soft"
        >
          <Download className="w-5 h-5 mr-2" />
          Download PNG
        </Button>
      </Card>
    </div>
  );
};
