// Icon glyphs shared by the rooftop emblems and the UI badges. Drawn around (0,0), roughly -12..12.
const I = "#2a1c15";
const s = (d, extra = "") => `<path d="${d}" fill="#fff" stroke="${I}" stroke-width="1.6" stroke-linejoin="round" ${extra}/>`;
const line = (d, c = "#fff", w = 2.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${I}" stroke-width="1.4"/>`;

export const GLYPH = {
  coffee: line("M-5 -12q-3 3 0 6M2 -12q-3 3 0 6") + s("M-9 -3H7V4Q7 11 -1 11Q-9 11 -9 4Z") + line("M7 -1q6 0 4 5q-1 3 -5 2") + line("M-11 12.5H10", I, 2),
  food: s("M-11 -1Q-11 -11 0 -11Q11 -11 11 -1Z") + `<rect x="-12" y="0" width="24" height="4" rx="2" fill="#5fae4a" stroke="${I}" stroke-width="1.4"/><rect x="-11" y="4" width="22" height="4" rx="1" fill="#8a4a2a" stroke="${I}" stroke-width="1.4"/>` + s("M-11 8H11Q11 12 6 12H-6Q-11 12 -11 8Z") + dot(-4, -6, 0.9, "#c9953f") + dot(3, -7, 0.9, "#c9953f"),
  tech: s("M2 -13L-8 2H-1L-3 13L9 -3H2L6 -13Z", 'style="fill:#ffe35a"'),
  flower: [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="6.5" fill="#fff" stroke="${I}" stroke-width="1.5" transform="rotate(${a})"/>`).join("") + dot(0, 0, 4.2, "#ffcf3f"),
  book: s("M0 -7Q-6 -11 -12 -8V8Q-6 5 0 9Z") + s("M0 -7Q6 -11 12 -8V8Q6 5 0 9Z") + line("M-8 -3h5M-8 1h5M3 -3h5M3 1h5", I, 1.2),
  gavel: `<g transform="rotate(-40)">` + s("M-9 -10H5V-1H-9Z") + s("M-4 -1H0V12H-4Z") + `</g>` + s("M0 8H12V12H0Z"),
  bank: s("M-12 -5L0 -12L12 -5Z") + s("M-9 -3h4v10h-4ZM-2 -3h4v10h-4ZM5 -3h4v10h-4Z") + s("M-12 8H12V12H-12Z"),
  eye: s("M-12 0Q0 -13 12 0Q0 13 -12 0Z") + dot(0, 0, 4, "#3f6fb5"),
  mask: s("M-10 -10Q0 -13 10 -10Q11 8 0 12Q-11 8 -10 -10Z") + line("M-6 -3q3 -2 4 0M2 -3q2 -2 4 0M-5 4q5 5 10 0", I, 1.8),
  clerk: s("M-9 -9H9V12H-9Z") + s("M-4 -12H4V-6H-4Z") + line("M-5 -1H5M-5 4H5M-5 8H1", I, 1.4),
  help: line("M-6 -5Q-6 -12 0 -12Q7 -12 6 -5Q6 -1 0 1V4", "#fff", 4) + dot(0, 10, 2.6, "#fff"),
  pin: s("M0 13Q-10 0 -10 -4A10 10 0 0 1 10 -4Q10 0 0 13Z") + dot(0, -4, 3.6, "#b5402f"),
  coin: dot(0, 0, 11, "#ffcf3f") + line("M3 -4q-7 -3 -6 4q1 7 6 4v-4h-3", I, 2),
  crate: s("M-11 -8H11V11H-11Z", 'style="fill:#d89a58"') + line("M-11 -8L11 11M11 -8L-11 11", I, 1.4) + line("M-11 -1H11", I, 1),
  people: dot(-5, -5, 4.5, "#fff") + s("M-12 11Q-12 1 -5 1Q2 1 2 11Z") + dot(7, -2, 3.6, "#fff") + s("M2 11Q2 4 7 4Q12 4 12 11Z"),
  chart: s("M-11 2h6v10h-6ZM-3 -5h6v17h-6ZM5 -11h6v23H5Z"),
  tag: s("M-11 -11H2L12 -1L-1 12L-11 2Z") + dot(-5, -5, 2.2, "#b5402f"),
};
