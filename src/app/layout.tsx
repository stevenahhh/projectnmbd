import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: '팀플 — 팀 프로젝트를 한 곳에서',
  description: '문서·자료·할 일·대화를 한 곳에서. 누가 무엇을 했는지는 자동으로 정리됩니다.',
  openGraph: {
    title: '팀플 — 팀 프로젝트를 한 곳에서',
    description: '문서·자료·할 일·대화를 한 곳에서. 누가 무엇을 했는지는 자동으로 정리됩니다.',
    images: ['/og.png'],
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={geistSans.variable + ' ' + geistMono.variable + ' antialiased'}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
