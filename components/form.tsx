'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import React from 'react'
import { parseJsonToFormStructure } from './parser'

const parsedSteps = parseJsonToFormStructure()

interface Field {
  id: string
  labels: Record<string, Record<string, string>> // Multilingual labels
  options: Record<string, Record<string, string[]>> // Multilingual options
  type: string
  orientation?: 'vertical' | 'horizontal'
  value?: string
  ref?: string
}

interface Section {
  sectionKey: string
  sectionLabel: Record<string, string>
  fields: Field[]
}

interface Page {
  pageKey: string
  pageLabel: Record<string, string>
  sections: Section[]
  captureBase: string
}

export interface Step {
  id: string
  names: Record<string, string>
  descriptions: Record<string, string>
  parent?: string | null
  pages: Page[]
  children?: Step[] // used by the buildStepTree if you want a hierarchical nav
}

// -----------------------------------------------------------------------------
// 1. Build Step Tree Based on 'reference' Fields
// -----------------------------------------------------------------------------
function buildStepTree(steps: Step[]): Step[] {
  const stepMap: Record<string, Step> = {}
  const rootSteps: Step[] = []

  // Initialize the map
  steps.forEach(step => {
    stepMap[step.id] = { ...step, children: [] }
  })

  // Populate children based on 'reference' fields
  steps.forEach(step => {
    step.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields
          .filter(field => field.type === 'reference' && field.ref)
          .forEach(field => {
            const child = stepMap[field.ref!]
            if (child) stepMap[step.id].children!.push(child)
          })
      })
    })
  })

  // Identify root steps (ones not referenced by any other step)
  steps.forEach(step => {
    const isReferenced = steps.some(s =>
      s.pages.some(page =>
        page.sections.some(section =>
          section.fields.some(f => f.ref === step.id)
        )
      )
    )
    if (!isReferenced) {
      rootSteps.push(stepMap[step.id])
    }
  })

  return rootSteps
}

// -----------------------------------------------------------------------------
// 2. Determine Which Steps Are "Parents" and Which Are "Children"
//    - Parent steps = NOT referenced by anyone (root steps).
//    - Child steps  = referenced by another step's 'reference' field.
// -----------------------------------------------------------------------------
function getParentSteps(steps: Step[]): Step[] {
  // Steps not referenced by anyone
  const rootStepIds = new Set<string>(steps.map(s => s.id))

  // Remove from rootStepIds any step that is referenced
  steps.forEach(step => {
    step.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'reference' && field.ref) {
            // This step is a child, so it's not a parent
            rootStepIds.delete(field.ref)
          }
        })
      })
    })
  })

  return steps.filter(step => rootStepIds.has(step.id))
}

