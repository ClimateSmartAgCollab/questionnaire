// src/components/Form/Form.tsx
'use client'

import { motion } from 'framer-motion'
import { parseJsonToFormStructure } from '../parser'
import { Field, Step } from '../type'
import { useDynamicForm, isValid__UTF8 } from './hooks/useDynamicForm'
import { NavigationItem } from '../Form/NavigationItem'
import DateTimeField from '../Form/DateTimeField'
import styles from './Form.module.css'
import Footer from '../../Footer/footer'
import { useFormData } from '../Form/context/FormDataContext'


/**
 * Extracts all referenced ids from the pages/sections/fields of a step.
 */
const extractRefs = (step: Step): string[] => {
  const refs: string[] = [];
  if (step.pages && Array.isArray(step.pages)) {
    step.pages.forEach(page => {
      if (page.sections && Array.isArray(page.sections)) {
        page.sections.forEach(section => {
          if (section.fields && Array.isArray(section.fields)) {
            section.fields.forEach((field: any) => {
              if (field.ref) {
                refs.push(field.ref);
              }
            });
          }
        });
      }
    });
  }
  return refs;
};


export const sortStepsByReferences = (steps: Step[]): Step[] => {
  const stepsMap = new Map<string, Step>(steps.map(step => [step.id, step]));

  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  steps.forEach(step => {
    graph[step.id] = [];
    inDegree[step.id] = 0;
  });

  // Build graph edges: for each step, if any field inside it references another step,
  // then add an edge from the current step (parent) to the referenced step (child).
  steps.forEach(step => {
    const refs = extractRefs(step);
    refs.forEach(refId => {
      if (stepsMap.has(refId)) {
        graph[step.id].push(refId);
        inDegree[refId] = (inDegree[refId] || 0) + 1;
      } else {
        console.warn(`Referenced step with id "${refId}" not found for step "${step.id}"`);
      }
    });
  });

  // Kahn’s algorithm: start with nodes that have no incoming edges.
  // We force the root (first step in the original array) to be first (if possible).
  const queue: string[] = [];
  const rootId = steps[0].id;
  if (inDegree[rootId] === 0) {
    queue.push(rootId);
  }
  // Add the rest of the nodes with zero in-degree (but avoid duplicating the root).
  steps.forEach(step => {
    if (step.id !== rootId && inDegree[step.id] === 0) {
      queue.push(step.id);
    }
  });

  const sortedIds: string[] = [];
  while (queue.length) {
    const currentId = queue.shift()!;
    sortedIds.push(currentId);

    for (const neighbor of graph[currentId]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedIds.length !== steps.length) {
    console.warn('Cycle detected or missing nodes. Returning unsorted steps.');
    return steps;
  }

  return sortedIds.map(id => stepsMap.get(id)!);
};

const unsortedSteps = parseJsonToFormStructure();
const parsedSteps = sortStepsByReferences(unsortedSteps);
console.log('Sorted Steps:', parsedSteps);



export default function Form() {
  const {
    language,
    setLanguage,
    currentStep,
    visitedSteps,
    formData,
    setFormData,
    parentSteps,
    onNavigate,
    finishHandler,
    cancelHandler,
    isParentStep,
    setCurrentChildId,
    createNewChild,
    pageIndexByStep,
    expandedStep,
    setExpandedStep,
    handleNavigate,
    handleNextPage,
    handlePreviousPage,
    isVeryLastPageOfLastStep,
    currentPage,
    isLastPageOfThisStep,
    isFirstPageOfThisStep,
    step,
    saveCurrentPageData,
    fieldErrors,
    handleFieldChange,
    registerFieldRef,
    stepTree
  } = useDynamicForm(parsedSteps)

  console.log("step tree", stepTree)
  
  const { childrenData } = useFormData()

  if (!parsedSteps || parsedSteps.length === 0) {
    return <div>Loading form structure...</div>
  }

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

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Render the current step's content */}
        {currentPage ? (
          <motion.div
            key={currentPage.pageKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Page Title */}
            {currentPage.pageLabel[language] && (
              <h2 className='mb-4 text-2xl font-semibold'>
                {currentPage.pageLabel[language] ||
                  currentPage.pageLabel['eng']}
              </h2>
            )}
            {/* Sections */}
            {currentPage.sections.map(section => (
              <div key={section.sectionKey} className='mb-8 bg-gray-50 p-4'>
                {section.sectionLabel[language] && (
                  <h3 className='mb-2 text-xl font-medium'>
                    {section.sectionLabel[language] ||
                      section.sectionLabel['eng']}
                  </h3>
                )}

                {/* Fields */}
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
                          ref={el => registerFieldRef(field.id, el)}
                          onBlur={e => {
                            handleFieldChange(field, e.target.value)
                          }}
                          onPaste={e => {
                            const pastedText = e.clipboardData.getData('text')
                            if (!isValid__UTF8(pastedText)) {
                              e.preventDefault()
                              alert(
                                'Pasted text contains invalid characters. Please use UTF-8 text only.'
                              )
                            }
                          }}
                        />
                      )}
                      {field.type === 'DateTime' && (
                        <DateTimeField
                          field={field}
                          format={field.validation.format || 'defaultFormat'}
                          fieldValue={fieldValue}
                          registerFieldRef={registerFieldRef}
                          handleFieldChange={handleFieldChange}
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
                          {Object.entries(field.options[language] || {}).map(
                            ([optionKey, optionLabel]) => (
                              <label
                                key={optionKey}
                                className='flex items-center space-x-2'
                              >
                                <input
                                  type='radio'
                                  name={field.id}
                                  value={optionKey}
                                  // Compare the field value with the option key
                                  defaultChecked={fieldValue === optionKey}
                                  ref={el => registerFieldRef(field.id, el)}
                                  onBlur={() => {
                                    handleFieldChange(field, optionKey)
                                    saveCurrentPageData()
                                  }}
                                />
                                <span>{optionLabel}</span>
                              </label>
                            )
                          )}
                        </div>
                      )}

                      {(field.type === 'select' ||
                        field.type === 'dropdown') && (
                        <div>
                          {/* Selected Options Display as Removable Tags */}
                          <div className='mb-4 flex flex-wrap gap-2'>
                            {Array.isArray(formData[step.id]?.[field.id]) &&
                            formData[step.id][field.id].length > 0 ? (
                              formData[step.id][field.id].map(
                                (optionKey: string) => (
                                  <span
                                    key={optionKey}
                                    className='flex items-center rounded bg-blue-100 px-3 py-1 text-sm text-blue-800'
                                  >
                                    {/* Map the stored option key back to its label */}
                                    {field.options[language][optionKey] ||
                                      optionKey}
                                    <button
                                      type='button'
                                      className='ml-2 text-red-500 hover:text-red-700'
                                      onClick={() => {
                                        // Remove this specific option
                                        const updatedOptions = formData[
                                          step.id
                                        ][field.id].filter(
                                          (selected: string) =>
                                            selected !== optionKey
                                        )

                                        setFormData(prev => ({
                                          ...prev,
                                          [step.id]: {
                                            ...(prev[step.id] || {}),
                                            [field.id]: updatedOptions
                                          }
                                        }))
                                      }}
                                      aria-label={`Remove ${field.options[language][optionKey] || optionKey}`}
                                    >
                                      x
                                    </button>
                                  </span>
                                )
                              )
                            ) : (
                              <p className='text-sm text-gray-500'>
                                No options selected.
                              </p>
                            )}
                          </div>

                          {/* Multi-Select Dropdown */}
                          <select
                            name={field.id}
                            multiple
                            className='w-full rounded border p-2'
                            value={formData[step.id]?.[field.id] || []}
                            ref={el => registerFieldRef(field.id, el)}
                            onChange={e => {
                              const selectedOptions = Array.from(
                                e.target.selectedOptions,
                                option => option.value
                              )

                              const min =
                                field.validation?.cardinality?.min || 0
                              const max =
                                field.validation?.cardinality?.max || Infinity

                              if (selectedOptions.length < min) {
                                alert(
                                  `You must select at least ${min} options.`
                                )
                                return
                              }
                              if (selectedOptions.length > max) {
                                alert(`You can select at most ${max} options.`)
                                return
                              }

                              saveCurrentPageData()

                              // Update selected options with the option keys
                              setFormData(prev => ({
                                ...prev,
                                [step.id]: {
                                  ...(prev[step.id] || {}),
                                  [field.id]: selectedOptions
                                }
                              }))
                            }}
                            onBlur={e => {
                              saveCurrentPageData()
                              const selectedKeys = Array.from(
                                e.target.selectedOptions,
                                option => option.value
                              )
                              handleFieldChange(field, selectedKeys)
                            }}
                          >
                            {Object.entries(field.options[language] || {}).map(
                              ([optionKey, optionLabel]) => (
                                <option key={optionKey} value={optionKey}>
                                  {optionLabel}
                                </option>
                              )
                            )}
                          </select>

                          {/* Clear Selections Button */}
                          {formData[step.id]?.[field.id]?.length > 0 && (
                            <button
                              className='mt-2 rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600'
                              onClick={() => {
                                saveCurrentPageData()
                                setFormData(prev => ({
                                  ...prev,
                                  [step.id]: {
                                    ...(prev[step.id] || {}),
                                    [field.id]: []
                                  }
                                }))
                              }}
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reference Field → navigate to child */}
                      {field.type === 'reference' && field.ref && (
                        <div>
                          <button
                            type='button'
                            onClick={() => {
                              // Create a new child record in context
                              const newChild = createNewChild(
                                field.id,
                                field.ref
                              )
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
                              scrollTo(0, 0)
                            }}
                            className='mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                          >
                            +{' '}
                            {parsedSteps.find(s => s.id === field.ref)?.names[
                              language
                            ] || 'Child Step'}
                          </button>

                          {/* Display child data if it exists in formData */}
                          {formData[field.ref] && (
                            <div className='mt-4 rounded border bg-gray-100 p-4'>
                              <h4 className='text-lg font-semibold'>
                                {
                                  parsedSteps.find(s => s.id === field.ref)
                                    ?.names[language]
                                }
                              </h4>
                              <ul>
                                {childrenData
                                  .filter(
                                    child =>
                                      child.stepId === field.ref &&
                                      child.parentId === field.id
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
                                          const idx = parsedSteps.findIndex(
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

                      {/* Show Validation Errors */}
                      {fieldErrors[field.id] && (
                        <div className='mt-1 text-sm text-red-600'>
                          {fieldErrors[field.id]}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Navigation Buttons */}
            {isParentStep(step) ? (
              // PARENT STEP => Next/Back, with Submit on the *very* last page
              <div className='mt-8 flex items-center space-x-4'>
                <button
                  type='button'
                  onClick={() => {
                    handlePreviousPage()
                    scrollTo(0, 0)
                  }}
                  className='rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400'
                  disabled={
                    parentSteps.findIndex(p => p.id === step.id) === 0 &&
                    isFirstPageOfThisStep
                  }
                >
                  Back
                </button>

                {isVeryLastPageOfLastStep ? (
                  <button
                    type='button'
                    onClick={() => {
                      alert('Submit clicked (no-op)')
                    }}
                    className='rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600'
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      handleNextPage()
                      scrollTo(0, 0)
                    }}
                    className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                  >
                    Next
                  </button>
                )}
              </div>
            ) : (
              <>
                {!isLastPageOfThisStep ? (
                  <div className='mt-8 flex items-center space-x-4'>
                    {/* Back only if not first page */}
                    <button
                      type='button'
                      onClick={() => {
                        handlePreviousPage()
                        scrollTo(0, 0)
                      }}
                      className='rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400'
                      disabled={isFirstPageOfThisStep}
                    >
                      Back
                    </button>
                    {/* Next */}
                    <button
                      type='button'
                      onClick={() => {
                        handleNextPage()
                        scrollTo(0, 0)
                      }}
                      className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
                    >
                      Next
                    </button>
                  </div>
                ) : (
                  <div className='mt-8 flex items-center space-x-4'>
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
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <div>No pages found for this step.</div>
        )}
      </div>

      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <h2 className='mb-4 text-xl font-semibold'>Pages / Steps</h2>
        <ul className='space-y-4'>
          {/* Show only visited steps + the very first root step */}
          {parsedSteps
            .filter(s => visitedSteps.has(s.id) || s.id === parsedSteps[0].id)
            .map(stepNode => {
              const nodeStepIndex = getIndex(stepNode.id)
              const nodeCurrentPageIndex = pageIndexByStep[stepNode.id] ?? 0

              return (
                <NavigationItem
                  key={stepNode.id}
                  step={stepNode}
                  currentStep={currentStep}
                  currentPageIndex={nodeCurrentPageIndex}
                  onNavigate={handleNavigate}
                  language={language}
                  getIndex={getIndex}
                  expandedStep={expandedStep}
                  setExpandedStep={setExpandedStep}
                />
              )
            })}
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
