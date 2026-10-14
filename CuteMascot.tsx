export default function CuteMascot() {
  return (
    <svg
      viewBox="0 0 140 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Maskot PDF lucu"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD6A5" />
          <stop offset="1" stopColor="#FFA860" />
        </linearGradient>
      </defs>

      {/* kilau / sparkles */}
      <path
        d="M22 32 C23.4 28.6 26.6 27.4 30 26 C26.6 24.6 23.4 23.4 22 20 C20.6 23.4 17.4 24.6 14 26 C17.4 27.4 20.6 28.6 22 32 Z"
        fill="#FFC94D"
      />
      <path
        d="M116 26 C117.3 23 120 21.7 123 20.4 C120 19.1 117.3 17.8 116 14.8 C114.7 17.8 112 19.1 109 20.4 C112 21.7 114.7 23 116 26 Z"
        fill="#FBBF24"
      />
      <path
        d="M121 106 C122 103 124 102 126.4 100.8 C124 99.6 122 98.6 121 95.6 C120 98.6 118 99.6 115.6 100.8 C118 102 120 103 121 106 Z"
        fill="#FFC94D"
      />
      <path
        d="M21 108 C21.9 105.6 23.6 104.4 26 103.3 C23.6 102.2 21.9 101 21 98.6 C20.1 101 18.4 102.2 16 103.3 C18.4 104.4 20.1 105.6 21 108 Z"
        fill="#FF8E6B"
      />
      <circle cx="108" cy="14" r="2.4" fill="#FF8E6B" />
      <circle cx="14" cy="86" r="2.2" fill="#FBBF24" />
      <circle cx="128" cy="66" r="2.6" fill="#FFD6A5" />

      {/* badan dokumen */}
      <rect x="30" y="24" width="68" height="90" rx="14" fill="url(#docGrad)" />
      {/* lipatan sudut */}
      <path d="M78 24 L98 24 L98 44 Z" fill="#FFFFFF" opacity="0.5" />
      <path
        d="M78 24 L98 44"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
        fill="none"
      />

      {/* garis isi dokumen */}
      <rect x="42" y="92" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.55" />
      <rect x="42" y="100" width="14" height="4" rx="2" fill="#FFFFFF" opacity="0.4" />

      {/* wajah */}
      <ellipse cx="52" cy="76" rx="5.5" ry="3.6" fill="#FF8E6B" opacity="0.65" />
      <ellipse cx="88" cy="76" rx="5.5" ry="3.6" fill="#FF8E6B" opacity="0.65" />

      <circle cx="59" cy="64" r="5.4" fill="#4A2B1A" />
      <circle cx="81" cy="64" r="5.4" fill="#4A2B1A" />
      <circle cx="60.7" cy="62.2" r="1.8" fill="#FFFFFF" />
      <circle cx="82.7" cy="62.2" r="1.8" fill="#FFFFFF" />

      <path
        d="M65 74 Q70 80 75 74"
        stroke="#4A2B1A"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
