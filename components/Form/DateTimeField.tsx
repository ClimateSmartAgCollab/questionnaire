// DateTimeField.tsx
import React from 'react'

interface DateTimeFieldProps {
  field: {
    id: string
  }
  format: string
  fieldValue: any
  registerFieldRef: (id: string, el: HTMLInputElement | null) => void
  handleFieldChange: (field: any, value: string) => void
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  field,
  format,
  fieldValue,
  registerFieldRef,
  handleFieldChange
}) => {
  function toYYYYMMDD(value: string) {
    const d = new Date(value)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function toHHmm(value: string) {
    const d = new Date(value)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function toYYYYMM(value: string) {
    const d = new Date(value)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  function toWeek(value: string) {
    // This is a simple implementation; real week calculations are more complex.
    const d = new Date(value)
    // ISO week number calculation (approximate):
    const onejan = new Date(d.getFullYear(), 0, 1)
    const days = Math.floor((d.getTime() - onejan.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + onejan.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
  }

  // Optional: Return a placeholder (or help text) based on the regex format.
  function formatPlaceholder(regexFormat: string) {
    // In a production system you might map these regexes to friendly descriptions.
    switch (regexFormat) {
      case '^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$':
        return 'YYYY-MM-DD';
      case '^(\\d{4})(0[1-9]|1[0-2])(0[1-9]|[1-2]\d|3[0-1])$':
        return 'YYYYMMDD';
      case '^([01]\\d|2[0-3]):([0-5]\\d)$':
        return 'HH:MM: hour, minutes in 24 hour notation';
      case '^(\\d{4})-(0[1-9]|1[0-2])$':
        return 'YYYY-MM';
      case "^(?:\\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$":
        return "YYYY-Www: year week (e.g. W01)";
      case '^(?:\\d{4})W(0[1-9]|[1-4][0-9]|5[0-3])$':
        return 'YYYYWww: year week (e.g. W01)';
      case '^(?:\\d{4})-(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|36[0-6])$':
        return 'YYYY-DDD: Ordinal date (day number from the year)';
      case '^(?:\\d{4})(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|36[0-6])$':
        return 'YYYYDDD: Ordinal date (day number from the year)';
      case '^(\\d{4})$':
        return 'YYYY';
      case '^(\\d{2})$':
        return 'YY';
      case '^(0[1-9]|1[0-2])$':
        return 'MM';
      case '^(0[1-9]|[1-2][0-9]|3[01])$':
        return 'DD';
      case '^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)Z$':
        return 'YYYY-MM-DDTHH:MM:SSZ: Date and Time Combined (UTC)';
      case '^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)([+-][01]\\d:[0-5]\\d)$':
        return 'YYYY-MM-DDTHH:MM:SS±hh:mm: Date and Time Combined (with Timezone Offset)';
      case '^P(?!$)((\\d+Y)|(\\d+\.\\d+Y)$)?((\\d+M)|(\\d+\.\\d+M)$)?((\\d+W)|(\\d+\.\\d+W)$)?((\\d+D)|(\\d+\.\\d+D)$)?(T(?=\\d)((\\d+H)|(\\d+\.\\d+H)$)?((\\d+M)|(\\d+\.\\d+M)$)?(\\d+(\.\\d+S)?)?)?$':
        return 'PnYnMnDTnHnMnS :durations e.g. P3Y6M4DT12H30M5S';
      case '^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$':
        return 'HH:MM:SS: hour, minutes, seconds in 24 hour notation';
      case '^(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])/\\d{4}$':
        return 'DD/MM/YYYY';
      case '^(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])/\\d{2}$':
        return 'DD/MM/YY';
      case '^(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/\\d{4}$':
        return 'MM/DD/YYYY';
      case '^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\\d{4}$':
        return 'DDMMYYYY';
      case '^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\\d{4}$':
        return 'MMDDYYYY';
      case '^(\\d{4})(0[1-9]|1[0-2])(0[1-9]|[1-2]\\d|3[0-1])$':
        return 'YYYYMMDD';
      case '^(0?[1-9]|1[0-2]):[0-5][0-9]:[0-5][0-9] ?[APMapm]{2}$':
        return 'HH:MM:SS: hour, minutes, seconds 12 hour notation AM/PM';
      case '^(0?[1-9]|1[0-2]):[0-5][0-9] ?[APMapm]{2}$':
        return 'H:MM or HH:MM: hour, minutes AM/PM';
      default:
        return regexFormat 
    }
  }

  const { id } = field

  let inputElement

  inputElement = (() => {
    switch (format) {
      // ISO: YYYY-MM-DD (year month day)
      case '^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$':
        return (
          <input
            name={id}
            type='date'
            defaultValue={fieldValue ? toYYYYMMDD(fieldValue) : ''}
            className='w-full rounded border p-2'
            ref={el => registerFieldRef(id, el)}
            onBlur={e => handleFieldChange(field, e.target.value)}
          />
        )

      // ISO: HH:MM (24-hour)
      case '^([01]\\d|2[0-3]):([0-5]\\d)$':
        return (
          <input
            name={id}
            type='time'
            defaultValue={fieldValue ? toHHmm(fieldValue) : ''}
            className='w-full rounded border p-2'
            ref={el => registerFieldRef(id, el)}
            onBlur={e => handleFieldChange(field, e.target.value)}
          />
        )

      // ISO: YYYY-MM (year and month)
      case '^(\\d{4})-(0[1-9]|1[0-2])$':
        return (
          <input
            name={id}
            type='month'
            defaultValue={fieldValue ? toYYYYMM(fieldValue) : ''}
            className='w-full rounded border p-2'
            ref={el => registerFieldRef(id, el)}
            onBlur={e => handleFieldChange(field, e.target.value)}
          />
        )

      // ISO: YYYY-Www (year and week) – HTML supports type="week" in many browsers.
      case '^(?:\\d{4})-W(0[1-9]|[1-4]\\d|5[0-3])$':
        return (
          <input
            name={id}
            type='week'
            defaultValue={fieldValue ? toWeek(fieldValue) : ''}
            className='w-full rounded border p-2'
            ref={el => registerFieldRef(id, el)}
            onBlur={e => handleFieldChange(field, e.target.value)}
          />
        )

      // If the format doesn’t match any natively supported input,
      // fallback to a text input and show a placeholder with the expected format.
      default:
        return (
          <input
            name={id}
            type='text'
            defaultValue={fieldValue || ''}
            placeholder={formatPlaceholder(format)}
            className='w-full rounded border p-2'
            ref={el => registerFieldRef(id, el)}
            onBlur={e => handleFieldChange(field, e.target.value)}
          />
        )
    }
  })()

  return <>{inputElement}</>
}

export default DateTimeField
