// src/context/FormDataContext.tsx
'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

// The shape of our parent data:
interface ParentFormData {
  [stepId: string]: {
    [fieldId: string]: any
    childrenData?: {
      [childStepId: string]: ChildRecord[]
    }
  }
}

// The shape of a single child record:
interface ChildRecord {
  id: string // Could match a "step id" or a generated ID
  stepId: string // which step definition to use
  data: { [fieldId: string]: any } // actual child form data
}

// The shape of our children data array:
type ChildrenData = ChildRecord[]

// Define context type:
interface FormDataContextType {
  parentFormData: ParentFormData
  setParentFormData: React.Dispatch<React.SetStateAction<ParentFormData>>

  childrenData: ChildrenData
  setChildrenData: React.Dispatch<React.SetStateAction<ChildrenData>>

  createNewChild: (stepId: string | undefined) => ChildRecord
  editExistingChild: (childId: string) => ChildRecord | null
  saveChildData: (childId: string, newData: Record<string, any>) => void

  getChildById: (childId: string) => ChildRecord | null
  updateChildById: (childId: string, newData: Record<string, any>) => void
}

// Create the context:
const FormDataContext = createContext<FormDataContextType | undefined>(
  undefined
)

// Provider component:
export function FormDataProvider({
  children,
  initialParentData = {},
  initialChildrenData = []
}: {
  children: React.ReactNode
  initialParentData?: ParentFormData
  initialChildrenData?: ChildrenData
}) {
  const [parentFormData, setParentFormData] =
    useState<ParentFormData>(initialParentData)
  const [childrenData, setChildrenData] =
    useState<ChildrenData>(initialChildrenData)

  // Create a new child record with blank data
  const createNewChild = useCallback((stepId: string | undefined) => {
    const newChild: ChildRecord = {
      id: uuidv4(),
      stepId: stepId || 'defaultStepId',
      data: {}
    }
    setChildrenData(prev => [...prev, newChild])
    return newChild
  }, [])

  // Find and return an existing child for editing
  const editExistingChild = useCallback(
    (childId: string) => {
      return childrenData.find(child => child.id === childId) || null
    },
    [childrenData]
  )

  // Save updated child data
  const saveChildData = useCallback(
    (childId: string, newData: Record<string, any>) => {
      setChildrenData(prev =>
        prev.map(child =>
          child.id === childId
            ? { ...child, data: { ...child.data, ...newData } }
            : child
        )
      )
    },
    []
  )

  const getChildById = useCallback(
    (childId: string) =>
      childrenData.find(child => child.id === childId) || null,
    [childrenData]
  )

  const updateChildById = useCallback(
    (childId: string, newData: Record<string, any>) => {
      setChildrenData(prev =>
        prev.map(child =>
          child.id === childId
            ? { ...child, data: { ...child.data, ...newData } }
            : child
        )
      )
    },
    []
  )

  const value: FormDataContextType = {
    parentFormData,
    setParentFormData,

    childrenData,
    setChildrenData,

    createNewChild,
    editExistingChild,
    getChildById,
    updateChildById,
    saveChildData
  }

  return (
    <FormDataContext.Provider value={value}>
      {children}
    </FormDataContext.Provider>
  )
}

// Custom hook for easy consumption:
export function useFormData() {
  const context = useContext(FormDataContext)
  if (!context) {
    throw new Error('useFormData must be used within a FormDataProvider')
  }
  return context
}
