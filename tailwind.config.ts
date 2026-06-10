import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        editor: {
          bg: 'var(--editor-bg)',
          surface: 'var(--editor-surface)',
          'surface-hover': 'var(--editor-surface-hover)',
          border: 'var(--editor-border)',
          'border-subtle': 'var(--editor-border-subtle)',
          text: 'var(--editor-text)',
          'text-secondary': 'var(--editor-text-secondary)',
          'text-muted': 'var(--editor-text-muted)',
          accent: 'var(--editor-accent)',
          panel: 'var(--editor-panel-bg)',
          toolbar: 'var(--editor-toolbar-bg)',
          canvas: 'var(--editor-canvas-bg)',
        },
        sand: {
          50: '#fdf8f0',
          100: '#f9ecd8',
          200: '#f2d5ac',
          300: '#e8b977',
          400: '#de9a4b',
          500: '#d4802e',
          600: '#b86424',
          700: '#984b20',
          800: '#7c3d21',
          900: '#66331e',
        },
        selection: '#f6d13b',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 2s ease-in-out infinite',
      },
      borderRadius: {
        editor: '10px',
      },
      typography: {
        stone: {
          css: {
            '--tw-prose-body': '#57534e',
            '--tw-prose-headings': '#1c1917',
            '--tw-prose-links': '#b45309',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
