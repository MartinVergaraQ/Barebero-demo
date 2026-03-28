'use client'

import { useState } from 'react'
import { updateAppointmentStatus } from '@/src/features/booking/api/update-appointment-status'
import { toast } from 'sonner'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

type Props = {
    appointmentId: string
    currentStatus: AppointmentStatus
}

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'canceled', label: 'Cancelada' },
    { value: 'no_show', label: 'No asistió' },
]

export function AppointmentStatusSelect({
    appointmentId,
    currentStatus,
}: Props) {
    const [status, setStatus] = useState<AppointmentStatus>(currentStatus)
    const [loading, setLoading] = useState(false)

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const nextStatus = e.target.value as AppointmentStatus
        setStatus(nextStatus)
        setLoading(true)

        try {
            await updateAppointmentStatus(appointmentId, nextStatus)
            toast.success('Estado actualizado')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error actualizando estado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#2f2d2a]">
                Estado
            </label>

            <select
                value={status}
                onChange={handleChange}
                disabled={loading}
                className="h-[42px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-[15px] text-[#2d2a26] outline-none disabled:opacity-60"
            >
                {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}