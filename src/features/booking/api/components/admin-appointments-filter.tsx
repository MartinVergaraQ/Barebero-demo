'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function AdminAppointmentsFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentDate = searchParams.get('date') ?? ''
    const [date, setDate] = useState(currentDate)

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const params = new URLSearchParams(searchParams.toString())

        if (date) {
            params.set('date', date)
        } else {
            params.delete('date')
        }

        router.push(`/admin/reservas?${params.toString()}`)
    }

    function handleClear() {
        setDate('')
        router.push('/admin/reservas')
    }

    return (
        <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
            <div>
                <label htmlFor="date" className="mb-2 block text-sm font-medium">
                    Filtrar por fecha
                </label>
                <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-lg border p-3"
                />
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