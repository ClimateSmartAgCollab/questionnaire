// src/components/Form/Form.tsx
'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { parseJsonToFormStructure } from '../parser'
import { Field, Page_parsed } from '../type'
import { useDynamicForm } from './hooks/useDynamicForm'
import { NavigationItem } from '../Form/NavigationItem'
import styles from './Form.module.css'
import Footer from '../../Footer/footer'
import { useFormData } from '../Form/context/FormDataContext'

const parsedSteps = parseJsonToFormStructure()
// console.log('Parsed Steps:', parsedSteps)

export default function Form() {
  const {
    language,
    setLanguage,
    currentStep,
    visitedSteps,
    formData,
    stepTree,
    parentSteps,
    onNavigate,
    goToNextParent,
    goToPreviousParent,
    finishHandler,
    cancelHandler,
    isParentStep,
    setCurrentChildId,
    createNewChild,
    editExistingChild
  } = useDynamicForm(parsedSteps)

  // Child data from context
  const { childrenData } = useFormData()

  if (!parsedSteps || parsedSteps.length === 0) {
    return <div>Loading form structure...</div>
  }

  // For NavigationItem: pass a function to get the step index by ID
  const getIndex = (stepId: string) => {
    return parsedSteps.findIndex(s => s.id === stepId)
  }

  return (
    <section className={styles.formLayout}>
      {/* Main content area */}

      <header className={styles.header}>
        <h1 className='text-3xl font-bold'>Questionnaire</h1>
        <div className='flex items-center space-x-4'>
          <label
            htmlFor='language'
            className='text-sm font-medium text-gray-700'
          >
            Language:
          </label>
          <select
            id='language'
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className='block w-40 rounded 
            border border-gray-300 bg-white px-3 py-2 text-sm
            font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none
            focus:ring-1 focus:ring-blue-500'
          >
            <option value='eng'>English</option>
            <option value='fra'>French</option>
          </select>
        </div>
      </header>
      <div className={styles.mainContent}>
        {/* Render the current step's content */}
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

              {/* For each page -> section -> field */}
              {step.pages.map((page: Page_parsed) => (
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

                      {section.fields.map((field: Field) => {
                        const fieldValue =
                          formData[step.id]?.[field.id] ?? field.value ?? ''
                        return (
                          <div key={field.id} className='mb-4'>
                            {/* Field Label */}
                            <label className='mb-1 block text-sm font-medium'>
                              {field.labels[language]?.[field.id] ||
                                field.labels['eng']?.[field.id]}
                            </label>

                            {/* Different Field Types */}
                            {field.type === 'textarea' && (
                              <textarea
                                name={field.id}
                                defaultValue={fieldValue}
                                className='w-full rounded border p-2'
                              />
                            )}
                            {field.type === 'DateTime' && (
                              <input
                                name={field.id}
                                type='date'
                                defaultValue={fieldValue}
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
                                {field.options[language]?.[field.id]?.map(
                                  (option, i) => (
                                    <label
                                      key={i}
                                      className='flex items-center space-x-2'
                                    >
                                      <input
                                        type='radio'
                                        name={field.id}
                                        value={option}
                                        defaultChecked={fieldValue === option}
                                      />
                                      <span>{option}</span>
                                    </label>
                                  )
                                )}
                              </div>
                            )}
                            {(field.type === 'select' ||
                              field.type === 'dropdown') && (
                              <select
                                name={field.id}
                                defaultValue={fieldValue}
                                className='w-full rounded border p-2'
                              >
                                {field.options[language]?.[field.id]?.map(
                                  (option, i) => (
                                    <option key={i} value={option}>
                                      {option}
                                    </option>
                                  )
                                )}
                              </select>
                            )}

                            {/* Reference Field → navigate to child */}
                            {field.type === 'reference' && field.ref && (
                              <div>
                                <button
                                  type='button'
                                  onClick={() => {
                                    // Create a new child record in context
                                    const newChild = createNewChild(field.ref)
                                    // Mark that we are editing this brand-new child
                                    setCurrentChildId(newChild.id)

                                    // Navigate to the child step
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
                                  {parsedSteps.find(s => s.id === field.ref)
                                    ?.names[language] || 'Child Step'}
                                </button>

                                {/* Display child data if it exists in formData */}
                                {formData[field.ref] && (
                                  <div className='mt-4 rounded border bg-gray-100 p-4'>
                                    <h4 className='text-lg font-semibold'>
                                      {
                                        parsedSteps.find(
                                          s => s.id === field.ref
                                        )?.names[language]
                                      }
                                    </h4>
                                    <ul>
                                      {childrenData
                                        .filter(
                                          child => child.stepId === field.ref
                                        )
                                        .map(child => (
                                          <li
                                            key={child.id}
                                            className='flex items-center space-x-2'
                                          >
                                            <span>
                                              {/* Display child name or some field */}
                                              {child.data[
                                                Object.keys(child.data)[0]
                                              ] || '(No Name)'}
                                            </span>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                // Put us into "edit mode"
                                                setCurrentChildId(child.id)
                                                // Navigate to that child’s step
                                                const idx =
                                                  parsedSteps.findIndex(
                                                    s => s.id === child.stepId
                                                  )
                                                if (idx >= 0) {
                                                  onNavigate(idx)
                                                }
                                              }}
                                              className='text-sm text-blue-700 underline'
                                            >
                                              Edit
                                            </button>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
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
      <nav className={styles.sidebar}>
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
              getIndex={getIndex}
            />
          ))}
        </ul>
      </nav>
      {/* Footer */}
      <div className={styles.footer}>
        <Footer currentPage={currentStep} />
        <p className='text-center text-gray-600'>
          © 2025 University of Guelph. All rights reserved.
        </p>
      </div>
    </section>
  )
}
