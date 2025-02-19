// src/hooks/useDynamicForm.ts
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Page_parsed, Step, Field } from '../../type'
import {
  buildStepTree,
  getParentSteps,
  getReferencingStep,
  validateField
} from '../utils/steps'
import { useFormData } from '../context/FormDataContext'

type FieldErrors = Record<string, string>

export function isValid__UTF8(text: string): boolean {
  try {
    if (!text) return true

    const encoder = new TextEncoder()
    const decoder = new TextDecoder('utf-8', { fatal: true })

    const encoded = encoder.encode(text)
    decoder.decode(encoded)

    return true
  } catch (error) {
    return false
  }
}

const extractRefs = (step: Step): string[] => {
  const refs: string[] = []
  if (step.pages && Array.isArray(step.pages)) {
    step.pages.forEach(page => {
      if (page.sections && Array.isArray(page.sections)) {
        page.sections.forEach(section => {
          if (section.fields && Array.isArray(section.fields)) {
            section.fields.forEach((field: any) => {
              if (field.ref) {
                refs.push(field.ref)
              }
            })
          }
        })
      }
    })
  }
  return refs
}

export const sortStepsByReferences = (steps: Step[]): Step[] => {
  const stepsMap = new Map<string, Step>(steps.map(step => [step.id, step]))

  const graph: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}

  steps.forEach(step => {
    graph[step.id] = []
    inDegree[step.id] = 0
  })

  // Build graph edges: for each step, if any field inside it references another step,
  // then add an edge from the current step (parent) to the referenced step (child).
  steps.forEach(step => {
    const refs = extractRefs(step)
    refs.forEach(refId => {
      if (stepsMap.has(refId)) {
        graph[step.id].push(refId)
        inDegree[refId] = (inDegree[refId] || 0) + 1
      } else {
        console.warn(
          `Referenced step with id "${refId}" not found for step "${step.id}"`
        )
      }
    })
  })

  // Kahn’s algorithm: start with nodes that have no incoming edges.
  // We force the root (first step in the original array) to be first (if possible).
  const queue: string[] = []
  const rootId = steps[0].id
  if (inDegree[rootId] === 0) {
    queue.push(rootId)
  }
  // Add the rest of the nodes with zero in-degree (but avoid duplicating the root).
  steps.forEach(step => {
    if (step.id !== rootId && inDegree[step.id] === 0) {
      queue.push(step.id)
    }
  })

  const sortedIds: string[] = []
  while (queue.length) {
    const currentId = queue.shift()!
    sortedIds.push(currentId)

    for (const neighbor of graph[currentId]) {
      inDegree[neighbor]--
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (sortedIds.length !== steps.length) {
    console.warn('Cycle detected or missing nodes. Returning unsorted steps.')
    return steps
  }

  return sortedIds.map(id => stepsMap.get(id)!)
}

export function useDynamicForm(parsedSteps: Step[]) {
  const [reviewOutput, setReviewOutput] = useState<any>(null)
  const [language, setLanguage] = useState('eng')
  const [currentStep, setCurrentStep] = useState(0)
  const [pageIndexByStep, setPageIndexByStep] = useState<{
    [stepId: string]: number
  }>({})
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  )
  const [currentChildParentId, setCurrentChildParentId] = useState<
    string | null
  >(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [currentChildId, setCurrentChildId] = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(
    parsedSteps[0]?.id || null
  )

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Context
  const {
    createNewChild,
    editExistingChild,
    saveChildData,
    parentFormData,
    deleteChild
    // childrenData, getChildById, ...
  } = useFormData()

  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps])
  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps])

  const formFieldRefs = useRef<
    Record<
      string,
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
    >
  >({})

  const registerFieldRef = useCallback(
    (
      fieldId: string,
      element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
    ) => {
      formFieldRefs.current[fieldId] = element
    },
    []
  )


  
  const handleFieldChange = useCallback(
    (field: Field, newValue: string | string[]) => {
      const finalValue = newValue
      const normalizedValue =
        typeof finalValue === 'string'
          ? finalValue.normalize('NFC')
          : finalValue

      if (
        typeof normalizedValue === 'string' &&
        !isValid__UTF8(normalizedValue)
      ) {
        console.warn(`Input for ${field.id} contains invalid characters.`)
      }

      const stepObj = parsedSteps[currentStep]
      if (!stepObj) return
      const stepId = stepObj.id
      setFormData(prev => ({
        ...prev,
        [stepId]: {
          ...(prev[stepId] || {}),
          [field.id]: normalizedValue
        }
      }))

      // console.log('normalizedValue\n', normalizedValue)
      const errorMessage = validateField(field, normalizedValue, language)
      setFieldErrors(prev => ({
        ...prev,
        [field.id]: errorMessage || ''
      }))
    },
    [parsedSteps, currentStep]
  )

  const validateCurrentPageData = useCallback((): boolean => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return false

    const currentPageIndex = pageIndexByStep[stepObj.id] ?? 0
    const currentPage = stepObj.pages[currentPageIndex]
    if (!currentPage) return false

    let hasError = false
    const newErrors: FieldErrors = {}

    currentPage.sections.forEach(section => {
      section.fields.forEach(field => {
        const refElement = formFieldRefs.current[field.id]
        if (!refElement) return

        let userInput: string | string[] = ''

        if (field.type === 'select' || field.type === 'dropdown') {
          const selectEl = refElement as HTMLSelectElement
          userInput = Array.from(selectEl.selectedOptions).map(opt => opt.value)
        } else if (field.type === 'radio') {
          userInput = refElement.value || ''
        } else {
          userInput = (refElement as HTMLInputElement | HTMLTextAreaElement)
            .value
        }

        // const joinedValue = Array.isArray(userInput)
        //   ? userInput.join(',')
        //   : userInput

        const errorMessage = validateField(field, userInput, language)

        if (errorMessage) {
          hasError = true
          newErrors[field.id] = errorMessage
        }
      })
    })

    // Store the aggregated errors in state
    setFieldErrors(newErrors)
    return !hasError
  }, [parsedSteps, currentStep, pageIndexByStep])

  const saveCurrentPageData = useCallback(
    (updatedData?: Record<string, any>) => {
      const stepObj = parsedSteps[currentStep]
      if (!stepObj) return

      const currentPageIndex = pageIndexByStep[stepObj.id] ?? 0
      const currentPage = stepObj.pages[currentPageIndex]
      if (!currentPage) return

      // Instead of re-reading DOM, we rely on what's already in formData or updatedData.
      // Merge with updatedData if provided
      const existingData = formData[stepObj.id] || {}
      const finalData = { ...existingData, ...(updatedData || {}) }

      setFormData(prev => ({
        ...prev,
        [stepObj.id]: {
          ...prev[stepObj.id],
          ...finalData
        }
      }))

      if (currentChildId) {
        try {
          if (currentChildParentId && currentChildId) {
            saveChildData(currentChildParentId, currentChildId, finalData)
          }
        } catch (error) {
          console.error('Error saving child data:', error)
        }
      }
    },
    [
      currentStep,
      parsedSteps,
      pageIndexByStep,
      formData,
      language,
      currentChildId,
      saveChildData
    ]
  )

  const onNavigate = useCallback(
    (index: number) => {
      if (!validateCurrentPageData()) {
        console.warn('Please fix errors before continuing.')
        // return
      }

      saveCurrentPageData()
      setCurrentStep(index)
      setVisitedSteps(prev => {
        const updated = new Set(prev)
        updated.add(parsedSteps[index]?.id)
        return updated
      })
    },
    [parsedSteps, validateCurrentPageData, saveCurrentPageData]
  )

  const handleSubmit = () => {
    const questions: Array<{
      id: string;
      label: string;
      type: string;
      answer: any;
      children?: Array<{
        childId: string;
        questions: Array<{
          id: string;
          label: string;
          type: string;
          answer: any;
        }>;
      }>;
    }> = [];
  
    const parentStepsForReview = getParentSteps(parsedSteps);
    parentStepsForReview.forEach(step => {
      step.pages.forEach(page => {
        page.sections.forEach(section => {
          section.fields.forEach(field => {
            const questionObj: any = {
              id: field.id,
              label:
                field.labels[language]?.[field.id] ||
                field.labels['eng']?.[field.id] ||
                'No label',
              type: field.type,
              answer: formData[step.id]?.[field.id] ?? ''
            };
  
            if (field.type === 'reference' && field.ref) {
              const childrenData = parentFormData[field.id]?.childrenData?.[field.ref];
              if (childrenData && Array.isArray(childrenData)) {
                questionObj.children = childrenData.map(child => {
                  const childQuestions: Array<{
                    id: string;
                    label: string;
                    type: string;
                    answer: any;
                  }> = [];
  
                  for (const key in child.data) {
                    childQuestions.push({
                      id: key,
                      label: key, 
                      type: 'childField',
                      answer: child.data[key]
                    });
                  }
  
                  return {
                    childId: child.id,
                    questions: childQuestions
                  };
                });
              }
            }
  
            questions.push(questionObj);
          });
        });
      });
    });
  
    setReviewOutput({
      title: 'Questionnaire Review',
      questions
    });
  
    //to immediately submit data to backend,
    //call submission API here (or wait until the user confirms on the review page).
  };
  


  const handleNavigate = useCallback(
    (stepIndex: number, pageIndex: number = 0) => {
      if (stepIndex < 0 || stepIndex >= parsedSteps.length) return

      if (!validateCurrentPageData()) {
        console.warn('Please fix errors before continuing.')
        // return
      }

      saveCurrentPageData()

      setExpandedStep(parsedSteps[stepIndex].id)
      setPageIndexByStep(prev => ({
        ...prev,
        [parsedSteps[stepIndex].id]: pageIndex
      }))

      onNavigate(stepIndex)
    },
    [parsedSteps, validateCurrentPageData, saveCurrentPageData, onNavigate]
  )

  const goToNextParent = useCallback(() => {
    if (!validateCurrentPageData()) {
      console.warn('Please fix errors before continuing.')
      // return
    }

    saveCurrentPageData()
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === currentStepId
    )
    if (
      currentParentIndex >= 0 &&
      currentParentIndex < parentSteps.length - 1
    ) {
      const nextParentId = parentSteps[currentParentIndex + 1]?.id
      const nextStepIndex = parsedSteps.findIndex(s => s.id === nextParentId)
      if (nextStepIndex >= 0) {
        onNavigate(nextStepIndex)
      }
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentPageData])

  const goToPreviousParent = useCallback(() => {
    if (!validateCurrentPageData()) {
      console.warn('Please fix errors before continuing.')
      // return
    }
    saveCurrentPageData()
    const currentStepId = parsedSteps[currentStep]?.id
    const currentParentIndex = parentSteps.findIndex(
      step => step.id === currentStepId
    )
    if (currentParentIndex > 0) {
      const previousParentId = parentSteps[currentParentIndex - 1]?.id
      const previousStepIndex = parsedSteps.findIndex(
        s => s.id === previousParentId
      )
      if (previousStepIndex >= 0) onNavigate(previousStepIndex)
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentPageData])

  const isParentStep = (step: Step) => parentSteps.some(p => p.id === step.id)

  const step: Step = parsedSteps[currentStep]
  const currentPageIndex = pageIndexByStep[step.id] ?? 0
  const currentPage: Page_parsed | undefined = step.pages[currentPageIndex]

  const isLastPageOfThisStep = currentPageIndex === step.pages.length - 1
  const isFirstPageOfThisStep = currentPageIndex === 0

  const isVeryLastPageOfLastStep =
    isParentStep(step) && currentStep === 0 && isLastPageOfThisStep

  const handleNextPage = () => {
    if (!validateCurrentPageData()) {
      console.warn('Please fix errors before continuing.')
      // return
    }
    saveCurrentPageData()
    const lastPageIndex = step.pages.length - 1

    if (currentPageIndex < lastPageIndex) {
      setPageIndexByStep(prev => ({
        ...prev,
        [step.id]: currentPageIndex + 1
      }))
    } else {
      if (isParentStep(step)) {
        goToNextParent()
        const newStepIndex = currentStep + 1
        if (newStepIndex < parsedSteps.length) {
          setPageIndexByStep(prev => ({
            ...prev,
            [parsedSteps[newStepIndex].id]: 0
          }))
        }
      }
      // If it's a child step on the last page, do nothing here
      // (the user sees Finish/Cancel).
    }
  }

  const handlePreviousPage = () => {
    saveCurrentPageData()
    if (currentPageIndex > 0) {
      setPageIndexByStep(prev => ({
        ...prev,
        [step.id]: currentPageIndex - 1
      }))
    } else {
      if (isParentStep(step)) {
        goToPreviousParent()
        const newStepIndex = currentStep - 1
        if (newStepIndex >= 0) {
          const prevStep = parsedSteps[newStepIndex]
          setPageIndexByStep(prev => ({
            ...prev,
            [prevStep.id]: prevStep.pages.length - 1 || 0
          }))
        }
      }
      // If child step is on first page, do nothing
      // (the user does not have a "Back" on the first child page).
    }
  }

  
  const finishHandler = useCallback(() => {
    if (!validateCurrentPageData()) {
      console.warn('Please fix errors before continuing.')
      // return
    }

    saveCurrentPageData()

    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    if (!isParentStep(stepObj)) {
      setVisitedSteps(prev => {
        const updated = new Set(prev)
        updated.delete(stepObj.id)
        return updated
      })
    }

    setCurrentChildId(null)
    setCurrentChildParentId(null)

    const referencingStep = getReferencingStep(stepObj.id, parsedSteps)
    if (referencingStep) {
      const referencingStepIndex = parsedSteps.findIndex(
        s => s.id === referencingStep.id
      )
      setCurrentStep(referencingStepIndex)
    } else {
      setCurrentStep(0)
    }
  }, [
    currentStep,
    parsedSteps,
    saveCurrentPageData,
    isParentStep,
    setVisitedSteps,
    setCurrentChildId
  ])

  const cancelHandler = useCallback(() => {
    saveCurrentPageData()
    setCurrentChildId(null)
    setCurrentChildParentId(null)
    setCurrentStep(0)
  }, [saveCurrentPageData])

  const prefillCurrentPageData = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    const currentPageIndex = pageIndexByStep[stepObj.id] ?? 0
    const currentPage = stepObj.pages[currentPageIndex]
    if (!currentPage) return

    let stepData = formData[stepObj.id] || {}

    if (currentChildId) {
      const child =
        currentChildParentId && currentChildId
          ? editExistingChild(currentChildParentId, currentChildId)
          : null
      if (child) {
        stepData = child.data
      }
    }

    currentPage.sections.forEach(section => {
      section.fields.forEach(field => {
        const fieldValue = stepData[field.id] || ''

        if (field.type === 'select' || field.type === 'dropdown') {
          const selectElement = document.querySelector(
            `[name="${field.id}"]`
          ) as HTMLSelectElement | null
          if (selectElement) {
            const storedValues = Array.isArray(fieldValue)
              ? fieldValue
              : [fieldValue]

            Array.from(selectElement.options).forEach(option => {
              option.selected = storedValues.includes(option.value)
            })
          }
        } else {
          const input = document.querySelector(`[name="${field.id}"]`) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null
          if (input) {
            input.value = fieldValue
          }
        }
      })
    })
  }, [
    currentStep,
    parsedSteps,
    pageIndexByStep,
    formData,
    currentChildId,
    editExistingChild
  ])

  useEffect(() => {
    const newStepId = parsedSteps[currentStep]?.id
    setExpandedStep(newStepId)
    prefillCurrentPageData()
  }, [currentStep, prefillCurrentPageData])

  return {
    language,
    setLanguage,
    currentStep,
    visitedSteps,
    formData,
    setFormData,
    parentSteps: getParentSteps(parsedSteps),
    onNavigate,
    finishHandler,
    cancelHandler,
    isParentStep,
    setCurrentChildId,
    setCurrentChildParentId,
    createNewChild,
    pageIndexByStep,
    expandedStep,
    setExpandedStep,
    handleNavigate,
    handleNextPage,
    handlePreviousPage,
    isVeryLastPageOfLastStep,
    currentPage:
      parsedSteps[currentStep]?.pages[
        pageIndexByStep[parsedSteps[currentStep]?.id] ?? 0
      ],
    isLastPageOfThisStep,
    isFirstPageOfThisStep,
    step: parsedSteps[currentStep],
    saveCurrentPageData,
    fieldErrors,
    handleFieldChange,
    registerFieldRef,
    sortStepsByReferences,
    reviewOutput,
    setReviewOutput,
    handleSubmit,
    deleteChild
  }
}
