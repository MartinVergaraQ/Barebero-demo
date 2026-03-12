'use client'

import { useState } from 'react'
import { updateAppointmentStatus } from '@/src/features/booking/api/update-appointment-status'

type Props = {
    appointmentId: string
    currentStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
}

const statusOptions = [
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
] as const

export function AppointmentStatusSelect({
    appointmentId,
    currentStatus,
}: Props) {
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const nextStatus = e.target.value as Props['currentStatus']
        setStatus(nextStatus)
        setLoading(true)
        setMessage('')

        try {
            await updateAppointmentStatus(appointmentId, nextStatus)
            setMessage('Estado actualizado')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Error actualizando')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-3">
            <label className="block mb-1 text-sm font-medium">Estado</label>

            <select
                value={status}
                onChange={handleChange}
                disabled={loading}
                className="rounded-lg border p-2"
            >
                {statusOptions.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>

            {message && (
                <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
        </div>
    )
}