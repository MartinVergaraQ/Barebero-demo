type AdminMoneyInputProps = {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    error?: string
    helperText?: string
}

export function onlyDigits(value: string) {
    return value.replace(/\D/g, '')
}

export function formatCLPInput(value: string) {
    const digits = onlyDigits(value)

    if (!digits) return ''

    return new Intl.NumberFormat('es-CL').format(Number(digits))
}

export function AdminMoneyInput({
    id,
    label,
    value,
    onChange,
    placeholder = '12.000',
    disabled = false,
    error = '',
    helperText = 'Se guardará como valor numérico en CLP.',
}: AdminMoneyInputProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-black text-slate-700"
            >
                {label}
            </label>

            <div
                className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-[#FBF7EE] transition ${error
                        ? 'border-red-300 bg-red-50 focus-within:border-red-400 focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
                        : 'border-black/10 focus-within:border-[#C8942E] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(200,148,46,0.12)]'
                    }`}
            >
                <span className="flex h-full items-center border-r border-black/10 px-4 text-sm font-black text-[#8A5D16]">
                    $
                </span>

                <input
                    id={id}
                    inputMode="numeric"
                    value={formatCLPInput(value)}
                    onChange={(event) => onChange(onlyDigits(event.target.value))}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm font-black text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
            </div>

            {error ? (
                <p className="mt-1 text-xs font-bold text-red-600">
                    {error}
                </p>
            ) : helperText ? (
                <p className="mt-1 text-xs font-bold text-slate-400">
                    {helperText}
                </p>
            ) : null}
        </div>
    )
}