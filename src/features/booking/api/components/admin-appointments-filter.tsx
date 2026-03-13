'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

type BarberOption = {
    id: string
    name: string
}

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
]

type Props = {
    barbers: BarberOption[]
}

export function AdminAppointmentsFilter({ barbers }: Props) {
    const router = useRouter()
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
        router.push(queryString ? `/admin/reservas?${queryString}` : '/admin/reservas')
    }

    function handleClear() {
        setDate('')
        setStatus('')
        setBarberId('')
        router.push('/admin/reservas')
    }

    return (
        <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
            <div>
                <label htmlFor="date" className="mb-2 block text-sm font-medium">
                    Fecha
                </label>
                <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-lg border p-3"
                />
            </div>

            <div>
                <label htmlFor="status" className="mb-2 block text-sm font-medium">
                    Estado
                </label>
                <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border p-3"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="barberId" className="mb-2 block text-sm font-medium">
                    Barbero
                </label>
                <select
                    id="barberId"
                    value={barberId}
                    onChange={(e) => setBarberId(e.target.value)}
                    className="rounded-lg border p-3"
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
                className="rounded-lg bg-black px-4 py-3 text-white"
            >
                Filtrar
            </button>

            <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border px-4 py-3"
            >
                Limpiar
            </button>
        </form>
    )
}