// src/components/Form/Form.tsx
'use client'

import { motion } from 'framer-motion'
import { parseJsonToFormStructure } from '../parser'
import { Field, Step } from '../type'
import {
  useDynamicForm,
  isValid__UTF8,
  sortStepsByReferences
} from './hooks/useDynamicForm'
import { NavigationItem } from '../Form/NavigationItem'
import DateTimeField from '../Form/DateTimeField'
import styles from './Form.module.css'
import Footer from '../../Footer/footer'
import { useFormData } from '../Form/context/FormDataContext'

const unsortedSteps = parseJsonToFormStructure()
const parsedSteps = sortStepsByReferences(unsortedSteps)
// console.log('Sorted Steps:', parsedSteps)

const formTitle = parsedSteps[0].title || {
  eng: 'Default Title',
  fra: 'Titre par défaut'
}

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
    currentChildId,
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
    setCurrentChildParentId,
    currentChildParentId,
    reviewOutput,
    setReviewOutput,
    handleSubmit_openAIRE,
    deleteChild,
    editExistingChild,
    setIsNewChild,
    isNewChild
  } = useDynamicForm(parsedSteps)

  const { parentFormData } = useFormData()
  // console.log('parentFormData', parentFormData)

  if (!parsedSteps || parsedSteps.length === 0) {
    return <div>Loading form structure...</div>
  }

  const getIndex = (stepId: string) => {
    return parsedSteps.findIndex(s => s.id === stepId)
  }

  function ChildReview({
    field,
    parentFormData,
    parsedSteps,
    language
  }: {
    field: any
    parentFormData: any
    parsedSteps: any
    language: string
  }) {
    const children = parentFormData[field.id]?.childrenData?.[field.ref] || []
    return (
      <div className='ml-4 mt-2 border-l-4 border-blue-500 p-2'>
        <h5 className='text-md font-semibold text-blue-700'>
          Child Entries for "
          {field.labels[language]?.[field.id] ||
            field.labels.eng?.[field.id] ||
            'Field'}
          "
        </h5>
        {children.map((child: any) => {
          const childStep = parsedSteps.find((s: any) => s.id === child.stepId)
          return (
            <div key={child.id} className='mt-2 bg-gray-100 p-2'>
              {childStep ? (
                childStep.pages.map((cPage: any) => (
                  <div key={cPage.pageKey} className='ml-4'>
                    {cPage.sections.map((cSection: any) => (
                      <div key={cSection.sectionKey} className='ml-4'>
                        <h6 className='text-lg font-medium'>
                          {cSection.sectionLabel[language] ||
                            cSection.sectionLabel.eng}
                        </h6>
                        {cSection.fields.map((cField: any) => {
                          const nestedChildren =
                            cField.type === 'reference' &&
                            cField.ref &&
                            parentFormData[cField.id]?.childrenData?.[
                              cField.ref
                            ] &&
                            parentFormData[cField.id].childrenData[cField.ref]
                              .length > 0
                          if (nestedChildren) {
                            return (
                              <div key={cField.id} className='mb-1 ml-4'>
                                <label className='block text-sm font-semibold text-gray-800'>
                                  {cField.labels[language]?.[cField.id] ||
                                    cField.labels.eng?.[cField.id] ||
                                    cField.id}
                                </label>
                                <ChildReview
                                  field={cField}
                                  parentFormData={parentFormData}
                                  parsedSteps={parsedSteps}
                                  language={language}
                                />
                              </div>
                            )
                          }
                          const childAnswer = child.data[cField.id]
                          return (
                            <div key={cField.id} className='mb-1 ml-4'>
                              <strong>
                                {cField.labels[language]?.[cField.id] ||
                                  cField.labels.eng?.[cField.id] ||
                                  cField.id}
                                :{' '}
                              </strong>
                              <span>
                                {Array.isArray(childAnswer)
                                  ? childAnswer.join(', ')
                                  : childAnswer?.toString() ||
                                    'No response provided'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p className='ml-4 text-gray-500'>No child structure found.</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (reviewOutput) {
    const childStepIds = new Set<string>()
    parsedSteps.forEach((step: any) => {
      step.pages.forEach((page: any) => {
        page.sections.forEach((section: any) => {
          section.fields.forEach((field: any) => {
            if (field.ref) {
              childStepIds.add(field.ref)
            }
          })
        })
      })
    })
    const parentStepsForReview = parsedSteps.filter(
      (step: any) => !childStepIds.has(step.id)
    )

    return (
      <section className={`${styles.formLayout} ${styles.fullPageReview}`}>
        <header className={`${styles.header} border-b pb-4`}>
          <h1 className='mb-2 text-center text-3xl font-bold'>
            {reviewOutput.title || 'Review Your Responses'}
          </h1>
          <p className='text-center text-lg text-gray-600'>
            Please review your responses below.
          </p>
        </header>
        <main className={`${styles.mainContent} p-4`}>
          <div className='space-y-6'>
            {parentStepsForReview.map((step: any) => (
              <div key={step.id} className='mb-6'>
                <h2 className='text-2xl font-bold'>
                  {step.names[language] || step.names.eng}
                </h2>
                {step.pages.map((page: any) => (
                  <div
                    key={page.pageKey}
                    className='mb-4 border-l-2 border-gray-300 pl-4'
                  >
                    <h3 className='text-xl font-semibold'>
                      {page.pageLabel[language] || page.pageLabel.eng}
                    </h3>
                    {page.sections.map((section: any) => (
                      <div
                        key={section.sectionKey}
                        className='mb-4 border-l-2 border-gray-200 pl-4'
                      >
                        <h4 className='text-lg font-medium'>
                          {section.sectionLabel[language] ||
                            section.sectionLabel.eng}
                        </h4>
                        {section.fields.map((field: any) => {
                          const hasChildren =
                            field.type === 'reference' &&
                            field.ref &&
                            parentFormData[field.id] &&
                            parentFormData[field.id].childrenData &&
                            parentFormData[field.id]?.childrenData?.[
                              field.ref
                            ] &&
                            (
                              parentFormData[field.id]?.childrenData?.[
                                field.ref
                              ] ?? []
                            ).length > 0
                          if (hasChildren) {
                            return (
                              <div key={field.id} className='mb-2'>
                                <label className='block text-sm font-semibold text-gray-800'>
                                  {field.labels[language]?.[field.id] ||
                                    field.labels.eng?.[field.id] ||
                                    'No label'}
                                </label>
                                <ChildReview
                                  field={field}
                                  parentFormData={parentFormData}
                                  parsedSteps={parsedSteps}
                                  language={language}
                                />
                              </div>
                            )
                          } else {
                            const fieldAnswer =
                              formData[step.id]?.[field.id] ?? field.value
                            return (
                              <div key={field.id} className='mb-2'>
                                <label className='block text-sm font-semibold text-gray-800'>
                                  {field.labels[language]?.[field.id] ||
                                    field.labels.eng?.[field.id]}
                                </label>
                                <div className='mt-1 rounded border bg-gray-50 p-2 text-gray-900'>
                                  {Array.isArray(fieldAnswer)
                                    ? fieldAnswer.join(', ')
                                    : fieldAnswer?.toString() || (
                                        <span className='text-gray-500'>
                                          No response provided
                                        </span>
                                      )}
                                </div>
                              </div>
                            )
                          }
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className='mt-8 flex justify-center'>
            <button
              type='button'
              onClick={() => setReviewOutput(null)}
              className='rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600'
            >
              Back to Form
            </button>
          </div>
        </main>
        <Footer currentPage={currentStep} />
      </section>
    )
  }

  return (
    <form className={styles.formLayout}>
      {/* Main content area */}
      <header className={styles.header}>
        <h1 className='text-3xl font-bold'>
          {formTitle[language] || formTitle.eng}
        </h1>
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
            key={currentChildId || currentPage.pageKey}
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
            {currentPage.subheading && (
              <p className='text-md mb-4 italic text-gray-600'>
                {currentPage.subheading[language] || currentPage.subheading.eng}
              </p>
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
                    currentChildId && currentChildParentId
                      ? (editExistingChild(currentChildParentId, currentChildId)
                          ?.data[field.id] ?? '')
                      : (formData[step.id]?.[field.id] ?? '')

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
                          value={
                            // For a child page, check if we're in child mode and use its data
                            currentChildId && currentChildParentId
                              ? (editExistingChild(
                                  currentChildParentId,
                                  currentChildId
                                )?.data[field.id] ?? '')
                              : (formData[step.id]?.[field.id] ?? '')
                          }
                          placeholder={
                            field.placeholder?.[language] ||
                            field.placeholder?.eng ||
                            ''
                          }
                          className='w-full rounded border p-2'
                          ref={el => registerFieldRef(field.id, el)}
                          onChange={e => {
                            handleFieldChange(field, e.target.value)
                          }}
                          onBlur={e => {
                            saveCurrentPageData()
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
                          format={
                            field.validation.format ||
                            'defaultFormat: YYYY-MM-DD'
                          }
                          fieldValue={fieldValue}
                          registerFieldRef={registerFieldRef}
                          handleFieldChange={handleFieldChange}
                          saveCurrentPageData={saveCurrentPageData}
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
                              const newChild = createNewChild(
                                field.id,
                                field.ref!
                              )

                              setCurrentChildId(newChild.id)
                              setCurrentChildParentId(field.id)

                              setFormData(prev => ({
                                ...prev,
                                [field.ref!]: {} // assuming the child page corresponds to the referenced step id
                              }))

                              setIsNewChild(false)

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
                            {field.reference_button_text?.[language] ||
                              field.reference_button_text?.eng ||
                              '+ Child Step'}
                          </button>
                          {/* Only display the table if there is at least one child */}
                          {parentFormData[field.id] &&
                            parentFormData[field.id].childrenData &&
                            (
                              parentFormData[field.id]?.childrenData?.[
                                field.ref
                              ] ?? []
                            ).length > 0 && (
                              <div className='mt-4 rounded border bg-gray-100 p-4'>
                                <h4 className='mb-2 text-lg font-semibold'>
                                  {
                                    parsedSteps.find(s => s.id === field.ref)
                                      ?.names[language]
                                  }
                                </h4>
                                <table className='w-full table-fixed border border-gray-300'>
                                  <thead className='bg-gray-200'>
                                    <tr>
                                      {/* Fixed-width Name column */}
                                      <th className='w-64 border border-gray-300 px-4 py-2 text-left'>
                                        Attributes
                                      </th>
                                      {/* Fixed-width actions column without a header title */}
                                      <th className='w-32 border border-gray-300 px-4 py-2'></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(parentFormData[field.id]?.childrenData ??
                                      {})[field.ref].map(child => (
                                      <tr key={child.id}>
                                        <td className='break-words border border-gray-300 px-4 py-2'>
                                          {/* Render each attribute value specified in field.showing_attribute */}
                                          {field.showing_attribute?.map(
                                            attr => (
                                              <div
                                                key={attr}
                                                className='mt-2 text-sm text-gray-700'
                                              >
                                                <strong>{attr}: </strong>
                                                <span>
                                                  {child.data[attr] ||
                                                    '(No Data)'}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </td>
                                        <td className='border border-gray-300 px-4 py-2 text-center'>
                                          <div className='flex justify-center space-x-2'>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                // Enter "edit mode"
                                                setCurrentChildId(child.id)
                                                setCurrentChildParentId(
                                                  field.id
                                                )
                                                const idx =
                                                  parsedSteps.findIndex(
                                                    s => s.id === child.stepId
                                                  )
                                                if (idx >= 0) {
                                                  onNavigate(idx)
                                                }
                                              }}
                                              className='rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600'
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type='button'
                                              onClick={() => {
                                                deleteChild(
                                                  child.id,
                                                  field.id,
                                                  field.ref!
                                                )
                                              }}
                                              className='rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600'
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
                    onClick={handleSubmit_openAIRE}
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
    </form>
  )
}
