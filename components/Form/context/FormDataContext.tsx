// src/context/FormDataContext.tsx
'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface ParentFormData {
  [stepId: string]: {
    [fieldId: string]: any
    childrenData?: {
      [childStepId: string]: ChildRecord[]
    }
  }
}

interface ChildRecord {
  id: string 
  parentId: string
  stepId: string 
  data: { [fieldId: string]: any } 
}

type ChildrenData = ChildRecord[]

interface FormDataContextType {
  parentFormData: ParentFormData
  setParentFormData: React.Dispatch<React.SetStateAction<ParentFormData>>

  childrenData: ChildrenData
  setChildrenData: React.Dispatch<React.SetStateAction<ChildrenData>>

  createNewChild: (parentId: string, stepId: string | undefined) => ChildRecord
  editExistingChild: (childId: string) => ChildRecord | null
  saveChildData: (childId: string, newData: Record<string, any>) => void

  getChildById: (childId: string) => ChildRecord | null
  updateChildById: (childId: string, newData: Record<string, any>) => void
}

const FormDataContext = createContext<FormDataContextType | undefined>(
  undefined
)

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

  const createNewChild = useCallback((parentId: string, stepId: string | undefined) => {
    const newChild: ChildRecord = {
      id: uuidv4(),
      parentId,
      stepId: stepId || 'defaultStepId',
      data: {}
    }
    setChildrenData(prev => [...prev, newChild])
    return newChild
  }, [])

  const editExistingChild = useCallback(
    (childId: string) => {
      return childrenData.find(child => child.id === childId) || null
    },
    [childrenData]
  )

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

export function useFormData() {
  const context = useContext(FormDataContext)
  if (!context) {
    throw new Error('useFormData must be used within a FormDataProvider')
  }
  return context
}
