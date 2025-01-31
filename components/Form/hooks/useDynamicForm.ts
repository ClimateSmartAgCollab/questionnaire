// src/hooks/useDynamicForm.ts
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Page_parsed, Step  } from '../../type'
import {
  buildStepTree,
  getParentSteps,
  getReferencingStep,
  validateField
} from '../utils/steps'
import { useFormData } from '../context/FormDataContext'

export function useDynamicForm(parsedSteps: Step[]) {
  const [language, setLanguage] = useState('eng')
  const [currentStep, setCurrentStep] = useState(0)
  const [pageIndexByStep, setPageIndexByStep] = useState<{
    [stepId: string]: number
  }>({})
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  )
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [currentChildId, setCurrentChildId] = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(
    parsedSteps[0]?.id || null
  )

  // Context
  const {
    createNewChild,
    editExistingChild,
    saveChildData
    // childrenData, getChildById, ...
  } = useFormData()

  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps])
  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  const saveCurrentStepData = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    const currentStepData: Record<string, any> = {}

    stepObj.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          let userInput = ''

          if (field.type === 'select' || field.type === 'dropdown') {
            const selectElement = document.querySelector(
              `[name="${field.id}"]`
            ) as HTMLSelectElement | null
            currentStepData[field.id] = selectElement
              ? Array.from(selectElement.selectedOptions).map(
                  option => option.value
                )
              : []
          } else if (field.type === 'radio') {
            const selectedRadio = document.querySelector(
              `input[name="${field.id}"]:checked`
            ) as HTMLInputElement | null
            userInput = selectedRadio?.value || ''
          } else {
            const input = document.querySelector(`[name="${field.id}"]`) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | null
            userInput = input?.value || ''
          }

          // Validate input
          const isValid = validateField(field, userInput, language)
          if (!isValid) {
            console.warn(`Validation failed for field ${field.id}`)
          }

          currentStepData[field.id] = userInput
        })
      })
    })

    setFormData(prev => ({
      ...prev,
      [stepObj.id]: currentStepData
    }))

    if (currentChildId) {
      saveChildData(currentChildId, currentStepData)
    }
  }, [currentStep, parsedSteps, language, currentChildId, saveChildData])

  
  const onNavigate = useCallback(
    (index: number) => {
      scrollToTop()
      saveCurrentStepData()
      setCurrentStep(index)
      setVisitedSteps(prev => {
        const updated = new Set(prev)
        updated.add(parsedSteps[index]?.id)
        return updated
      })
    },
    [parsedSteps, saveCurrentStepData]
  )

  const handleNavigate = useCallback(
    (stepIndex: number, pageIndex: number = 0) => {
      if (stepIndex < 0 || stepIndex >= parsedSteps.length) return;
  
      saveCurrentStepData();
  
      setExpandedStep(parsedSteps[stepIndex].id);
      setPageIndexByStep(prev => ({
        ...prev,
        [parsedSteps[stepIndex].id]: pageIndex
      }));
  
      onNavigate(stepIndex);
    },
    [parsedSteps, saveCurrentStepData, onNavigate]
  );
  
  useEffect(() => {
    const newStepId = parsedSteps[currentStep]?.id
    setExpandedStep(newStepId)
  }, [currentStep])

  const goToNextParent = useCallback(() => {
    scrollToTop()
    saveCurrentStepData()
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
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentStepData])

  const goToPreviousParent = useCallback(() => {
    scrollToTop()
    saveCurrentStepData()
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
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentStepData])

  const isParentStep = (step: Step) => parentSteps.some(p => p.id === step.id)

  const step: Step = parsedSteps[currentStep]
  const currentPageIndex = pageIndexByStep[step.id] ?? 0
  const currentPage: Page_parsed | undefined = step.pages[currentPageIndex]

  const isLastPageOfThisStep = currentPageIndex === step.pages.length - 1
  const isFirstPageOfThisStep = currentPageIndex === 0

  const isVeryLastPageOfLastStep =
    isParentStep(step) && currentStep === 0 && isLastPageOfThisStep


  const handleNextPage = () => {
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
    saveCurrentStepData()

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
    saveCurrentStepData,
    isParentStep,
    setVisitedSteps,
    setCurrentChildId
  ])

  const cancelHandler = useCallback(() => {
    scrollToTop()
    saveCurrentStepData()
    setCurrentChildId(null)
    setCurrentStep(0)
  }, [saveCurrentStepData])

  const prefillData = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    let stepData = formData[stepObj.id] || {}

    if (currentChildId) {
      const child = editExistingChild(currentChildId)
      if (child) {
        stepData = child.data
      }
    }

    stepObj.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          const input = document.querySelector(`[name="${field.id}"]`) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null
          if (input) {
            input.value = stepData[field.id] || ''
          }
        })
      })
    })
  }, [currentStep, parsedSteps, formData, currentChildId, editExistingChild])

  useEffect(() => {
    prefillData()
  }, [currentStep, prefillData])

  return {
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
    step
  }
}
