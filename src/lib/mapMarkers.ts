// Marker colors — must match LeftPanel legend
const MARKER_COLORS: Record<string, string> = {
  winter: '#60a5fa',     // Kışlak — Blue
  summer: '#fbbf24',     // Yayla  — Gold
  camp: '#a78bfa',       // Konalga — Purple
  heritage: '#f87171',   // Somut Miras — Red
  intangible: '#34d399', // Somut Olmayan Miras — Teal
  custom: '#94a3b8',     // Fallback — Slate
};

// Shape per icon style — must match LeftPanel legend
const MARKER_SHAPES: Record<string, 'circle' | 'diamond' | 'ring'> = {
  winter: 'circle',
  summer: 'circle',
  camp: 'circle',
  heritage: 'diamond',
  intangible: 'ring',
  custom: 'circle',
};

const MARKER_SIZES: Record<string, number> = {
  sm: 20,
  md: 28,
  lg: 36,
};

function svgCircle(color: string): string {
  return `
    <circle cx="12" cy="12" r="7" fill="${color}" opacity="0.9"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" fill="#fff" opacity="0.85"/>
  `;
}

function svgDiamond(color: string): string {
  return `
    <rect x="5" y="5" width="14" height="14" rx="2" fill="${color}" opacity="0.9" transform="rotate(45 12 12)"/>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="#fff" stroke-width="2" transform="rotate(45 12 12)"/>
    <circle cx="12" cy="12" r="2.5" fill="#fff" opacity="0.85"/>
  `;
}

function svgRing(color: string): string {
  return `
    <circle cx="12" cy="12" r="7" fill="none" stroke="${color}" stroke-width="3" opacity="0.9"/>
    <circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="1" opacity="0.4"/>
    <circle cx="12" cy="12" r="2.5" fill="${color}" opacity="0.85"/>
  `;
}

export function createMarkerElement(
  iconStyle: string,
  size: string,
  label?: string
): HTMLDivElement {
  const color = MARKER_COLORS[iconStyle] || MARKER_COLORS.custom;
  const shape = MARKER_SHAPES[iconStyle] || 'circle';
  const px = MARKER_SIZES[size] || MARKER_SIZES.md;

  let shapeContent: string;
  switch (shape) {
    case 'diamond':
      shapeContent = svgDiamond(color);
      break;
    case 'ring':
      shapeContent = svgRing(color);
      break;
    default:
      shapeContent = svgCircle(color);
      break;
  }

  const el = document.createElement('div');
  el.style.width = `${px}px`;
  el.style.height = `${px}px`;
  el.style.cursor = 'pointer';
  el.innerHTML = `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${shapeContent}</svg>`;

  if (label) {
    el.title = label;
  }

  return el;
}
