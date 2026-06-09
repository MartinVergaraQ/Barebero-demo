import { AdminInput } from '@/src/features/admin/components/admin-input'

type AdminDateTimeRowProps = {
    dateId: string
    timeId: string
    dateLabel?: string
    timeLabel?: string
    dateValue: string
    timeValue: string
    onDateChange: (value: string) => void
    onTimeChange: (value: string) => void
    disabled?: boolean
    dateError?: string
    timeError?: string
    compact?: boolean
}

function formatReadableDate(value: string) {
    if (!value) return 'Sin fecha'

    const date = new Date(`${value}T12:00:00`)

    if (Number.isNaN(date.getTime())) return value

    const weekday = date.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '')
    const day = date.toLocaleDateString('es-CL', { day: '2-digit' })
    const month = date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')

    return `${weekday}, ${day} ${month}`
}

export function AdminDateTimeRow({
    dateId,
    timeId,
    dateLabel = 'Fecha',
    timeLabel = 'Hora',
    dateValue,
    timeValue,
    onDateChange,
    onTimeChange,
    disabled = false,
    dateError = '',
    timeError = '',
    compact = false,
}: AdminDateTimeRowProps) {
    return (
        <div className="rounded-[22px] border border-black/10 bg-white/55 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                        Fecha y hora
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-950">
                        {formatReadableDate(dateValue)} · {timeValue || 'Sin hora'}
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                <AdminInput
                    id={dateId}
                    label={dateLabel}
                    type="date"
                    value={dateValue}
                    onChange={onDateChange}
                    disabled={disabled}
                    error={dateError}
                    compact={compact}
                />

                <AdminInput
                    id={timeId}
                    label={timeLabel}
                    type="time"
                    value={timeValue}
                    onChange={onTimeChange}
                    disabled={disabled}
                    error={timeError}
                    compact={compact}
                />
            </div>
        </div>
    )
}