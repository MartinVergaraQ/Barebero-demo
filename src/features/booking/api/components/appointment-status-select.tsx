'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateAppointmentStatus } from '@/src/features/booking/api/update-appointment-status'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

type Props = {
    appointmentId: string
    currentStatus: AppointmentStatus
}

const statusOptions: Array<{ value: string; label: string }> = [
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

    async function handleChange(value: string) {
        const previousStatus = status
        const nextStatus = value as AppointmentStatus

        setStatus(nextStatus)
        setLoading(true)

        try {
            await updateAppointmentStatus(appointmentId, nextStatus)
            toast.success('Estado actualizado')
        } catch (error) {
            setStatus(previousStatus)

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error actualizando estado'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-w-[150px]">
            <AdminSelect
                id={`appointment-status-${appointmentId}`}
                label="Estado"
                value={status}
                onChange={handleChange}
                options={statusOptions}
                disabled={loading}
                hideLabel
                compact
            />

            {loading && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                    Actualizando...
                </p>
            )}
        </div>
    )
}