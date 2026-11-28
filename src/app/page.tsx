import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { DocumentsSection } from "@/components/sections/DocumentsSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { FaqSection } from "@/components/sections/FaqSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <DocumentsSection />
        <HowItWorksSection />
        <BenefitsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
