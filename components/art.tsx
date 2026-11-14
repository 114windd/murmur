export function CloudMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 30 : 42}
      height={small ? 28 : 38}
      viewBox="0 0 48 42"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 33C1 31 3 19 10 19C7 8 23 2 29 12C37 7 46 17 40 23C49 32 32 38 27 33C20 39 12 37 10 33Z"
        fill="#DCD1F1"
        stroke="#85709F"
        strokeWidth="1.4"
      />
      <path
        d="M17 25v2m12-2v2"
        stroke="#625272"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M21 30q3 2 5-1"
        stroke="#625272"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function CloudGarden({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 340 215"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="174" cy="194" rx="123" ry="11" fill="#EEE8F6" />
      <path
        d="M36 177q7-29 19-34m-10 25q-20-10-19-21m18 16q11-20 22-18"
        stroke="#AAAF91"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M289 186q-4-38 10-59m-9 33q-18-9-18-22m20 12q18-20 27-13"
        stroke="#AAAF91"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M74 166c-25-10-16-42 5-42-9-31 33-52 54-26 16-24 52-12 48 12 32-6 49 30 24 46-12 17-39 14-52 6-29 16-55 15-79 4Z"
        fill="#E4DCF2"
        stroke="#AA94C1"
        strokeWidth="1.6"
      />
      <path
        d="M116 127v5m33-5v5"
        stroke="#6F5B83"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M128 141q7 6 13-1"
        stroke="#6F5B83"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="108" cy="139" rx="7" ry="3" fill="#CFB9DD" />
      <ellipse cx="158" cy="139" rx="7" ry="3" fill="#CFB9DD" />
      <path
        d="m165 183 10-51 45 4 35-13 12 52-42 16-60-8Z"
        fill="#FFFEFB"
        stroke="#9B87AE"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m220 136 5 55m-46-46 30 3m-31 6 32 4m-34 6 23 3m35-24 15-6m-13 14 16-6m-14 14 16-6"
        stroke="#C9BCD7"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="m96 183 8-22m-5 9-12-4m15 0 10-7"
        stroke="#AD9BBD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m241 49 3-8 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#D5C5EA" />
      <path d="m82 64 2-6 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#D5C5EA" />
      <path
        d="M191 63q7-15 15 0m-6 7q7-15 15 0"
        stroke="#C4B3D6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="276" cy="96" r="3" fill="#D8C8E7" />
      <circle cx="52" cy="109" r="2" fill="#D8C8E7" />
    </svg>
  );
}
export function LittleHouse() {
  return (
    <svg viewBox="0 0 210 140" fill="none" aria-hidden="true">
      <path d="M18 126q78-16 175-1" stroke="#D5CBE1" strokeWidth="1.5" />
      <path
        d="M67 119V72l35-29 40 30v46"
        fill="#FCFBFD"
        stroke="#A998BA"
        strokeWidth="1.4"
      />
      <path
        d="m56 78 47-42 50 41"
        stroke="#A998BA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M96 119V92q9-9 18 0v27"
        fill="#DDD1EB"
        stroke="#A998BA"
        strokeWidth="1.2"
      />
      <rect
        x="77"
        y="79"
        width="13"
        height="14"
        rx="5"
        fill="#EEE6F6"
        stroke="#A998BA"
      />
      <path d="M127 53V36h11v27" stroke="#A998BA" strokeWidth="1.4" />
      <path
        d="M134 25q-9-7 1-12m-6-1q-7-5-1-9"
        stroke="#C8B8D9"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M38 122V91m0 15q-19-18-8-23 7-3 8 8 6-19 14-12 8 7-14 27m130 17V99m0 9q-17-12-9-19 8-3 9 10 5-17 12-9 7 7-12 18"
        stroke="#B3B59A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="m171 35 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#CBBADB" />
    </svg>
  );
}