function getReferencingStep(childId: string, steps: Step[]): Step | undefined {
  return steps.find(step =>
    step.pages.some(page =>
      page.sections.some(section =>
        section.fields.some(field => field.ref === childId)
      )
    )
  )
}
// -----------------------------------------------------------------------------
// 3. The Main Form Component
// -----------------------------------------------------------------------------
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

  // Build the step tree (optional) for your nav
  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps])

  // Determine which steps are parents
  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps])

  // Function to navigate by array index in 'parsedSteps'
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

  // Go to next parent in the parentSteps array
  const goToNextParent = useCallback(() => {
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(step => step.id === currentStepId)
    if (currentParentIndex >= 0 && currentParentIndex < parentSteps.length - 1) {
      const nextParentId = parentSteps[currentParentIndex + 1]?.id
      const nextStepIndex = parsedSteps.findIndex(s => s.id === nextParentId)
      if (nextStepIndex >= 0) onNavigate(nextStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  // Go to previous parent in the parentSteps array
  const goToPreviousParent = useCallback(() => {
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(step => step.id === currentStepId)
    if (currentParentIndex > 0) {
      const previousParentId = parentSteps[currentParentIndex - 1]?.id
      const previousStepIndex = parsedSteps.findIndex(s => s.id === previousParentId)
      if (previousStepIndex >= 0) onNavigate(previousStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate])

  // Simple validation example
  const validateField = useCallback(
    (field: Field, value: string): boolean => {
      // If you have advanced validation, put it here...
      // E.g. if (field.type === 'mandatory' && !value) return false;

      // If the field has enumerated options, ensure value is in that list
      if (field.options[language] && field.options[language][field.id]) {
        const allowed = field.options[language][field.id]
        if (allowed.length > 0 && !allowed.includes(value)) return false
      }
      return true
    },
    [language]
  )

  // Finish handling for a child step
  const finishHandler = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    const currentStepData: Record<string, any> = {}

    // Collect data from pages → sections → fields
    stepObj.pages.forEach((page: Page) => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          let value = ''
          if (field.type === 'radio') {
            const selectedRadio = document.querySelector(
              `input[name="${field.id}"]:checked`
            ) as HTMLInputElement | null
            value = selectedRadio?.value || ''
          } else {
            const input = document.querySelector(
              `[name="${field.id}"]`
            ) as HTMLInputElement | HTMLTextAreaElement | null
            value = input?.value || ''
          }

          // Validate
          if (!validateField(field, value)) {
            console.warn(`Validation failed for field ${field.id}`)
          }
          currentStepData[field.id] = value
        })
      })
    })

    // Update global form data
    setFormData(prevData => ({
      ...prevData,
      [stepObj.id]: currentStepData
    }))

    const referencingStep = getReferencingStep(stepObj.id, parsedSteps)
    // If found, navigate back to that referencing step
    if (referencingStep) {
      const referencingStepIndex = parsedSteps.findIndex(
        s => s.id === referencingStep.id
      )
      setCurrentStep(referencingStepIndex)
    } else {
      // 6. Otherwise, default to the first step or some fallback
      setCurrentStep(0)
    }
    // In your current structure, 'parent' is always null, so the "official" parent
    // logic won't work by default. If you do want to nest data, you'd do it here:
    // If there's a parent, store data nested under the parent's ID.
    // Example:
    // const currentParent = parsedSteps.find(s => s.id === stepObj.parent)
    // if (currentParent) { ... }

    // For now, let's just log everything and go to the first step after finishing
    console.log('Updated Form Data:', {
      ...formData,
      [stepObj.id]: currentStepData
    })
  }, [currentStep, parsedSteps, formData, validateField])

  // Cancel → also go back to first step or do custom logic
  const cancelHandler = useCallback(() => {
    setCurrentStep(0)
  }, [])

  // Helper to check if a step is a "parent step"
  const isParentStep = (step: Step) => parentSteps.some(p => p.id === step.id)

  return (
    <section className='relative flex min-h-screen'>
      {/* Main content area */}
      <div className='flex-1 p-8 pr-80'>
        <h1 className='mb-6 text-3xl font-bold'>Dynamic Form</h1>

        {/* Language Selector */}
        <div className='mb-6 flex items-center space-x-4'>
          <label htmlFor='language' className='text-sm font-medium text-gray-700'>
            Language:
          </label>
          <select
            id='language'
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className='block w-40 rounded border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          >
            <option value='eng'>English</option>
            <option value='fra'>French</option>
          </select>
        </div>

        {/* Render the current step's content */}
        {parsedSteps.map((step, index) =>
          currentStep === index ? (
            <motion.div key={step.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className='mb-4 text-2xl font-semibold'>
                {step.names[language] || step.names['eng']}
              </h2>
              {step.descriptions[language] && (
                <p className='mb-4 text-gray-600'>{step.descriptions[language]}</p>
              )}

              {/* For each page → section → field */}
              {step.pages.map((page: Page) => (
                <div key={page.pageKey} className='mb-8'>
                  {page.pageLabel[language] && (
                    <h3 className='text-xl font-semibold'>
                      {page.pageLabel[language] || page.pageLabel['eng']}
                    </h3>
                  )}
                  {page.sections.map(section => (
                    <div key={section.sectionKey} className='mb-6'>
                      {section.sectionLabel[language] && (
                        <h4 className='text-lg font-medium'>
                          {section.sectionLabel[language] ||
                            section.sectionLabel['eng']}
                        </h4>
                      )}

                      {section.fields.map((field: Field) => (
                        <div key={field.id} className='mb-4'>
                          {/* Field Label */}
                          <label className='block text-sm font-medium mb-1'>
                            {field.labels[language]?.[field.id] ||
                              field.labels['eng']?.[field.id]}
                          </label>

                          {/* Different Field Types */}
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
                          {(field.type === 'select' || field.type === 'dropdown') && (
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

                          {/* Reference Field → navigate to child */}
                          {field.type === 'reference' && field.ref && (
                            <div>
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
                                +{' '}
                                {parsedSteps.find(s => s.id === field.ref)?.names[language] ||
                                  'Child Step'}
                              </button>

                              {/* Display child data if it exists in formData */}
                              {formData[field.ref] && (
                                <div className='mt-4 rounded border bg-gray-100 p-4'>
                                  <h4 className='text-lg font-semibold'>
                                    {
                                      parsedSteps.find(s => s.id === field.ref)?.names[
                                        language
                                      ]
                                    }
                                  </h4>
                                  <ul className='mt-2 list-disc space-y-1 pl-4 text-gray-700'>
                                    {Object.entries(formData[field.ref]).map(
                                      ([key, val]) => (
                                        <li key={key}>
                                          <strong>{key}:</strong> {String(val)}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* Bottom Navigation Buttons */}
              <div className='mt-8 flex justify-between'>
                {isParentStep(step) ? (
                  // If it's a parent step
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
                ) : (
                  // If it's a child (referenced) step
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

      {/* Sidebar Navigation using the step tree */}
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

// -----------------------------------------------------------------------------
// 4. NavigationItem Component for Recursive Parent-Child Navigation
// -----------------------------------------------------------------------------
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
    // Find the top-level index of this step in parsedSteps
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

        {/* If the user visited this step and it has children, show them if also visited */}
        {visitedSteps.has(step.id) && step.children && step.children.length > 0 && (
          <ul className='ml-4 mt-2 space-y-2'>
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
                />
              ))}
          </ul>
        )}
      </li>
    )
  }
)
