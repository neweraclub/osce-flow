import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Orbitron, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { CookieConsent } from '@/components/cookie-consent'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/context/ToastContext'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  title: 'NEW ERA live ecos platform (NE-ECOS)',
  description: 'A calm, connected workspace for medical assessment, examination, and administration.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background transition-colors duration-200" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${orbitron.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <CookieConsent />
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
