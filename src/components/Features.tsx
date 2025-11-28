import { Download, Palette, Zap, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Instant Generation",
    description: "Create QR codes in real-time as you type. No waiting, no delays.",
  },
  {
    icon: Palette,
    title: "Full Customization",
    description: "Customize colors and size to match your brand perfectly.",
  },
  {
    icon: Download,
    title: "High-Quality Export",
    description: "Download in high resolution PNG format for print and digital use.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "All generation happens locally in your browser. Your data stays private.",
  },
];

export const Features = () => {
  return (
    <div className="mt-20 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold">Why Choose Our Generator?</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Professional-grade QR code generation with powerful customization options
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="p-6 space-y-4 hover:shadow-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-8"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <feature.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
