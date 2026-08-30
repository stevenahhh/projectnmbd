import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
/** 브랜드 표기 전용 — 너비 축이 있어 실제로 좁혀 쓸 수 있는 세리프다. */
const wordmark = Noto_Serif_Display({ variable: '--font-wordmark', subsets: ['latin'], axes: ['wdth'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Dibs — 팀플에서 내 몫이 그대로 남는 공간',
  description: '문서·자료·할 일·대화를 한 곳에서. 누가 얼마나 했는지는 자동으로 정리됩니다.',
  openGraph: {
    title: 'Dibs — 팀플에서 내 몫이 그대로 남는 공간',
    description: '문서·자료·할 일·대화를 한 곳에서. 누가 얼마나 했는지는 자동으로 정리됩니다.',
    images: ['/og.png'],
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} ${wordmark.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
