'use client'

import { useEffect, useState } from 'react'
import {
    getWorkingHoursByBarber,
    type WorkingHourItem,
} from '@/src/features/working-hours/api/get-working-hours-by-barberos'
import { upsertWorkingHour } from '@/src/features/working-hours/api/upsert-working-hour'

type Barber = {
    id: string
    business_id: string
    name: string
}

type Props = {
    barbers: Barber[]
}

const weekDays = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
]

type WorkingHourFormRow = {
    id?: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export function AdminWorkingHoursForm({ barbers }: Props) {
    const isSingleBarber = barbers.length === 1
    const [selectedBarberId, setSelectedBarberId] = useState(
        isSingleBarber ? barbers[0].id : ''
    )

    const [rows, setRows] = useState<WorkingHourFormRow[]>(
        weekDays.map((day) => ({
            day_of_week: day.value,
            start_time: '10:00',
            end_time: '21:00',
            is_active: day.value !== 0,
        }))
    )

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const selectedBarber = barbers.find((barber) => barber.id === selectedBarberId)

    useEffect(() => {
        if (isSingleBarber && barbers[0] && selectedBarberId !== barbers[0].id) {
            setSelectedBarberId(barbers[0].id)
        }
    }, [isSingleBarber, barbers, selectedBarberId])

    useEffect(() => {
        async function loadWorkingHours() {
            if (!selectedBarberId) return

            setLoading(true)
            setMessage('')
            setErrorMessage('')

            try {
                const data = await getWorkingHoursByBarber(selectedBarberId)

                const mergedRows = weekDays.map((day) => {
                    const existing = data.find(
                        (item) => item.day_of_week === day.value
                    ) as WorkingHourItem | undefined

                    return {
                        id: existing?.id,
                        day_of_week: day.value,
                        start_time: existing?.start_time?.slice(0, 5) ?? '10:00',
                        end_time: existing?.end_time?.slice(0, 5) ?? '21:00',
                        is_active: existing?.is_active ?? day.value !== 0,
                    }
                })

                setRows(mergedRows)
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : 'Error cargando horarios'
                )
            } finally {
                setLoading(false)
            }
        }

        loadWorkingHours()
    }, [selectedBarberId])

    function updateRow(
        dayOfWeek: number,
        field: keyof WorkingHourFormRow,
        value: string | boolean
    ) {
        setRows((prev) =>
            prev.map((row) => {
                if (row.day_of_week !== dayOfWeek) return row

                if (row.day_of_week === 0) {
                    return {
                        ...row,
                        is_active: false,
                    }
                }

                return {
                    ...row,
                    [field]: value,
                }
            })
        )
    }

    async function handleSave() {
        if (!selectedBarber) {
            setErrorMessage('Selecciona un barbero')
            return
        }

        setSaving(true)
        setMessage('')
        setErrorMessage('')

        try {
            for (const row of rows) {
                const normalizedRow =
                    row.day_of_week === 0
                        ? { ...row, is_active: false }
                        : row

                if (
                    normalizedRow.is_active &&
                    normalizedRow.start_time >= normalizedRow.end_time
                ) {
                    throw new Error(
                        `El horario del día ${weekDays.find((d) => d.value === normalizedRow.day_of_week)
                            ?.label
                        } no es válido`
                    )
                }

                await upsertWorkingHour({
                    id: normalizedRow.id,
                    business_id: selectedBarber.business_id,
                    barber_id: selectedBarber.id,
                    day_of_week: normalizedRow.day_of_week,
                    start_time: normalizedRow.start_time,
                    end_time: normalizedRow.end_time,
                    is_active: normalizedRow.is_active,
                })
            }

            setMessage('Horarios guardados correctamente')
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error guardando horarios'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-xl font-semibold">
                {isSingleBarber ? 'Mis horarios' : 'Horarios por barbero'}
            </h2>

            {selectedBarber && (
                <p className="mb-4 text-sm text-slate-600">
                    {isSingleBarber
                        ? `Configura tus horarios de atención.`
                        : `Editando horarios de ${selectedBarber.name}.`}
                </p>
            )}

            {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
                    {message}
                </div>
            )}

            {!isSingleBarber && (
                <div className="mb-6">
                    <label className="mb-2 block font-medium">Barbero</label>
                    <select
                        value={selectedBarberId}
                        onChange={(e) => setSelectedBarberId(e.target.value)}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="">Selecciona un barbero</option>
                        {barbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>
                                {barber.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedBarberId && (
                <>
                    {loading ? (
                        <p>Cargando horarios...</p>
                    ) : (
                        <div className="space-y-4">
                            {rows.map((row) => {
                                const dayLabel =
                                    weekDays.find((day) => day.value === row.day_of_week)
                                        ?.label ?? row.day_of_week

                                return (
                                    <div
                                        key={row.day_of_week}
                                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-4 md:items-center"
                                    >
                                        <div className="font-medium">{dayLabel}</div>

                                        <div className="flex flex-col gap-1">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        row.day_of_week === 0 ? false : row.is_active
                                                    }
                                                    disabled={row.day_of_week === 0}
                                                    onChange={(e) =>
                                                        updateRow(
                                                            row.day_of_week,
                                                            'is_active',
                                                            e.target.checked
                                                        )
                                                    }
                                                />
                                                Activo
                                            </label>

                                            {row.day_of_week === 0 && (
                                                <span className="text-xs text-slate-500">
                                                    Cerrado por política del local
                                                </span>
                                            )}
                                        </div>

                                        <input
                                            type="time"
                                            value={row.start_time}
                                            disabled={!row.is_active || row.day_of_week === 0}
                                            onChange={(e) =>
                                                updateRow(
                                                    row.day_of_week,
                                                    'start_time',
                                                    e.target.value
                                                )
                                            }
                                            className="rounded-lg border p-3 disabled:opacity-50"
                                        />

                                        <input
                                            type="time"
                                            value={row.end_time}
                                            disabled={!row.is_active || row.day_of_week === 0}
                                            onChange={(e) =>
                                                updateRow(
                                                    row.day_of_week,
                                                    'end_time',
                                                    e.target.value
                                                )
                                            }
                                            className="rounded-lg border p-3 disabled:opacity-50"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar horarios'}
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}