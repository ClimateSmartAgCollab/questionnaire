'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { parseJsonToFormStructure } from './parser'
import React from 'react'

// Parse steps dynamically
const parsedSteps = parseJsonToFormStructure()

// Define TypeScript types
interface Field {
  id: string
  labels: Record<string, Record<string, string>> // Multilingual labels
  options: Record<string, Record<string, string[]>> // Multilingual options
  type: string
  orientation?: 'vertical' | 'horizontal' // For `radio` and `dropdown`
  value?: string // Pre-selected value
  ref?: string // For references to other steps
}

interface Step {
  id: string
  names: Record<string, string> // Multilingual step names
  descriptions: Record<string, string> // Multilingual step descriptions
  fields: Field[]
  parent?: string | null
  children?: Step[]
}

// Build the step tree from flat data
function buildStepTree(steps: Step[]): Step[] {
  const stepMap: Record<string, Step> = {}
  const rootSteps: Step[] = []

  steps.forEach(step => {
    stepMap[step.id] = { ...step, children: [] }
  })

  steps.forEach(step => {
    step.fields
      .filter(field => field.type === 'reference' && field.ref)
      .forEach(field => {
        const child = stepMap[field.ref!]
        if (child) stepMap[step.id].children!.push(child)
      })

    if (!steps.some(s => s.fields.some(f => f.ref === step.id))) {
      rootSteps.push(stepMap[step.id])
    }
  })

  return rootSteps
}

