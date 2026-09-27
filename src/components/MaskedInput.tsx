import { useId, useState, type InputHTMLAttributes } from 'react'
import { Input } from './ui'
import { maskValue, numberToMasked, parseMaskedValue, type MaskKind } from '../utils/masks'

type MaskedInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'name'
> & {
  name: string
  mask: MaskKind
  label?: string
  defaultValue?: number | null
  optional?: boolean
  onValueChange?: (value: number) => void
}

export function MaskedInput({
  name,
  mask,
  label,
  defaultValue,
  optional = false,
  required,
  disabled,
  className,
  placeholder,
  onValueChange,
  ...props
}: MaskedInputProps) {
  const id = useId()
  const [display, setDisplay] = useState(() => numberToMasked(mask, defaultValue))
  const numeric = parseMaskedValue(mask, display)
  const isEmpty = display.trim() === ''

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && !optional ? <span className="text-muted"> *</span> : null}
        </label>
      )}
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        required={Boolean(required) && !optional}
        className="tabular-nums disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        value={display}
        onChange={(event) => {
          const next = maskValue(mask, event.target.value)
          setDisplay(next)
          onValueChange?.(parseMaskedValue(mask, next))
        }}
        {...props}
      />
      <input
        type="hidden"
        name={name}
        value={isEmpty ? '' : String(numeric)}
        disabled={disabled}
      />
    </div>
  )
}
