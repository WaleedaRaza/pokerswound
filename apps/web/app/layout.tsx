import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Entropoker - Cryptographically Secure Poker',
  description: 'Real-time multiplayer Texas Hold\'em poker with entropy-secure shuffling and provable fairness',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-poker-green to-poker-black">
          {children}
        </div>
      </body>
    </html>
  )
} 