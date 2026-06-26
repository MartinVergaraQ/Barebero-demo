import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: {
    default: 'BarberTurn',
    template: '%s | BarberTurn',
  },

  description:
    'Reservas online, gestión de equipo y recordatorios automáticos para barberías.',

  applicationName: 'BarberTurn',

  icons: {
    icon: [
      {
        url: '/brand/barberturn-mark.png',
        type: 'image/png',
      },
    ],

    shortcut:
      '/brand/barberturn-mark.png',

    apple:
      '/brand/barberturn-mark.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f1115',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans">
        {children}

        <Toaster
          position="top-center"
          richColors
          closeButton
          expand
          toastOptions={{
            style: {
              background: '#171a21',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  )
}