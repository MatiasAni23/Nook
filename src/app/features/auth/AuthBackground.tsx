const illustrationUrl = new URL("../../../../assets/auth-chile-coworking.svg", import.meta.url).href;

/** Decorative illustration shared by the entire account access flow. */
export function AuthBackground({ variant = "panel" }: { variant?: "panel" | "page" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#2563EB_0%,#4653DB_44%,#6838D5_100%)]">
      <div className="absolute -left-24 -top-24 size-[30rem] rounded-full bg-sky-300/10 blur-[100px]" />
      <svg className="absolute inset-0 h-full w-full text-white" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" fill="none">
        <g stroke="currentColor" strokeLinecap="round" opacity=".12">
          <path d="M-90 197C58 207 122 337 272 293S483 175 644 211S757 346 884 286" strokeWidth="2" />
          <path d="M-80 614C98 589 122 463 247 469S429 568 554 517S714 389 893 437" strokeWidth="2.4" />
          <path d="M40-45C206 105 142 181 197 328S367 511 298 639S201 798 274 934" strokeWidth="2" />
          <path d="M601-64C585 104 475 136 478 278S569 442 551 574S617 741 778 840" strokeWidth="2.2" />
          <path d="M-20 831C110 791 141 663 277 695S475 761 588 683S716 607 875 666" strokeWidth="1.4" />
          <path d="M-46 401L119 323L262 355L401 297L532 329L728 245L843 288" strokeWidth="1.3" />
        </g>
        <g stroke="currentColor" opacity=".15" strokeDasharray="4 8" strokeLinecap="round">
          <path d="M161 332C277 359 278 504 411 498S530 320 644 303" />
          <path d="M93 616C257 552 390 656 483 573S631 614 715 768" />
        </g>
        <g fill="currentColor">
          {[[197, 328], [551, 574], [119, 323], [478, 278], [277, 695], [588, 683]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="7" opacity=".1" />
              <circle cx={cx} cy={cy} r="2.5" opacity=".35" />
            </g>
          ))}
        </g>
        <g fill="white" opacity=".7">
          <g transform="translate(145 315)">
            <circle r="25" fillOpacity=".08" />
            <path d="M0 13C-3 9-11 1-11-5A11 11 0 0 1 11-5C11 1 3 9 0 13Z" />
            <circle cy="-5" r="4" fill="#3860E2" />
          </g>
          <g transform="translate(639 248)">
            <circle r="25" fillOpacity=".08" />
            <path d="M0 13C-3 9-11 1-11-5A11 11 0 0 1 11-5C11 1 3 9 0 13Z" />
            <circle cy="-5" r="4" fill="#4951DC" />
          </g>
          <g transform="translate(95 631)">
            <circle r="25" fillOpacity=".08" />
            <path d="M0 13C-3 9-11 1-11-5A11 11 0 0 1 11-5C11 1 3 9 0 13Z" />
            <circle cy="-5" r="4" fill="#5050DB" />
          </g>
        </g>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_46%_47%,rgba(40,47,137,0.23),transparent_68%)]" />
      <img
        src={illustrationUrl}
        alt=""
        width={1000}
        height={420}
        className={`absolute inset-x-0 bottom-0 w-full object-bottom [mask-image:linear-gradient(to_bottom,transparent,black_20%)] ${variant === "page" ? "h-[min(36vh,24rem)] object-cover opacity-45" : "h-auto opacity-55"}`}
      />
    </div>
  );
}
