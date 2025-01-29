// src/hooks/useDynamicForm.ts
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Step } from '../../type'
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [pageIndexByStep, setPageIndexByStep] = useState<{
    [stepId: string]: number
  }>({})
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  )
  // This is the local formData for "parent steps" that we already had:
  const [formData, setFormData] = useState<Record<string, any>>({})

  // for tracking "which child am I editing?"
  const [currentChildId, setCurrentChildId] = useState<string | null>(null)

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

  // Save current step's data
  const saveCurrentStepData = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    const currentStepData: Record<string, any> = {}

    // Collect data from pages -> sections -> fields
    stepObj.pages.forEach(page => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          let userInput = ''

          if (field.type === 'select' || field.type === 'dropdown') {
            // Collect multiselect values
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

    // Update local formData
    setFormData(prev => ({
      ...prev,
      [stepObj.id]: currentStepData
    }))

    // If we are in a "child step" and we have a current child being edited,
    // also save that child's data to the context.
    if (currentChildId) {
      saveChildData(currentChildId, currentStepData)
    }
  }, [currentStep, parsedSteps, language, currentChildId, saveChildData])

  // Navigate with save
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


  const finishHandler = useCallback(() => {
    scrollToTop()
    saveCurrentStepData()

    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    // When finishing editing the child, reset currentChildId
    setCurrentChildId(null)

    // Navigate back to whichever step references this child
    const referencingStep = getReferencingStep(stepObj.id, parsedSteps)
    if (referencingStep) {
      const referencingStepIndex = parsedSteps.findIndex(
        s => s.id === referencingStep.id
      )
      setCurrentStep(referencingStepIndex)
    } else {
      // or just go home
      setCurrentStep(0)
    }
  }, [currentStep, parsedSteps, saveCurrentStepData])

  const cancelHandler = useCallback(() => {
    scrollToTop()
    saveCurrentStepData()
    setCurrentChildId(null)
    setCurrentStep(0)
  }, [saveCurrentStepData])

  const isParentStep = (step: Step) => parentSteps.some(p => p.id === step.id)

  // Pre-fill data on page load
  const prefillData = useCallback(() => {
    const stepObj = parsedSteps[currentStep]
    if (!stepObj) return

    // If there's a child being edited, fill from context child data
    // Otherwise fill from your local formData
    let stepData = formData[stepObj.id] || {}

    // If editing a child, check the context for that child's data
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

  // Call prefillData when the step changes
  useEffect(() => {
    prefillData()
  }, [currentStep, prefillData])

  return {
    language,
    setLanguage,
    currentStep,
    setCurrentStep,
    visitedSteps,
    formData,
    setFormData,
    stepTree,
    parentSteps,
    onNavigate,
    goToNextParent,
    goToPreviousParent,
    finishHandler,
    cancelHandler,
    isParentStep,
    currentChildId,
    setCurrentChildId,
    createNewChild,
    editExistingChild,
    currentPageIndex,
    pageIndexByStep,
    setPageIndexByStep
  }
}
