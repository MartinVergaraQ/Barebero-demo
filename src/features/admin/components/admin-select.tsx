'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type AdminSelectOption = {
    value: string
    label: string
}

type AdminSelectProps = {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    options: AdminSelectOption[]
    disabled?: boolean
    hideLabel?: boolean
    compact?: boolean
    maxMenuHeight?: number
}

export function AdminSelect({
    id,
    label,
    value,
    onChange,
    options,
    disabled = false,
    hideLabel = false,
    compact = false,
    maxMenuHeight = 256,
}: AdminSelectProps) {
    const [open, setOpen] = useState(false)
    const [direction, setDirection] = useState<'down' | 'up'>('down')
    const wrapperRef = useRef<HTMLDivElement | null>(null)

    const selectedOption =
        options.find((option) => option.value === value) ?? options[0]

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!wrapperRef.current) return

            if (!wrapperRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (!open || !wrapperRef.current) return

        const rect = wrapperRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        const spaceBelow = viewportHeight - rect.bottom
        const spaceAbove = rect.top

        if (spaceBelow < 280 && spaceAbove > spaceBelow) {
            setDirection('up')
        } else {
            setDirection('down')
        }
    }, [open])

    function handleSelect(nextValue: string) {
        onChange(nextValue)
        setOpen(false)
    }

    return (
        <div ref={wrapperRef} className="relative">
            {!hideLabel && (
                <label
                    htmlFor={id}
                    className="mb-1.5 block text-sm font-black text-slate-700"
                >
                    {label}
                </label>
            )}

            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 text-left text-sm font-black outline-none transition ${compact ? 'h-10 min-w-[145px]' : 'h-11'
                    } ${open
                        ? 'border-[#C8942E] bg-white shadow-[0_0_0_4px_rgba(200,148,46,0.12)]'
                        : 'border-black/10 bg-[#FBF7EE] hover:bg-white'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <span className="truncate text-slate-950">
                    {selectedOption?.label ?? 'Seleccionar'}
                </span>

                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180 text-[#C8942E]' : ''
                        }`}
                />
            </button>

            {open && (
                <div
                    className={`absolute left-0 right-0 z-[120] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] ${direction === 'up'
                        ? 'bottom-[calc(100%+0.5rem)]'
                        : 'top-[calc(100%+0.5rem)]'
                        }`}
                >
                    <div
                        className="overflow-y-auto p-1.5"
                        style={{ maxHeight: maxMenuHeight }}
                    >
                        {options.map((option) => {
                            const active = option.value === value

                            return (
                                <button
                                    key={option.value || 'all'}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black transition ${active
                                        ? 'bg-[#C8942E] text-white'
                                        : 'text-slate-700 hover:bg-[#FBF7EE] hover:text-slate-950'
                                        }`}
                                >
                                    <span className="truncate">
                                        {option.label}
                                    </span>

                                    {active && (
                                        <span className="text-xs font-black">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}