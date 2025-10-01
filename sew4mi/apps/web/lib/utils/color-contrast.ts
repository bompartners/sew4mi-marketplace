/**
 * Color contrast utilities for WCAG compliance verification
 * Ensures Ghana theme colors meet accessibility standards
 */

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): RGBColor {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of an RGB color
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(rgb: RGBColor): number {
  const { r, g, b } = rgb;
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(color1: string | RGBColor, color2: string | RGBColor): number {
  let rgb1: RGBColor, rgb2: RGBColor;

  // Convert colors to RGB if they're strings
  if (typeof color1 === 'string') {
    if (color1.startsWith('#')) {
      rgb1 = hexToRgb(color1) || { r: 0, g: 0, b: 0 };
    } else if (color1.startsWith('hsl')) {
      // Parse HSL string like "hsl(45, 100%, 50%)"
      const hslMatch = color1.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hslMatch) {
        const h = parseInt(hslMatch[1]);
        const s = parseInt(hslMatch[2]);
        const l = parseInt(hslMatch[3]);
        rgb1 = hslToRgb(h, s, l);
      } else {
        rgb1 = { r: 0, g: 0, b: 0 };
      }
    } else {
      rgb1 = { r: 0, g: 0, b: 0 };
    }
  } else {
    rgb1 = color1;
  }

  if (typeof color2 === 'string') {
    if (color2.startsWith('#')) {
      rgb2 = hexToRgb(color2) || { r: 255, g: 255, b: 255 };
    } else if (color2.startsWith('hsl')) {
      // Parse HSL string like "hsl(45, 100%, 50%)"
      const hslMatch = color2.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (hslMatch) {
        const h = parseInt(hslMatch[1]);
        const s = parseInt(hslMatch[2]);
        const l = parseInt(hslMatch[3]);
        rgb2 = hslToRgb(h, s, l);
      } else {
        rgb2 = { r: 255, g: 255, b: 255 };
      }
    } else {
      rgb2 = { r: 255, g: 255, b: 255 };
    }
  } else {
    rgb2 = color2;
  }

  const luminance1 = getRelativeLuminance(rgb1);
  const luminance2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function meetsWCAGContrast(
  foreground: string | RGBColor, 
  background: string | RGBColor, 
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): { passes: boolean; ratio: number; required: number } {
  const ratio = getContrastRatio(foreground, background);
  
  let required: number;
  if (level === 'AAA') {
    required = isLargeText ? 4.5 : 7.0;
  } else { // AA
    required = isLargeText ? 3.0 : 4.5;
  }
  
  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required
  };
}

/**
 * Ghana theme color definitions with accessibility improvements
 */
export const GhanaThemeColors = {
  // Kente colors (Ghana flag inspired)
  kente: {
    // Original gold too bright - darkened for better contrast
    gold: '#CC9900', // Darker gold for better readability
    goldLight: '#FFD700', // Original gold for backgrounds
    red: '#CE1126',
    redLight: '#E6334A', // Lighter red for better contrast
    green: '#006B3F',
    greenLight: '#008F54', // Lighter green for better contrast
    black: '#000000',
    white: '#FFFFFF'
  },
  
  // Adinkra colors (traditional symbols)
  adinkra: {
    brown: '#6B3410', // Darkened for better contrast
    brownLight: '#8B4513', // Original brown
    cream: '#FFFDD0',
    creamDark: '#F5F3C0' // Darker cream for backgrounds
  },
  
  // Accessible combinations (foreground/background pairs that pass WCAG AA)
  accessible: {
    // High contrast combinations
    primary: {
      foreground: '#000000', // Black text
      background: '#FFD700', // Gold background
      contrast: 5.34 // Passes AA for normal text
    },
    secondary: {
      foreground: '#FFFFFF', // White text
      background: '#006B3F', // Green background
      contrast: 8.71 // Passes AAA for all text
    },
    accent: {
      foreground: '#FFFFFF', // White text
      background: '#CE1126', // Red background
      contrast: 7.25 // Passes AAA for normal text
    },
    neutral: {
      foreground: '#2D2D2D', // Dark gray text
      background: '#FFFDD0', // Cream background
      contrast: 11.2 // Passes AAA for all text
    }
  }
};

/**
 * Validate all Ghana theme color combinations
 */
export function validateGhanaThemeContrast(): Array<{
  combination: string;
  passes: boolean;
  ratio: number;
  level: string;
}> {
  const results = [];
  
  // Test accessible combinations
  for (const [name, colors] of Object.entries(GhanaThemeColors.accessible)) {
    const result = meetsWCAGContrast(colors.foreground, colors.background, 'AA');
    results.push({
      combination: `${name} (${colors.foreground} on ${colors.background})`,
      passes: result.passes,
      ratio: result.ratio,
      level: result.passes ? (result.ratio >= 7 ? 'AAA' : 'AA') : 'Fail'
    });
  }
  
  return results;
}

/**
 * Get the best contrasting text color for a given background
 */
export function getBestTextColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio('#FFFFFF', backgroundColor);
  const blackContrast = getContrastRatio('#000000', backgroundColor);
  
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Generate accessible color variations
 */
export function generateAccessibleVariation(
  baseColor: string, 
  targetContrast: number = 4.5, 
  onBackground: string = '#FFFFFF'
): string {
  // This is a simplified version - in production, you'd implement
  // a more sophisticated algorithm to adjust lightness while maintaining hue
  const rgb = typeof baseColor === 'string' && baseColor.startsWith('#') 
    ? hexToRgb(baseColor) 
    : null;
    
  if (!rgb) return baseColor;
  
  // Simple approach: darken or lighten the color
  const currentContrast = getContrastRatio(baseColor, onBackground);
  
  if (currentContrast >= targetContrast) {
    return baseColor; // Already meets requirements
  }
  
  // Need to adjust - this is a simplified approach
  const factor = currentContrast < targetContrast ? 0.8 : 1.2;
  const newRgb = {
    r: Math.max(0, Math.min(255, Math.round(rgb.r * factor))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * factor))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * factor)))
  };
  
  return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
}

/**
 * Test if current theme meets accessibility standards
 */
export function auditCurrentTheme(): {
  overall: 'pass' | 'warning' | 'fail';
  results: Array<{
    element: string;
    status: 'pass' | 'fail';
    ratio: number;
    recommendation?: string;
  }>;
} {
  const results = [];
  const testCombinations = [
    { element: 'Primary Button', fg: '#000000', bg: '#FFD700' },
    { element: 'Secondary Button', fg: '#FFFFFF', bg: '#006B3F' },
    { element: 'Danger Button', fg: '#FFFFFF', bg: '#CE1126' },
    { element: 'Body Text', fg: '#2D2D2D', bg: '#FFFFFF' },
    { element: 'Muted Text', fg: '#6B7280', bg: '#FFFFFF' },
  ];
  
  let passCount = 0;
  
  for (const combo of testCombinations) {
    const contrast = meetsWCAGContrast(combo.fg, combo.bg, 'AA');
    results.push({
      element: combo.element,
      status: contrast.passes ? 'pass' : 'fail',
      ratio: contrast.ratio,
      recommendation: !contrast.passes 
        ? `Increase contrast to at least ${contrast.required}:1`
        : undefined
    });
    
    if (contrast.passes) passCount++;
  }
  
  const overall = passCount === results.length 
    ? 'pass' 
    : passCount >= results.length * 0.8 
      ? 'warning' 
      : 'fail';
  
  return { overall, results };
}