/**
 * @file LandingPage.jsx
 * @description GoDaddy-style light theme Landing Page for Crash Guard.
 * Uses centralized authentication and role selection gateway from App.jsx.
 */
import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/landing/HeroSection';
import AboutSection from '../components/landing/AboutSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import TechStackSection from '../components/landing/TechStackSection';
import Footer from '../components/layout/Footer';

export default function LandingPage({ user, onSignOut, onDashboardClick, onOpenAuth }) {
  const handleAuthTrigger = () => {
    if (user) {
      onDashboardClick?.();
    } else {
      onOpenAuth?.();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-red-500/20 flex flex-col">
      <Navbar 
        user={user} 
        onSignOut={onSignOut} 
        onDashboardClick={onDashboardClick}
        onAuthClick={handleAuthTrigger} 
      />
      
      <main className="flex-1">
        <HeroSection onAuthClick={handleAuthTrigger} />
        <AboutSection />
        <HowItWorksSection />
        <TechStackSection />
      </main>

      <Footer />
    </div>
  );
}
