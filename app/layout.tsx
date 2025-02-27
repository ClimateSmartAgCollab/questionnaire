import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { FormDataProvider } from '../components/Form/context/FormDataContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Questionnaire',
  description: 'A multi-step form using OCA package',
  icons: {
    icon: './favicon.ico',
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='description' content={metadata.description ?? ''} />
        <title>{String(metadata.title) ?? ''}</title>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <FormDataProvider>{children}</FormDataProvider>
      </body>
    </html>
  )
}
