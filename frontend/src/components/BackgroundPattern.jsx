function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large circles */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-sos-blue/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 bg-sos-coral/10 rounded-full blur-2xl" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-sos-blue/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Geometric patterns */}
      <div className="absolute top-20 right-1/4 w-32 h-32 border-4 border-sos-blue/20 rounded-3xl rotate-12 animate-float" />
      <div className="absolute bottom-32 right-40 w-24 h-24 border-4 border-sos-coral/20 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/3 left-20 w-20 h-20 bg-sos-blue/10 rounded-2xl rotate-45 animate-float" style={{ animationDelay: '0.5s' }} />
      
      {/* Small decorative dots */}
      <div className="absolute top-40 left-1/3 w-3 h-3 bg-sos-blue/30 rounded-full" />
      <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-sos-coral/40 rounded-full" />
      <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-sos-blue/25 rounded-full" />
      <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-sos-coral/30 rounded-full" />
      
      {/* Abstract house-like shapes (child-friendly) */}
      <div className="absolute bottom-40 left-32">
        <div className="relative">
          <div className="w-16 h-12 bg-sos-blue/10 rounded-lg" />
          <div className="absolute -top-6 left-0 w-16 h-8 bg-sos-coral/10 rounded-t-full" />
        </div>
      </div>
      
      <div className="absolute top-1/4 right-32">
        <div className="relative">
          <div className="w-20 h-16 bg-sos-coral/10 rounded-lg" />
          <div className="absolute -top-8 left-0 w-20 h-10 bg-sos-blue/10 rounded-t-full" />
        </div>
      </div>
      
      {/* Connecting lines pattern */}
      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#00aeef" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

export default BackgroundPattern;
