// src/context/FormDataContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { Step } from '../../type'

// The shape of our parent data:
interface ParentFormData {
  [stepId: string]: {
    [fieldId: string]: any;
  };
}

// The shape of a single child record:
interface ChildRecord {
  id: string;               // Could match a "step id" or a generated ID
  stepId: string;           // which step definition to use
  data: { [fieldId: string]: any }; // actual child form data
}

// The shape of our children data array:
type ChildrenData = ChildRecord[]

// Define context type:
interface FormDataContextType {
  parentFormData: ParentFormData;
  setParentFormData: React.Dispatch<React.SetStateAction<ParentFormData>>;
  
  childrenData: ChildrenData;
  setChildrenData: React.Dispatch<React.SetStateAction<ChildrenData>>;
  
  createNewChild: (stepId: string) => ChildRecord;
  editExistingChild: (childId: string) => ChildRecord | null;
  saveChildData: (childId: string, newData: Record<string, any>) => void;
}

// Create the context:
const FormDataContext = createContext<FormDataContextType | undefined>(undefined)

// Provider component:
export function FormDataProvider({ children }: { children: React.ReactNode }) {
  const [parentFormData, setParentFormData] = useState<ParentFormData>({})
  const [childrenData, setChildrenData] = useState<ChildrenData>([])

  // Create a new child record with blank data
  const createNewChild = useCallback((stepId: string) => {
    const newChild: ChildRecord = {
      id: `child-${Date.now()}`, // or use a UUID library
      stepId,
      data: {},
    }
    setChildrenData(prev => [...prev, newChild])
    return newChild
  }, [])

  // Find and return an existing child for editing
  const editExistingChild = useCallback((childId: string) => {
    const found = childrenData.find(child => child.id === childId) || null
    return found
  }, [childrenData])

  // Save updated child data
  const saveChildData = useCallback(
    (childId: string, newData: Record<string, any>) => {
      setChildrenData(prev =>
        prev.map(child => {
          if (child.id === childId) {
            return { ...child, data: newData }
          }
          return child
        })
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
    saveChildData,
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
