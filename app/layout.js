import { ClerkProvider } from '@clerk/nextjs';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--f-display',
  display: 'swap',
});

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--f-body',
  display: 'swap',
});

export const metadata = {
  title: 'BookVerse — Your reading life, beautifully kept.',
  description:
    'A personal reading archive with a living constellation of your books, journals, and literary connections.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff7f8',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#a8234b',
          colorText: '#3a2028',
          borderRadius: '16px',
          fontFamily: 'var(--f-body), system-ui, sans-serif',
        },
      }}
    >
      <html lang="en" className={`${display.variable} ${body.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
