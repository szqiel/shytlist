
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

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <rect x="32" y="26" width="452" height="46" rx="23" fill="url(#paint0_linear_logo)"/>
        <rect x="32" y="302" width="452" height="46" rx="23" fill="url(#paint1_linear_logo)"/>
        <rect x="27" y="164" width="452" height="46" rx="23" fill="url(#paint2_linear_logo)"/>
        <rect x="27" y="440" width="452" height="46" rx="23" fill="url(#paint3_linear_logo)"/>
        <rect x="27" y="233" width="76" height="46" rx="23" fill="url(#paint4_linear_logo)"/>
        <rect x="120" y="233" width="55" height="46" rx="23" fill="url(#paint5_linear_logo)"/>
        <rect x="192" y="233" width="75" height="46" rx="23" fill="url(#paint6_linear_logo)"/>
        <rect x="284" y="233" width="29" height="46" rx="14.5" fill="url(#paint7_linear_logo)"/>
        <rect x="330" y="233" width="67" height="46" rx="23" fill="url(#paint8_linear_logo)"/>
        <rect x="410" y="233" width="69" height="46" rx="23" fill="url(#paint9_linear_logo)"/>
        <rect x="32" y="95" width="143" height="46" rx="23" fill="url(#paint10_linear_logo)"/>
        <rect x="192" y="95" width="50" height="46" rx="23" fill="url(#paint11_linear_logo)"/>
        <rect x="258" y="95" width="226" height="46" rx="23" fill="url(#paint12_linear_logo)"/>
        <rect x="32" y="371" width="226" height="46" rx="23" fill="url(#paint13_linear_logo)"/>
        <rect x="274" y="371" width="50" height="46" rx="23" fill="url(#paint14_linear_logo)"/>
        <rect x="336" y="371" width="143" height="46" rx="23" fill="url(#paint15_linear_logo)"/>
        <defs>
          <linearGradient id="paint0_linear_logo" x1="32" y1="49" x2="484" y2="49" gradientUnits="userSpaceOnUse">
            <stop stop-color="#37CAFF"/>
            <stop offset="1" stop-color="#FFE837"/>
          </linearGradient>
          <linearGradient id="paint1_linear_logo" x1="32" y1="325" x2="484" y2="325" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFE837"/>
            <stop offset="1" stop-color="#37CAFF"/>
          </linearGradient>
          <linearGradient id="paint2_linear_logo" x1="27" y1="187" x2="479" y2="187" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFE837"/>
            <stop offset="1" stop-color="#37CAFF"/>
          </linearGradient>
          <linearGradient id="paint3_linear_logo" x1="27" y1="463" x2="479" y2="463" gradientUnits="userSpaceOnUse">
            <stop stop-color="#37CAFF"/>
            <stop offset="1" stop-color="#FFE837"/>
          </linearGradient>
          <linearGradient id="paint4_linear_logo" x1="27" y1="256" x2="103" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#37CAFF"/>
            <stop offset="1" stop-color="#7AD5BE"/>
          </linearGradient>
          <linearGradient id="paint5_linear_logo" x1="120" y1="256" x2="175" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#60D0D7"/>
            <stop offset="1" stop-color="#81D5B5"/>
          </linearGradient>
          <linearGradient id="paint6_linear_logo" x1="192" y1="256" x2="267" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#85D6B1"/>
            <stop offset="1" stop-color="#A2DA94"/>
          </linearGradient>
          <linearGradient id="paint7_linear_logo" x1="284" y1="256" x2="313" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A0DA97"/>
            <stop offset="1" stop-color="#BDDE79"/>
          </linearGradient>
          <linearGradient id="paint8_linear_logo" x1="330" y1="256" x2="397" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#B8DE7E"/>
            <stop offset="1" stop-color="#DDE35B"/>
          </linearGradient>
          <linearGradient id="paint9_linear_logo" x1="410" y1="256" x2="479" y2="256" gradientUnits="userSpaceOnUse">
            <stop stop-color="#D7E25F"/>
            <stop offset="1" stop-color="#FFE944"/>
          </linearGradient>
          <linearGradient id="paint10_linear_logo" x1="32" y1="118" x2="175" y2="118" gradientUnits="userSpaceOnUse">
            <stop stop-color="#39CBFE"/>
            <stop offset="1" stop-color="#74D3C2"/>
          </linearGradient>
          <linearGradient id="paint11_linear_logo" x1="192" y1="118" x2="242" y2="118" gradientUnits="userSpaceOnUse">
            <stop stop-color="#83D6B4"/>
            <stop offset="1" stop-color="#A5DA91"/>
          </linearGradient>
          <linearGradient id="paint12_linear_logo" x1="258" y1="118" x2="484" y2="118" gradientUnits="userSpaceOnUse">
            <stop stop-color="#9FDA98"/>
            <stop offset="1" stop-color="#FEE838"/>
          </linearGradient>
          <linearGradient id="paint13_linear_logo" x1="32" y1="394" x2="258" y2="394" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFE837"/>
            <stop offset="1" stop-color="#A0DA97"/>
          </linearGradient>
          <linearGradient id="paint14_linear_logo" x1="274" y1="394" x2="324" y2="394" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A4DA92"/>
            <stop offset="1" stop-color="#84D6B2"/>
          </linearGradient>
          <linearGradient id="paint15_linear_logo" x1="336" y1="394" x2="479" y2="394" gradientUnits="userSpaceOnUse">
            <stop stop-color="#74D3C2"/>
            <stop offset="1" stop-color="#37CAFF"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
