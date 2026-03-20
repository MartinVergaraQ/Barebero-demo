'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

type BarberOption = {
    id: string
    name: string
}

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'no_show', label: 'No asistió' },
]

type Props = {
    barbers: BarberOption[]
}

export function AdminAppointmentsFilter({ barbers }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentDate = searchParams.get('date') ?? ''
    const currentStatus = searchParams.get('status') ?? ''
    const currentBarberId = searchParams.get('barberId') ?? ''

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

        if (barberId) params.set('barberId', barberId)
        else params.delete('barberId')

        const queryString = params.toString()
        router.push(queryString ? `${pathname}?${queryString}` : pathname)
    }

    function handleClear() {
        setDate('')
        setStatus('')
        setBarberId('')
        router.push(pathname)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_auto_auto] xl:items-end">
                <div>
                    <label
                        htmlFor="date"
                        className="mb-2 block text-sm font-semibold text-[#2f2d2a]"
                    >
                        Fecha
                    </label>
                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-[15px] text-[#2d2a26] outline-none"
                    />
                </div>

                <div>
                    <label
                        htmlFor="status"
                        className="mb-2 block text-sm font-semibold text-[#2f2d2a]"
                    >
                        Estado
                    </label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-[15px] text-[#2d2a26] outline-none"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="barberId"
                        className="mb-2 block text-sm font-semibold text-[#2f2d2a]"
                    >
                        Barbero
                    </label>
                    <select
                        id="barberId"
                        value={barberId}
                        onChange={(e) => setBarberId(e.target.value)}
                        className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-[15px] text-[#2d2a26] outline-none"
                    >
                        <option value="">Todos</option>
                        {barbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>
                                {barber.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    className="h-[48px] w-full rounded-[8px] bg-black px-5 text-[15px] font-semibold text-white xl:w-auto"
                >
                    Filtrar
                </button>

                <button
                    type="button"
                    onClick={handleClear}
                    className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-5 text-[15px] font-semibold text-[#2d2a26] xl:w-auto"
                >
                    Limpiar
                </button>
            </div>
        </form>
    )
}