// src/components/Form/NavigationItem.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { Step } from '../type'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

interface NavigationItemProps {
  step: Step
  currentStep: number
  currentPageIndex: number
  onNavigate: (stepIndex: number, pageIndex?: number) => void
  language: string
  getIndex: (stepId: string) => number
  expandedStep: string | null
  setExpandedStep: (stepId: string | null) => void
}

export const NavigationItem = React.memo(function NavigationItem({
  step,
  currentStep,
  currentPageIndex,
  onNavigate,
  language,
  getIndex,
  expandedStep,
  setExpandedStep
}: NavigationItemProps) {
  const stepIndex = getIndex(step.id)

  const isExpanded = expandedStep === step.id
  const isActiveStep = currentStep === stepIndex

  const toggleExpand = () => {
    setExpandedStep(isExpanded ? null : step.id)
  }

  const stepButtonClass = isExpanded
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-800'

  return (
    <li className='mb-2'>
      {/* STEP BUTTON */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type='button'
        onClick={toggleExpand}
        className={`flex w-full items-center justify-between rounded px-4 py-2 text-left transition-all ${stepButtonClass}`}
      >
        <span>{step.names[language] || step.names['eng']}</span>
        {step.pages.length > 1 && (
          <motion.div
            animate={{ rotate: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isExpanded ? (
              <FiChevronDown size={18} />
            ) : (
              <FiChevronRight size={18} />
            )}
          </motion.div>
        )}
      </motion.button>

      {/* PAGES (expanded if user clicked the step) */}
      {isExpanded && (
        <ul className='ml-4 mt-2 space-y-1'>
          {step.pages.map((page, pageIndex) => {
            const isActivePage = isActiveStep && currentPageIndex === pageIndex

            return (
              <motion.li
                key={page.pageKey}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  type='button'
                  onClick={() => onNavigate(stepIndex, pageIndex)}
                  className={`w-full rounded px-4 py-2 text-left ${
                    isActivePage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {page.pageLabel[language] || page.pageLabel['eng']}
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}
    </li>
  )
})
