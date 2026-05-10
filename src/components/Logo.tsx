import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const barClasses = {
    sm: 'gap-[1px]',
    md: 'gap-[2px]',
    lg: 'gap-[3px]',
    xl: 'gap-[4px]'
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-zinc-950 border border-white/5 shadow-lg ${sizeClasses[size]} ${className}`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/10 to-brand-cyan/10 opacity-50"></div>
      
      <div className={`absolute inset-0 flex flex-col justify-center p-[18%] ${barClasses[size]}`}>
        {/* Row 1: Solid */}
        <div className="w-full bg-gradient-to-r from-brand-yellow to-brand-cyan h-[12%] rounded-full shadow-[0_0_10px_rgba(255,221,45,0.2)]" />
        
        {/* Row 2: Split */}
        <div className="flex gap-1 h-[12%]">
          <div className="w-[30%] bg-gradient-to-r from-brand-yellow to-brand-yellow/80 h-full rounded-full" />
          <div className="w-[10%] bg-brand-yellow/60 h-full rounded-full" />
          <div className="w-[50%] bg-gradient-to-r from-brand-yellow/50 to-brand-cyan/80 h-full rounded-full" />
        </div>

        {/* Row 3: Solid */}
        <div className="w-full bg-gradient-to-r from-brand-yellow/80 to-brand-cyan h-[12%] rounded-full shadow-[0_0_8px_rgba(0,255,255,0.1)]" />

        {/* Row 4: Dashed/Dotted */}
        <div className="flex gap-[2px] h-[12%]">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="flex-1 h-full rounded-sm" 
              style={{ 
                background: `rgba(${255 - (i * 20)}, ${221 + (i * 5)}, ${45 + (i * 20)}, 0.8)` 
              }} 
            />
          ))}
        </div>

        {/* Row 5: Long/Short */}
        <div className="flex gap-1 h-[12%]">
          <div className="w-[20%] bg-brand-cyan/60 h-full rounded-full" />
          <div className="w-[40%] bg-gradient-to-r from-brand-cyan/70 to-brand-cyan/90 h-full rounded-full" />
          <div className="w-[30%] bg-brand-cyan h-full rounded-full shadow-[0_0_8px_rgba(0,255,255,0.2)]" />
        </div>

        {/* Row 6: Split different */}
        <div className="flex gap-1 h-[12%]">
          <div className="w-[15%] bg-brand-cyan/40 h-full rounded-full" />
          <div className="w-[25%] bg-brand-cyan/60 h-full rounded-full" />
          <div className="w-[45%] bg-gradient-to-r from-brand-cyan/80 to-brand-cyan h-full rounded-full" />
        </div>

        {/* Row 7: Solid */}
        <div className="w-full bg-gradient-to-r from-brand-cyan/80 to-brand-cyan h-[12%] rounded-full shadow-[0_0_10px_rgba(0,255,255,0.2)]" />
      </div>
    </div>
  );
}
