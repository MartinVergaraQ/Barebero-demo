import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Barbero Demo',
  description: 'Demo de barbería con reservas online',
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          expand
          toastOptions={{
            style: {
              background: '#f8f5ee',
              color: '#1f1f1f',
              border: '1px solid #e7dfcf',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  )
}