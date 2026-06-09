'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'

type BarberOption = {
    id: string
    name: string
}

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'canceled', label: 'Cancelada' },
    { value: 'no_show', label: 'No asistió' },
]

type Props = {
    barbers: BarberOption[]
    selectedDate?: string
    selectedStatus?: string
    selectedBarberId?: string
    isBarber?: boolean
}

function formatDateValue(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export function AdminAppointmentsFilter({
    barbers,
    selectedDate = '',
    selectedStatus = '',
    selectedBarberId = '',
    isBarber = false,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const today = formatDateValue(new Date())

    const currentDate = selectedDate || searchParams.get('date') || today

    const currentStatus =
        selectedStatus === 'all'
            ? ''
            : selectedStatus || searchParams.get('status') || ''

    const currentBarberId =
        selectedBarberId === 'all'
            ? ''
            : selectedBarberId || searchParams.get('barberId') || ''

    const [date, setDate] = useState(currentDate)
    const [status, setStatus] = useState(currentStatus)
    const [barberId, setBarberId] = useState(currentBarberId)

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const params = new URLSearchParams(searchParams.toString())

        if (date) params.set('date', date)
        else params.delete('date')

        if (status) params.set('status', status)
        else params.delete('status')

        if (!isBarber && barberId) {
            params.set('barberId', barberId)
        } else {
            params.delete('barberId')
        }

        const queryString = params.toString()

        router.push(queryString ? `${pathname}?${queryString}` : pathname)
    }

    function handleClear() {
        setDate(today)
        setStatus('')
        setBarberId('')

        router.push(`${pathname}?date=${today}`)
    }

    return (

        <form onSubmit={handleSubmit}>

            <div
                className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isBarber
                    ? 'xl:grid-cols-[1.2fr_1fr_auto_auto]'
                    : 'xl:grid-cols-[1.2fr_1fr_1fr_auto_auto]'
                    } xl:items-end`}
            >
                <AdminInput
                    id="date"
                    label="Fecha"
                    type="date"
                    value={date}
                    onChange={setDate}
                />

                <AdminSelect
                    id="status"
                    label="Estado"
                    value={status}
                    onChange={setStatus}
                    options={statusOptions}
                />

                {!isBarber && (
                    <AdminSelect
                        id="barberId"
                        label="Barbero"
                        value={barberId}
                        onChange={setBarberId}
                        options={[
                            { value: '', label: 'Todos' },
                            ...barbers.map((barber) => ({
                                value: barber.id,
                                label: barber.name,
                            })),
                        ]}
                    />
                )}

                <button
                    type="submit"
                    className="h-11 w-full rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] xl:w-auto"
                >
                    Filtrar
                </button>

                <button
                    type="button"
                    onClick={handleClear}
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] xl:w-auto"
                >
                    Limpiar
                </button>
            </div>
        </form>
    )
}