// src/context/FormTreeContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Recursive form node structure
interface FormNode {
  id: string;
  stepId: string;
  data: Record<string, any>;
  children: FormNode[]; // Allows deep nesting
}

interface FormTreeContextType {
  formTree: FormNode[];
  setFormTree: React.Dispatch<React.SetStateAction<FormNode[]>>;
  addNewNode: (parentId: string | null, stepId: string) => FormNode;
  updateNodeData: (nodeId: string, newData: Record<string, any>) => void;
  findNode: (nodeId: string) => FormNode | null;
}

const FormTreeContext = createContext<FormTreeContextType | undefined>(undefined);

export function FormTreeProvider({ children }: { children: React.ReactNode }) {
  const [formTree, setFormTree] = useState<FormNode[]>([]);

  // Find a node by ID (recursively)
  const findNode = useCallback((nodeId: string): FormNode | null => {
    return findNodeById(formTree, nodeId);
  }, [formTree]);

  // Add a new node as a child (or as a root node if parentId is null)
  const addNewNode = useCallback((parentId: string | null, stepId: string): FormNode => {
    const newNode: FormNode = {
      id: uuidv4(),
      stepId,
      data: {},
      children: [],
    };

    if (!parentId) {
      // No parent → Add as a top-level node
      setFormTree((prev) => [...prev, newNode]);
    } else {
      // Attach to the specified parent
      setFormTree((prev) => addChildNode(prev, parentId, newNode));
    }

    return newNode;
  }, []);

  // Update data for a specific node
  const updateNodeData = useCallback((nodeId: string, newData: Record<string, any>) => {
    setFormTree((prev) =>
      updateNodeById(prev, nodeId, (node) => ({
        ...node,
        data: { ...node.data, ...newData },
      }))
    );
  }, []);

  const value: FormTreeContextType = {
    formTree,
    setFormTree,
    addNewNode,
    updateNodeData,
    findNode,
  };

  return <FormTreeContext.Provider value={value}>{children}</FormTreeContext.Provider>;
}

export function useFormTree() {
  const context = useContext(FormTreeContext);
  if (!context) {
    throw new Error('useFormTree must be used within a FormTreeProvider');
  }
  return context;
}

// --- Recursive Helper Functions ---
function findNodeById(nodes: FormNode[], id: string): FormNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function updateNodeById(
  nodes: FormNode[],
  id: string,
  updateFn: (node: FormNode) => FormNode
): FormNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updateFn(node);
    }
    return {
      ...node,
      children: updateNodeById(node.children, id, updateFn),
    };
  });
}

function addChildNode(nodes: FormNode[], parentId: string, newChild: FormNode): FormNode[] {
  return updateNodeById(nodes, parentId, (node) => ({
    ...node,
    children: [...node.children, newChild],
  }));
}
