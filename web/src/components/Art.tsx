import type { ReactElement } from "react";
import { solid } from "../theme";

/**
 * Editorial, flat-colour scenes on a 3840×2160 (4K) artboard. Vector, so they stay razor-sharp at any
 * resolution. To swap in photography later, pass `photo` to <Slide> — it overlays the same frame.
 */
export type ArtKind = "contracts" | "licenses" | "spend" | "azure" | "security" | "timeline";
export const artBg: Record<ArtKind, string> = {
  contracts: solid.oxblood, licenses: solid.navy, spend: solid.forest, azure: solid.cobalt, security: solid.ink, timeline: solid.mustard,
};
const W = 3840, H = 2160;

function Frame({ bg, children, label }: { bg: string; children: React.ReactNode; label: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="art">
      <rect width={W} height={H} fill={bg} />
      {children}
    </svg>
  );
}

export function Art({ kind }: { kind: ArtKind }): ReactElement {
  const bg = artBg[kind];
  const P = solid.paper, M = solid.mustard, C = solid.crimson, K = solid.cobalt, I = solid.ink;
  switch (kind) {
    case "contracts":
      return (
        <Frame bg={bg} label="Stacked contract pages with a signature line and a seal">
          <g transform="translate(2150 260)">
            {[0, 1, 2].map((i) => <rect key={i} x={i * 90} y={i * 70} width="1180" height="1560" fill={i === 2 ? P : i === 1 ? "#E4DECF" : "#CFC8B6"} />)}
            <g transform="translate(180 140)" fill={I}>
              <rect width="560" height="40" /> <rect y="110" width="860" height="18" opacity=".8" />
              {Array.from({ length: 11 }, (_, i) => <rect key={i} y={190 + i * 70} width={i % 4 === 3 ? 520 : 860} height="16" opacity=".35" />)}
              <rect y="1020" width="520" height="8" /><text y="1090" fontFamily="Oswald,sans-serif" fontSize="44" letterSpacing="8">AUTHORISED SIGNATORY</text>
              <path d="M10 960 C 120 840 160 1010 260 900 S 400 880 470 950" stroke={K} strokeWidth="14" fill="none" strokeLinecap="round" />
            </g>
            <g transform="translate(900 1210)"><circle r="190" fill={M} /><circle r="150" fill="none" stroke={I} strokeWidth="10" /><text textAnchor="middle" y="28" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="110" fill={I}>EA</text></g>
          </g>
          <g fill={P} opacity=".9"><rect x="240" y="1450" width="1280" height="8" /><rect x="240" y="1490" width="760" height="8" opacity=".5" /></g>
        </Frame>
      );
    case "licenses":
      return (
        <Frame bg={bg} label="A grid of licence seats where roughly a quarter are empty">
          <g transform="translate(1900 230)">
            {Array.from({ length: 12 * 8 }, (_, i) => {
              const x = i % 12, y = Math.floor(i / 12);
              const empty = (x * 7 + y * 13 + (x * y)) % 11 < 3;
              return <g key={i} transform={`translate(${x * 140} ${y * 220})`}>
                <circle cx="60" cy="50" r="38" fill={empty ? "none" : P} stroke={empty ? C : "none"} strokeWidth="9" strokeDasharray={empty ? "14 12" : undefined} />
                <rect x="14" y="104" width="92" height="64" rx="46" fill={empty ? "none" : P} stroke={empty ? C : "none"} strokeWidth="9" strokeDasharray={empty ? "14 12" : undefined} />
              </g>;
            })}
          </g>
          <g fill={M}><rect x="1900" y="2010" width="120" height="120" /></g>
          <text x="2060" y="2108" fontFamily="Oswald,sans-serif" fontSize="76" letterSpacing="10" fill={P}>PAID FOR · NEVER USED</text>
          <g fill={C}><circle cx="400" cy="1000" r="300" opacity=".95" /></g>
          <text x="400" y="1040" textAnchor="middle" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="260" fill={P}>27%</text>
        </Frame>
      );
    case "spend":
      return (
        <Frame bg={bg} label="A bar chart stepping down to show savings">
          <g transform="translate(1950 250)">
            {[1500, 1380, 1180, 960, 790, 640].map((h, i) => <rect key={i} x={i * 300} y={1700 - h} width="220" height={h} fill={i < 2 ? P : i < 4 ? M : C} />)}
            <path d="M80 140 L 1500 520" stroke={P} strokeWidth="14" strokeDasharray="30 26" />
            <path d="M1500 520 l-70 -10 40 -60" stroke={P} strokeWidth="14" fill="none" />
            <rect x="0" y="1720" width="1750" height="10" fill={P} />
          </g>
          <text x="240" y="1050" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="520" fill={P}>–14%</text>
          <text x="256" y="1250" fontFamily="Oswald,sans-serif" fontSize="80" letterSpacing="14" fill={M}>MODELED RENEWAL SAVINGS</text>
        </Frame>
      );
    case "azure":
      return (
        <Frame bg={bg} label="Concentric arcs representing cloud consumption commitment">
          <g transform="translate(2700 1100)" fill="none">
            {[900, 740, 580, 420, 260].map((r, i) => <circle key={r} r={r} stroke={i % 2 ? M : P} strokeWidth={i === 4 ? 0 : 36} opacity={i % 2 ? 1 : 0.9} strokeDasharray={i === 2 ? "60 40" : undefined} />)}
            <circle r="260" fill={M} /><text textAnchor="middle" y="40" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="170" fill={I}>MACC</text>
          </g>
          <g fill={P}><rect x="240" y="1400" width="900" height="10" /><rect x="240" y="1450" width="560" height="10" opacity=".55" /></g>
        </Frame>
      );
    case "security":
      return (
        <Frame bg={bg} label="A shield inside walled compartments, one per tenant">
          <g transform="translate(1850 220)">
            {[0, 1, 2].map((i) => <rect key={i} x={i * 640} y={i % 2 ? 300 : 120} width="560" height="1500" fill="none" stroke={i === 1 ? M : P} strokeWidth="14" strokeDasharray={i === 1 ? undefined : "40 30"} opacity={i === 1 ? 1 : 0.55} />)}
            <g transform="translate(920 560)"><path d="M0 0 L360 120 V520 C360 760 190 900 0 980 C-190 900 -360 760 -360 520 V120 Z" fill={M} /><path d="M-130 470 L-30 580 L170 340" stroke={I} strokeWidth="46" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
            <text x="0" y="1760" fontFamily="Oswald,sans-serif" fontSize="68" letterSpacing="12" fill={P}>ONE TENANT · ONE ACCOUNT</text>
          </g>
        </Frame>
      );
    case "timeline":
      return (
        <Frame bg={bg} label="A fiscal-year timeline with June highlighted">
          <g transform="translate(240 1100)">
            <rect y="-8" width="3360" height="16" fill={I} />
            {["JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN"].map((m, i) => {
              const q = i % 3 === 2, june = i === 11;
              return <g key={m} transform={`translate(${i * 300 + 40} 0)`}>
                <rect x="-6" y={q ? -150 - (june ? 300 : 0) : -60} width="12" height={q ? 150 + (june ? 300 : 0) : 60} fill={I} />
                <circle r={june ? 54 : q ? 34 : 20} fill={june ? C : I} />
                <text y="130" textAnchor="middle" fontFamily="Oswald,sans-serif" fontSize="52" letterSpacing="6" fill={I}>{m}</text>
                {june && <text y="-480" textAnchor="middle" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="150" fill={I}>FY END</text>}
              </g>;
            })}
          </g>
          <text x="240" y="520" fontFamily="Playfair Display,serif" fontWeight="900" fontSize="200" fill={I}>Time the deal.</text>
        </Frame>
      );
  }
}