// Recursive component to render navigation
const NavigationItem = React.memo(
  ({
    step,
    currentStep,
    visitedSteps,
    onNavigate,
    language
  }: {
    step: Step
    currentStep: number
    visitedSteps: Set<string>
    onNavigate: (index: number) => void
    language: string
  }) => {
    const stepIndex = parsedSteps.findIndex(s => s.id === step.id)

    return (
      <li>
        <button
          type='button'
          onClick={() => onNavigate(stepIndex)}
          className={`w-full rounded px-4 py-2 text-left ${
            currentStep === stepIndex
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
          aria-current={currentStep === stepIndex ? 'step' : undefined}
        >
          {step.names[language] || step.names['eng']}
        </button>

        {visitedSteps.has(step.id) && step.children!.length > 0 && (
          <ul className='ml-4 mt-2 space-y-2'>
            {step
              .children!.filter(child => visitedSteps.has(child.id))
              .map(child => (
                <NavigationItem
                  key={child.id}
                  step={child}
                  currentStep={currentStep}
                  visitedSteps={visitedSteps}
                  onNavigate={onNavigate}
                  language={language}
                />
              ))}
          </ul>
        )}
      </li>
    )
  }
)

export default function Form() {
  if (!parsedSteps || parsedSteps.length === 0) {
    return <div>Loading form structure...</div>
  }

  const [language, setLanguage] = useState('eng') // Default language
  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  )
  const [formData, setFormData] = useState<Record<string, any>>({})

  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps])

  const parentSteps = useMemo(
    () => parsedSteps.filter(step => !step.parent),
    [parsedSteps]
  )

  const onNavigate = useCallback(
    (index: number) => {
      setCurrentStep(index)
      setVisitedSteps(prev => {
        const updated = new Set(prev)
        updated.add(parsedSteps[index]?.id)
        return updated
      })
    },
    [parsedSteps]
  )

  const goToNextParent = useCallback(() => {
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === parsedSteps[currentStep]?.id
    )
    if (
      currentParentIndex >= 0 &&
      currentParentIndex < parentSteps.length - 1
    ) {
      const nextStepIndex = parsedSteps.findIndex(
        step => step.id === parentSteps[currentParentIndex + 1]?.id
      )
      onNavigate(nextStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  const goToPreviousParent = useCallback(() => {
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === parsedSteps[currentStep]?.id
    )
    if (currentParentIndex > 0) {
      const previousStepIndex = parsedSteps.findIndex(
        step => step.id === parentSteps[currentParentIndex - 1]?.id
      )
      onNavigate(previousStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  const validateField = useCallback(
    (field: Field, value: string): boolean => {
      const { options } = field

      // Conformance validation
      if (field.type === 'mandatory' && !value) {
        return false
      }

      // Entry Code validation
      if (options[language] && !options[language][field.id]?.includes(value)) {
        return false
      }

      return true
    },
    [language]
  )

  const finishHandler = useCallback(() => {
    const currentStepData: Record<string, any> = {}

    parsedSteps[currentStep]?.fields.forEach((field: Field) => {
      const input = document.querySelector(
        `[name="${field.id}"]`
      ) as HTMLInputElement | null

      if (
        field.type === 'textarea' ||
        field.type === 'DateTime' ||
        field.type === 'dropdown'
      ) {
        const value = input?.value || ''
        if (!validateField(field, value)) {
          console.warn(`Validation failed for field ${field.id}`)
        }
        currentStepData[field.id] = value
      } else if (field.type === 'radio') {
        const selectedRadio = document.querySelector(
          `input[name="${field.id}"]:checked`
        ) as HTMLInputElement | null
        const value = selectedRadio?.value || ''
        if (!validateField(field, value)) {
          console.warn(`Validation failed for field ${field.id}`)
        }
        currentStepData[field.id] = value
      } else if (field.type === 'select') {
        const value = input?.value || ''
        if (!validateField(field, value)) {
          console.warn(`Validation failed for field ${field.id}`)
        }
        currentStepData[field.id] = value
      }
    })

    setFormData(prevData => ({
      ...prevData,
      [parsedSteps[currentStep]?.id]: currentStepData
    }))

    console.log('Form Data:', formData)
    alert('Form submitted successfully!')
  }, [currentStep, parsedSteps, formData, validateField])

  const cancelHandler = useCallback(() => {
    const currentParent = parsedSteps.find(
      step => step.id === parsedSteps[currentStep]?.parent
    )

    if (currentParent) {
      const parentIndex = parsedSteps.findIndex(
        step => step.id === currentParent.id
      )
      setCurrentStep(parentIndex)
    } else {
      setCurrentStep(0)
    }
  }, [currentStep, parsedSteps])

  return (
    <section className='relative flex min-h-screen'>
      <div className='flex-1 p-8 pr-80'>
        <h1 className='mb-6 text-3xl font-bold'>Dynamic Form</h1>

        {/* Language Selector */}
        <div className='mb-6 flex items-center space-x-4'>
          <label
            htmlFor='language'
            className='text-sm font-medium text-gray-700'
          >
            Language:
          </label>
          <select
            id='language'
            value={language}
            onChange={e => setLanguage(e.target.value)} // Change the language dynamically
            className='block w-40 rounded border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          >
            <option value='eng'>English</option>
            <option value='fra'>French</option>
          </select>
        </div>

        {parsedSteps.map((step, index) =>
          currentStep === index ? (
            <motion.div
              key={step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className='mb-4 text-2xl font-semibold'>
                {step.names[language] || step.names['eng']}
              </h2>
              {step.descriptions[language] && (
                <p className='mb-4 text-gray-600'>
                  {step.descriptions[language]}
                </p>
              )}

              {step.fields.map((field: Field) => (
                <div key={field.id} className='mb-4'>
                  <label className='block text-sm font-medium'>
                    {field.labels[language][field.id] ||
                      field.labels['eng'][field.id]}
                  </label>

                  {/* Render field types */}
                  {field.type === 'textarea' && (
                    <textarea
                      name={field.id}
                      defaultValue={field.value || ''}
                      className='w-full rounded border p-2'
                    />
                  )}
                  {field.type === 'DateTime' && (
                    <input
                      name={field.id}
                      type='datetime-local'
                      defaultValue={field.value || ''}
                      className='w-full rounded border p-2'
                    />
                  )}
                  {field.type === 'radio' && (
                    <div
                      className={`flex ${
                        field.orientation === 'vertical'
                          ? 'flex-col'
                          : 'flex-row space-x-4'
                      }`}
                    >
                      {field.options[language]?.[field.id]?.map((option, i) => (
                        <label key={i} className='flex items-center space-x-2'>
                          <input
                            type='radio'
                            name={field.id}
                            value={option}
                            defaultChecked={field.value === option}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === 'reference' && field.ref && (
                    <button
                      type='button'
                      onClick={() => {
                        const targetIndex = parsedSteps.findIndex(
                          s => s.id === field.ref
                        )
                        if (targetIndex >= 0) {
                          onNavigate(targetIndex)
                        } else {
                          console.warn(
                            `Reference step not found for field: ${field.id}`
                          )
                        }
                      }}
                      className='mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                    >
                      Go to{' '}
                      {parsedSteps.find(s => s.id === field.ref)?.names[
                        language
                      ] || 'Child Step'}
                    </button>
                  )}

                  {field.type === 'select' && (
                    <select
                      name={field.id}
                      defaultValue={field.value || ''}
                      className='w-full rounded border p-2'
                    >
                      {(field.options[language]?.[field.id] || []).map(
                        (option, i) => (
                          <option key={i} value={option}>
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {field.type === 'dropdown' && (
                    <select
                      name={field.id}
                      defaultValue={field.value || ''}
                      className='w-full rounded border p-2'
                    >
                      {field.options[language]?.[field.id]?.map((option, i) => (
                        <option key={i} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <div className='mt-8 flex justify-between'>
                {parentSteps.some(p => p.id === step.id) && (
                  <>
                    <button
                      type='button'
                      onClick={goToPreviousParent}
                      className='rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400'
                      disabled={
                        parentSteps.findIndex(p => p.id === step.id) === 0
                      }
                    >
                      Back
                    </button>
                    <button
                      type='button'
                      onClick={goToNextParent}
                      className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                      disabled={
                        parentSteps.findIndex(p => p.id === step.id) ===
                        parentSteps.length - 1
                      }
                    >
                      Next
                    </button>
                  </>
                )}
                {!parentSteps.some(p => p.id === step.id) && (
                  <>
                    <button
                      type='button'
                      onClick={cancelHandler}
                      className='rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={finishHandler}
                      className='rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600'
                    >
                      Finish
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : null
        )}
      </div>

      <nav className='fixed bottom-0 right-0 top-0 hidden w-72 overflow-y-auto bg-gray-100 p-6 shadow-md lg:block'>
        <h2 className='mb-4 text-xl font-semibold'>Pages</h2>
        <ul className='space-y-4'>
          {stepTree.map(step => (
            <NavigationItem
              key={step.id}
              step={step}
              currentStep={currentStep}
              visitedSteps={visitedSteps}
              onNavigate={onNavigate}
              language={language}
            />
          ))}
        </ul>
      </nav>
    </section>
  )
}
