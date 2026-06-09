type AdminInputProps = {
    id: string
    label: string
    type?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    error?: string
    compact?: boolean
}

export function AdminInput({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    error = '',
    compact = false,
}: AdminInputProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-black text-slate-700"
            >
                {label}
            </label>

            <input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className={`${compact ? 'h-10 rounded-xl' : 'h-12 rounded-2xl'} w-full border bg-[#FBF7EE] px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${error
                        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
                        : 'border-black/10 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)]'
                    }`}
            />

            {error && (
                <p className="mt-1 text-xs font-bold text-red-600">
                    {error}
                </p>
            )}
        </div>
    )
}