// src/components/Form/NavigationItem.tsx
import React from 'react'
import { Step } from '../type'
import { motion } from 'framer-motion'

interface NavigationItemProps {
  step: Step
  currentStep: number
  visitedSteps: Set<string>
  onNavigate: (index: number) => void
  language: string
  // ccess all steps to find the index
  // Usually you'd pass a reference to the entire `parsedSteps` or a function
  // that can resolve step indices. For simplicity, we can pass a function `getIndex`.
  getIndex: (stepId: string) => number
}

// NavigationItem Component for Recursive Parent-Child Navigation
export const NavigationItem = React.memo(function NavigationItem({
  step,
  currentStep,
  visitedSteps,
  onNavigate,
  language,
  getIndex,
}: NavigationItemProps) {
  const stepIndex = getIndex(step.id)

  return (
    <li>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => onNavigate(stepIndex)}
        className={`w-full rounded px-4 py-2 text-left ${
          currentStep === stepIndex
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
        aria-current={currentStep === stepIndex ? 'step' : undefined}
      >
        {step.names[language] || step.names['eng']}
      </motion.button>

      {visitedSteps.has(step.id) && step.children && step.children.length > 0 && (
        <ul className="ml-4 mt-2 space-y-2">
          {step.children
            .filter(child => visitedSteps.has(child.id))
            .map(child => (
              <NavigationItem
                key={child.id}
                step={child}
                currentStep={currentStep}
                visitedSteps={visitedSteps}
                onNavigate={onNavigate}
                language={language}
                getIndex={getIndex}
              />
            ))}
        </ul>
      )}
    </li>
  )
})
