'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { parseJsonToFormStructure } from './parser'
import React from 'react'

const steps = parseJsonToFormStructure() // Dynamically generate steps

// Define TypeScript types
interface Field {
  label: string
  type: string
  options?: Record<string, string> // For `enum`, `dropdown`, and `select`
  ref?: string // For `reference`
  orientation?: 'vertical' | 'horizontal' // For `radio` and `dropdown`
  value?: string // Pre-selected value
}

interface Step {
  id: string
  name: string
  description?: string
  fields: Field[]
  parent?: string | null
  children?: Step[]
}

// Build the step tree from flat data
function buildStepTree(steps: Step[]): Step[] {
  const stepMap: Record<string, Step> = {}
  const rootSteps: Step[] = []

  steps.forEach((step) => {
    stepMap[step.id] = { ...step, children: [] }
  })

  steps.forEach((step) => {
    step.fields
      .filter((field) => field.type === 'reference' && field.ref)
      .forEach((field) => {
        const child = stepMap[field.ref!]
        if (child) stepMap[step.id].children!.push(child)
      })

    if (!steps.some((s) => s.fields.some((f) => f.ref === step.id))) {
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
  }: {
    step: Step;
    currentStep: number;
    visitedSteps: Set<string>;
    onNavigate: (index: number) => void;
  }) => {
    const stepIndex = steps.findIndex((s) => s.id === step.id);

    return (
      <li>
        <button
          type="button"
          onClick={() => onNavigate(stepIndex)}
          className={`w-full rounded px-4 py-2 text-left ${
            currentStep === stepIndex
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
          aria-current={currentStep === stepIndex ? "step" : undefined}
        >
          {step.name}
        </button>

        {visitedSteps.has(step.id) && step.children!.length > 0 && (
          <ul className="ml-4 mt-2 space-y-2">
            {step
              .children!.filter((child) => visitedSteps.has(child.id))
              .map((child) => (
                <NavigationItem
                  key={child.id}
                  step={child}
                  currentStep={currentStep}
                  visitedSteps={visitedSteps}
                  onNavigate={onNavigate}
                />
              ))}
          </ul>
        )}
      </li>
    );
  }
);


export default function Form() {
  if (!steps || steps.length === 0) {
    return <div>Loading form structure...</div>
  }

  const [currentStep, setCurrentStep] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([steps[0]?.id])
  )
  const [formData, setFormData] = useState<Record<string, any>>({})

  const stepTree = useMemo(() => buildStepTree(steps), [steps])

  const parentSteps = useMemo(
    () => steps.filter((step) => !step.parent),
    [steps]
  )

  const onNavigate = useCallback(
    (index: number) => {
      setCurrentStep(index)
      setVisitedSteps((prev) => {
        const updated = new Set(prev)
        updated.add(steps[index]?.id)
        return updated
      })
    },
    [steps]
  )

  const goToNextParent = useCallback(() => {
    const currentParentIndex = parentSteps.findIndex(
      (step) => step.id === steps[currentStep]?.id
    )
    if (currentParentIndex >= 0 && currentParentIndex < parentSteps.length - 1) {
      const nextStepIndex = steps.findIndex(
        (step) => step.id === parentSteps[currentParentIndex + 1]?.id
      )
      onNavigate(nextStepIndex)
    }
  }, [currentStep, parentSteps, steps, onNavigate])

  const goToPreviousParent = useCallback(() => {
    const currentParentIndex = parentSteps.findIndex(
      (step) => step.id === steps[currentStep]?.id
    )
    if (currentParentIndex > 0) {
      const previousStepIndex = steps.findIndex(
        (step) => step.id === parentSteps[currentParentIndex - 1]?.id
      )
      onNavigate(previousStepIndex)
    }
  }, [currentStep, parentSteps, steps, onNavigate])

  const finishHandler = useCallback(() => {
    const currentStepData: Record<string, any> = {}

    steps[currentStep]?.fields.forEach((field: Field) => {
      const input = document.querySelector(`[name="${field.label}"]`) as HTMLInputElement | null

      if (field.type === 'textarea' || field.type === 'DateTime' || field.type === 'dropdown') {
        currentStepData[field.label] = input?.value || ''
      } else if (field.type === 'radio') {
        const selectedRadio = document.querySelector(
          `input[name="${field.label}"]:checked`
        ) as HTMLInputElement | null
        currentStepData[field.label] = selectedRadio?.value || ''
      } else if (field.type === 'select') {
        currentStepData[field.label] = input?.value || ''
      }
    })

    setFormData((prevData) => ({
      ...prevData,
      [steps[currentStep]?.id]: currentStepData
    }))

    console.log('Form Data:', formData)
    alert('Form submitted successfully!')
  }, [currentStep, steps, formData])

  const cancelHandler = useCallback(() => {
    const currentParent = steps.find(
      (step) => step.id === steps[currentStep]?.parent
    )

    if (currentParent) {
      const parentIndex = steps.findIndex(
        (step) => step.id === currentParent.id
      )
      setCurrentStep(parentIndex)
    } else {
      setCurrentStep(0)
    }
  }, [currentStep, steps])

  return (
    <section className="relative flex min-h-screen">
      <div className="flex-1 p-8 pr-80">
        <h1 className="mb-6 text-3xl font-bold">Dynamic Form</h1>

        {steps.map((step, index) =>
          currentStep === index ? (
            <motion.div
              key={step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="mb-4 text-2xl font-semibold">{step.name}</h2>
              {step.description && (
                <p className="mb-4 text-gray-600">{step.description}</p>
              )}

              {step.fields.map((field: Field) => (
                <div key={field.label} className="mb-4">
                  <label className="block text-sm font-medium">
                    {field.label}
                  </label>

                  {field.type === 'textarea' && (
                    <textarea
                      name={field.label}
                      defaultValue={field.value || ''}
                      className="w-full rounded border p-2"
                    />
                  )}
                  {field.type === 'DateTime' && (
                    <input
                      name={field.label}
                      type="datetime-local"
                      defaultValue={field.value || ''}
                      className="w-full rounded border p-2"
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
                      {Object.entries(field.options || {}).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={field.label}
                            value={key}
                            defaultChecked={field.value === key}
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === 'dropdown' && (
                    <select
                      name={field.label}
                      defaultValue={field.value || ''}
                      className="w-full rounded border p-2"
                    >
                      {Object.entries(field.options || {}).map(
                        ([key, value]) => (
                          <option key={key} value={key}>
                            {String(value)}
                          </option>
                        )
                      )}
                    </select>
                  )}
                  {field.type === 'select' && (
                    <select
                      name={field.label}
                      defaultValue={field.value || ''}
                      className="w-full rounded border p-2"
                    >
                      {Object.entries(field.options || {}).map(
                        ([key, value]) => (
                          <option key={key} value={key}>
                            {String(value)}
                          </option>
                        )
                      )}
                    </select>
                  )}
                  {field.type === 'reference' && field.ref && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetIndex = steps.findIndex(
                          (s) => s.id === field.ref
                        )
                        if (targetIndex >= 0) onNavigate(targetIndex)
                      }}
                      className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                      Go to {steps.find((s) => s.id === field.ref)?.name}
                    </button>
                  )}
                </div>
              ))}

              <div className="mt-8 flex justify-between">
                {parentSteps.some((p) => p.id === step.id) && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousParent}
                      className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                      disabled={
                        parentSteps.findIndex((p) => p.id === step.id) === 0
                      }
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goToNextParent}
                      className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      disabled={
                        parentSteps.findIndex((p) => p.id === step.id) ===
                        parentSteps.length - 1
                      }
                    >
                      Next
                    </button>
                  </>
                )}
                {!parentSteps.some((p) => p.id === step.id) && (
                  <>
                    <button
                      type="button"
                      onClick={cancelHandler}
                      className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={finishHandler}
                      className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
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

      <nav className="fixed bottom-0 right-0 top-0 hidden w-72 overflow-y-auto bg-gray-100 p-6 shadow-md lg:block">
        <h2 className="mb-4 text-xl font-semibold">Pages</h2>
        <ul className="space-y-4">
          {stepTree.map((step) => (
            <NavigationItem
              key={step.id}
              step={step}
              currentStep={currentStep}
              visitedSteps={visitedSteps}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    </section>
  )
}
