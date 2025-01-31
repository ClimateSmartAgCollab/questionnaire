import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { X } from "lucide-react"; // Import icon for delete action

export const MultiSelectField = ({
  field,
  step,
  formData,
  saveCurrentPageData,
  language
}) => {
  // Initialize the selected options based on formData for this step and field
  const initialSelected = (formData[step.id]?.[field.id] || []).map((value) => ({
    value,
    label: value
  }));

  const [selectedOptions, setSelectedOptions] = useState(initialSelected);

  // Sync selectedOptions whenever formData changes (e.g., when navigating back)
  useEffect(() => {
    const currentValues = formData[step.id]?.[field.id] || [];
    setSelectedOptions(currentValues.map((value) => ({ value, label: value })));
  }, [formData, step.id, field.id]);

  // Compute available options that are not already selected
  const availableOptions = useMemo(() => {
    const allOptions = field.options[language]?.[field.id] || [];
    return allOptions
      .filter(
        (option) =>
          !selectedOptions.some((selected) => selected.value === option)
      )
      .map((option) => ({ value: option, label: option }));
  }, [field, language, field.id, selectedOptions]);

  // Handle selection changes in the dropdown
  const handleChange = (selected) => {
    const newSelected = selected || [];
    setSelectedOptions(newSelected);
    saveCurrentPageData({
      [field.id]: newSelected.map((option) => option.value)
    });
  };

  // Handle removal of a selected option
  const removeOption = (optionValue) => {
    const updatedOptions = selectedOptions.filter(
      (option) => option.value !== optionValue
    );
    setSelectedOptions(updatedOptions);
    saveCurrentPageData({
      [field.id]: updatedOptions.map((option) => option.value)
    });
  };

  return (
    <div>
      {/* Display selected options with a delete icon */}
      <div className="mb-4 flex flex-wrap gap-2">
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className="flex items-center rounded bg-blue-100 px-3 py-1 text-sm text-blue-800"
          >
            {option.label}
            <button
              type="button"
              className="ml-2 text-red-500 hover:text-red-700"
              onClick={() => removeOption(option.value)}
              aria-label={`Remove ${option.label}`}
            >
              <X size={16} />
            </button>
          </span>
        ))}
      </div>

      {/* Multi-Select Dropdown */}
      <Select
        options={availableOptions}
        isMulti
        placeholder="Select options..."
        onChange={handleChange}
        value={selectedOptions} // Ensure the dropdown reflects the current selection
      />
    </div>
  );
};
