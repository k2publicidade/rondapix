import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Cores temáticas premium
        felt: {
          DEFAULT: '#1a5c3a',
          dark: '#0e3322',
          light: '#237a4e',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e0c76a',
          dark: '#9a7d2e',
        },
        'casino-red': '#c0392b',
        'casino-blue': '#1a3a6b',
        'deep-black': '#0a0f0d',
      },
      fontFamily: {
        display: ["'Playfair Display'", 'serif'],
        sans: ['Inter', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(201, 168, 76, 0.15), 0 0 40px rgba(201, 168, 76, 0.05)',
        'gold-lg': '0 8px 30px rgba(201, 168, 76, 0.2), 0 0 60px rgba(201, 168, 76, 0.08)',
        'green-glow': '0 4px 20px rgba(26, 92, 58, 0.2), 0 0 40px rgba(26, 92, 58, 0.08)',
        'card': '0 4px 15px rgba(0, 0, 0, 0.4), 0 0 1px rgba(201, 168, 76, 0.2)',
      },
      keyframes: {
        'flip-card': {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'deal-card': {
          '0%': { transform: 'translateY(-80px) rotate(-10deg) scale(0.8)', opacity: '0' },
          '60%': { transform: 'translateY(5px) rotate(1deg) scale(1.02)', opacity: '1' },
          '100%': { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: '1' },
        },
        'chip-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-8px)' },
          '50%': { transform: 'translateY(-4px)' },
          '70%': { transform: 'translateY(-2px)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(201,168,76,0.3), 0 0 10px rgba(201,168,76,0.1)',
          },
          '50%': {
            boxShadow: '0 0 15px rgba(201,168,76,0.5), 0 0 30px rgba(201,168,76,0.2)',
          },
        },
        particle: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-50px) scale(0)', opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212,175,55,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(212,175,55,0.9)' },
        },
        'win-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(39,174,96,0.2)' },
        },
        'lose-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(192,57,43,0.2)' },
        },
        'card-3d-enter': {
          '0%': { transform: 'perspective(800px) rotateY(90deg) scale(0.7)', opacity: '0' },
          '60%': { transform: 'perspective(800px) rotateY(-8deg) scale(1.02)', opacity: '1' },
          '100%': { transform: 'perspective(800px) rotateY(0deg) scale(1)', opacity: '1' },
        },
        'slide-up-fade': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'gold-shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'scale-bounce': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'flip-card': 'flip-card 0.8s cubic-bezier(0.175,0.885,0.32,1.275)',
        'deal-card': 'deal-card 0.5s cubic-bezier(0.16,1,0.3,1)',
        'chip-bounce': 'chip-bounce 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        particle: 'particle 1s ease-out forwards',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'win-flash': 'win-flash 0.5s ease-in-out 3',
        'lose-flash': 'lose-flash 0.5s ease-in-out 3',
        'card-3d-enter': 'card-3d-enter 0.6s cubic-bezier(0.175,0.885,0.32,1.275) both',
        'slide-up-fade': 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'gold-shimmer': 'gold-shimmer 2s linear infinite',
        'scale-bounce': 'scale-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
