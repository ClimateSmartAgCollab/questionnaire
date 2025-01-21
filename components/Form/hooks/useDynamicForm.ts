// src/hooks/useDynamicForm.ts
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Step } from '../../type'
import {
  buildStepTree,
  getParentSteps,
  getReferencingStep,
  validateField,
} from '../utils/steps'

export function useDynamicForm(parsedSteps: Step[]) {
  const [language, setLanguage] = useState('eng');
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  );
  const [formData, setFormData] = useState<Record<string, any>>({});

  const stepTree = useMemo(() => buildStepTree(parsedSteps), [parsedSteps]);
  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps]);

  // Save current step's data
  const saveCurrentStepData = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    const currentStepData: Record<string, any> = {};

    // Collect data from pages -> sections -> fields
    stepObj.pages.forEach((page) => {
      page.sections.forEach((section) => {
        section.fields.forEach((field) => {
          let userInput = '';

          if (field.type === 'radio') {
            const selectedRadio = document.querySelector(
              `input[name="${field.id}"]:checked`
            ) as HTMLInputElement | null;
            userInput = selectedRadio?.value || '';
          } else {
            const input = document.querySelector(`[name="${field.id}"]`) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | null;
            userInput = input?.value || '';
          }

          // Validate input
          const isValid = validateField(field, userInput, language);
          if (!isValid) {
            console.warn(`Validation failed for field ${field.id}`);
          }

          currentStepData[field.id] = userInput;
        });
      });
    });

    // Update form data
    setFormData((prevData) => ({
      ...prevData,
      [stepObj.id]: currentStepData,
    }));
  }, [currentStep, parsedSteps, language]);

  // Navigate with save
  const onNavigate = useCallback(
    (index: number) => {
      saveCurrentStepData();
      setCurrentStep(index);
      setVisitedSteps((prev) => {
        const updated = new Set(prev);
        updated.add(parsedSteps[index]?.id);
        return updated;
      });
    },
    [parsedSteps, saveCurrentStepData]
  );

  const goToNextParent = useCallback(() => {
    saveCurrentStepData();
    const currentStepId = parsedSteps[currentStep]?.id;
    const currentParentIndex = parentSteps.findIndex(
      (step) => step.id === currentStepId
    );
    if (currentParentIndex >= 0 && currentParentIndex < parentSteps.length - 1) {
      const nextParentId = parentSteps[currentParentIndex + 1]?.id;
      const nextStepIndex = parsedSteps.findIndex((s) => s.id === nextParentId);
      if (nextStepIndex >= 0) {
        onNavigate(nextStepIndex);
      }
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentStepData]);

  const goToPreviousParent = useCallback(() => {
    saveCurrentStepData();
    const currentStepId = parsedSteps[currentStep]?.id;
    const currentParentIndex = parentSteps.findIndex(
      (step) => step.id === currentStepId
    );
    if (currentParentIndex > 0) {
      const previousParentId = parentSteps[currentParentIndex - 1]?.id;
      const previousStepIndex = parsedSteps.findIndex(
        (s) => s.id === previousParentId
      );
      if (previousStepIndex >= 0) onNavigate(previousStepIndex);
    }
  }, [currentStep, parentSteps, parsedSteps, onNavigate, saveCurrentStepData]);

  const finishHandler = useCallback(() => {
    saveCurrentStepData();

    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    const referencingStep = getReferencingStep(stepObj.id, parsedSteps);
    if (referencingStep) {
      const referencingStepIndex = parsedSteps.findIndex(
        (s) => s.id === referencingStep.id
      );
      setCurrentStep(referencingStepIndex);
    } else {
      setCurrentStep(0);
    }
  }, [currentStep, parsedSteps, saveCurrentStepData]);

  const cancelHandler = useCallback(() => {
    saveCurrentStepData();
    setCurrentStep(0);
  }, [saveCurrentStepData]);

  const isParentStep = (step: Step) =>
    parentSteps.some((p) => p.id === step.id);

  // Pre-fill data on page load
  const prefillData = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    const stepData = formData[stepObj.id] || {};
    stepObj.pages.forEach((page) => {
      page.sections.forEach((section) => {
        section.fields.forEach((field) => {
          const input = document.querySelector(`[name="${field.id}"]`) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
          if (input) {
            input.value = stepData[field.id] || '';
          }
        });
      });
    });
  }, [currentStep, parsedSteps, formData]);

  // Call prefillData when the step changes
  useEffect(() => {
    prefillData();
  }, [currentStep, prefillData]);

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
  };
}
