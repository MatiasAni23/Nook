import "./discover.css";

const cityIllustrationUrl = new URL("../../../../assets/auth-chile-coworking.svg", import.meta.url).href;

/** Keeps the city and routes behind the readable content of the discovery header. */
export function DiscoverBackground() {
  return (
    <div className="discover-background" aria-hidden="true">
      <svg className="discover-background-routes" viewBox="0 0 1200 300" preserveAspectRatio="xMaxYMid slice" fill="none">
        <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M440 286C540 252 571 190 675 198S812 268 910 225S1050 125 1220 152" />
          <path d="M682 320C735 250 694 181 778 152S916 162 958 104S1039 20 1220 46" />
          <path d="M506 328L602 260L718 272L799 220L896 240L991 177L1120 197L1230 126" />
          <path d="M872 305C900 274 935 274 953 240S955 165 1002 154S1088 169 1120 115" strokeDasharray="3 7" />
          <path d="M778 152H790M784 146V158M991 177H1003M997 171V183" />
        </g>
        <g fill="currentColor">
          <circle cx="910" cy="225" r="3" />
          <circle cx="958" cy="104" r="2.5" />
          <circle cx="1120" cy="197" r="3" />
        </g>
      </svg>
      <img src={cityIllustrationUrl} alt="" width={1000} height={420} className="discover-background-city" />
    </div>
  );
}
