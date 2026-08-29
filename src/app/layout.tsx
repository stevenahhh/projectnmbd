import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: '팀플 원장 — 쓰기만 하면 기여가 남는 팀플 공간',
  description: '동료평가 칸 앞에서 카톡을 다시 올리지 마세요. 문서·자료·할 일·대화가 한 곳에, 기여도는 자동으로.',
  openGraph: {
    title: '팀플 원장 — 쓰기만 하면 기여가 남는 팀플 공간',
    description: '동료평가 칸 앞에서 카톡을 다시 올리지 마세요. 문서·자료·할 일·대화가 한 곳에, 기여도는 자동으로.',
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
