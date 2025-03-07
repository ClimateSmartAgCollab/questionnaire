'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import parse from 'html-react-parser'
import logo from '../../assets/logo.png'
import Footer from '../../Footer/footer'
import styles from './SubmissionReview.module.css'

const SubmissionReviewPage: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const router = useRouter()
  const parsedHtml = htmlContent ? parse(htmlContent) : null

  useEffect(() => {
    const storedHtml = sessionStorage.getItem('submissionHtml')
    if (storedHtml) {
      setHtmlContent(storedHtml)
    } else {
      router.push('/')
    }
  }, [router])

  if (htmlContent === null) {
    return (
      <div
        className={`${styles.container} mx-auto my-8 max-w-[800px] rounded border border-gray-300 bg-white shadow`}
      >
        <header
          className={`${styles.header} border-b border-gray-200 bg-gray-50 p-4`}
        >
          <div className='flex items-center'>
            <img
              src={logo.src}
              alt='Logo'
              className={`${styles.logo} mr-4 h-auto w-48`}
            />
            <h1 className='text-xl font-semibold text-gray-800'>
              Catalogue Metadata
            </h1>
          </div>
        </header>
        <main className={`${styles.main} p-4`}>
          <p>Loading submission...</p>
        </main>
      </div>
    )
  }

  return (
    <div
      className={`${styles.container} mx-auto my-8 max-w-[800px] rounded border border-gray-300 bg-white shadow`}
    >
      <header
        className={`${styles.header} border-b border-gray-200 bg-gray-50 p-4`}
      >
        <div className='flex items-center'>
          <img
            src={logo.src}
            alt='Logo'
            className={`${styles.logo} mr-4 h-auto w-48`}
          />
           <div className="w-px h-12 bg-gray-300 mx-4"></div>
          <h1 className='text-xl font-semibold text-gray-800'>
            Catalogue Metadata
          </h1>
        </div>
      </header>
      <main className={`${styles.main} break-words p-4`}>
        {/* The Tailwind classes ensure text wraps within the container */}
        <div className={`${styles.htmlContent} whitespace-normal break-words`}>
          {parsedHtml}
        </div>
        <button
          className={`${styles.button} mt-6 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700`}
          onClick={() => router.push('/')}
        >
          Back
        </button>
      </main>
      <footer
        className={`${styles.footer} border-t border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600`}
      >
        <Footer />
      </footer>
    </div>
  )
}

export default SubmissionReviewPage
