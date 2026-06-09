'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    getWorkingHoursByBarber,
    type WorkingHourItem,
} from '@/src/features/working-hours/api/get-working-hours-by-barberos'
import { upsertWorkingHour } from '@/src/features/working-hours/api/upsert-working-hour'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminAlert } from '../../admin/components/admin-alert'

type Barber = {
    id: string
    business_id: string
    name: string
    photo_url?: string | null
    specialty?: string | null
}

type Props = {
    barbers: Barber[]
}

const weekDays = [
    {
        value: 1,
        label: 'Lunes',
        short: 'LU',
        badgeClass: 'bg-[#C8942E] text-white',
        softClass: 'bg-[#C8942E]/10 text-[#8A5D16]',
    },
    {
        value: 2,
        label: 'Martes',
        short: 'MA',
        badgeClass: 'bg-[#D97706] text-white',
        softClass: 'bg-orange-100 text-orange-800',
    },
    {
        value: 3,
        label: 'Miércoles',
        short: 'MI',
        badgeClass: 'bg-[#7C3AED] text-white',
        softClass: 'bg-violet-100 text-violet-800',
    },
    {
        value: 4,
        label: 'Jueves',
        short: 'JU',
        badgeClass: 'bg-[#0F766E] text-white',
        softClass: 'bg-teal-100 text-teal-800',
    },
    {
        value: 5,
        label: 'Viernes',
        short: 'VI',
        badgeClass: 'bg-[#2563EB] text-white',
        softClass: 'bg-blue-100 text-blue-800',
    },
    {
        value: 6,
        label: 'Sábado',
        short: 'SÁ',
        badgeClass: 'bg-[#DB2777] text-white',
        softClass: 'bg-pink-100 text-pink-800',
    },
    {
        value: 0,
        label: 'Domingo',
        short: 'DO',
        badgeClass: 'bg-[#64748B] text-white',
        softClass: 'bg-slate-100 text-slate-700',
    },
]

type WorkingHourFormRow = {
    id?: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

function getDefaultRows(): WorkingHourFormRow[] {
    return weekDays.map((day) => ({
        day_of_week: day.value,
        start_time:
            day.value === 6 || day.value === 0
                ? '10:00'
                : '09:00',
        end_time:
            day.value === 6 || day.value === 0
                ? '15:00'
                : '20:00',
        is_active: day.value !== 0,
    }))
}

function getDayMeta(dayOfWeek: number) {
    return (
        weekDays.find((day) => day.value === dayOfWeek) ?? {
            value: dayOfWeek,
            label: String(dayOfWeek),
            short: String(dayOfWeek),
            badgeClass: 'bg-slate-500 text-white',
            softClass: 'bg-slate-100 text-slate-700',
        }
    )
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

export function AdminWorkingHoursForm({ barbers }: Props) {
    const isSingleBarber = barbers.length === 1

    const [selectedBarberId, setSelectedBarberId] = useState(
        isSingleBarber ? barbers[0]?.id ?? '' : ''
    )

    const [rows, setRows] = useState<WorkingHourFormRow[]>(getDefaultRows)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)


    const selectedBarber = useMemo(() => {
        return barbers.find((barber) => barber.id === selectedBarberId) ?? null
    }, [barbers, selectedBarberId])

    const activeDaysCount = rows.filter((row) => row.is_active).length

    useEffect(() => {
        if (isSingleBarber && barbers[0] && selectedBarberId !== barbers[0].id) {
            setSelectedBarberId(barbers[0].id)
        }
    }, [isSingleBarber, barbers, selectedBarberId])

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!hasUnsavedChanges) return

            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [hasUnsavedChanges])

    useEffect(() => {
        async function loadWorkingHours() {
            if (!selectedBarberId) {
                setRows(getDefaultRows())
                setHasUnsavedChanges(false)
                return
            }

            setLoading(true)
            setMessage('')
            setErrorMessage('')

            try {
                const data = await getWorkingHoursByBarber(selectedBarberId)
                const defaultRows = getDefaultRows()

                const mergedRows = weekDays.map((day) => {
                    const existing = data.find(
                        (item) => item.day_of_week === day.value
                    ) as WorkingHourItem | undefined

                    const defaultRow = defaultRows.find(
                        (item) => item.day_of_week === day.value
                    )

                    return {
                        id: existing?.id,
                        day_of_week: day.value,
                        start_time:
                            existing?.start_time?.slice(0, 5) ??
                            defaultRow?.start_time ??
                            '09:00',
                        end_time:
                            existing?.end_time?.slice(0, 5) ??
                            defaultRow?.end_time ??
                            '20:00',
                        is_active:
                            existing?.is_active ??
                            defaultRow?.is_active ??
                            false,
                    }
                })

                setRows(mergedRows)
                setHasUnsavedChanges(false)
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

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!hasUnsavedChanges) return

            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [hasUnsavedChanges])

    function updateRow(
        dayOfWeek: number,
        field: keyof WorkingHourFormRow,
        value: string | boolean
    ) {
        setRows((prev) =>
            prev.map((row) => {
                if (row.day_of_week !== dayOfWeek) return row

                return {
                    ...row,
                    [field]: value,
                }
            })
        )

        setHasUnsavedChanges(true)
        setMessage('')
        setErrorMessage('')
    }

    async function handleSave() {
        if (!selectedBarber) {
            setErrorMessage('Selecciona un barbero')
            return
        }

        setSaving(true)
        setMessage('')
        setErrorMessage('')
        setHasUnsavedChanges(false)

        try {
            for (const row of rows) {
                if (row.is_active && row.start_time >= row.end_time) {
                    const dayMeta = getDayMeta(row.day_of_week)
                    throw new Error(`El horario de ${dayMeta.label} no es válido`)
                }

                await upsertWorkingHour({
                    id: row.id,
                    business_id: selectedBarber.business_id,
                    barber_id: selectedBarber.id,
                    day_of_week: row.day_of_week,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    is_active: row.is_active,
                })
            }
            setHasUnsavedChanges(false)
            setMessage('La disponibilidad pública fue actualizada correctamente.')
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error guardando horarios'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="space-y-4">
            <AdminAlert
                floating
                variant="error"
                title="No se pudo guardar"
                message={errorMessage}
                onClose={() => setErrorMessage('')}
            />

            <AdminAlert
                floating
                variant="success"
                title="Horarios actualizados"
                message={message}
                onClose={() => setMessage('')}
            />
            <div className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[22px] bg-[#C8942E]/15 ring-1 ring-black/10">
                            {selectedBarber?.photo_url ? (
                                <img
                                    src={selectedBarber.photo_url}
                                    alt={selectedBarber.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-black text-[#8A5D16]">
                                    {selectedBarber
                                        ? getInitials(selectedBarber.name)
                                        : 'B'}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Profesional
                            </p>

                            <h3 className="mt-1 truncate text-2xl font-black leading-none text-slate-950">
                                {selectedBarber
                                    ? selectedBarber.name
                                    : isSingleBarber
                                        ? 'Mis horarios'
                                        : 'Horarios por barbero'}
                            </h3>

                            <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                                {selectedBarber?.specialty ||
                                    (selectedBarber
                                        ? `${activeDaysCount} días activos esta semana`
                                        : 'Selecciona un profesional para editar su disponibilidad')}
                            </p>
                        </div>
                    </div>

                    {!isSingleBarber && (
                        <AdminSelect
                            id="working-hours-barber"
                            label="Cambiar barbero"
                            value={selectedBarberId}
                            onChange={setSelectedBarberId}
                            options={[
                                { value: '', label: 'Selecciona un barbero' },
                                ...barbers.map((barber) => ({
                                    value: barber.id,
                                    label: barber.name,
                                })),
                            ]}
                            maxMenuHeight={220}
                        />
                    )}
                </div>
            </div>


            {!selectedBarberId ? (
                <div className="rounded-[24px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        ⏰
                    </div>

                    <h3 className="mt-4 text-xl font-black text-slate-950">
                        Selecciona un barbero
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                        Al seleccionar un profesional podrás editar sus días activos, apertura y cierre.
                    </p>
                </div>
            ) : loading ? (
                <div className="space-y-2.5">
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-[82px] animate-pulse rounded-[22px] border border-black/10 bg-[#FBF7EE]"
                        />
                    ))}
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setRows((prev) =>
                                    prev.map((row) =>
                                        row.day_of_week >= 1 && row.day_of_week <= 5
                                            ? {
                                                ...row,
                                                is_active: true,
                                                start_time: '10:00',
                                                end_time: '20:00',
                                            }
                                            : row
                                    )
                                )
                                setHasUnsavedChanges(true)
                                setMessage('')
                                setErrorMessage('')
                            }}
                            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-[#FFFCF4]"
                        >
                            Aplicar lunes a viernes
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const monday = rows.find((row) => row.day_of_week === 1)

                                if (!monday) return

                                setRows((prev) =>
                                    prev.map((row) => ({
                                        ...row,
                                        start_time: monday.start_time,
                                        end_time: monday.end_time,
                                        is_active: row.day_of_week === 0 ? row.is_active : monday.is_active,
                                    }))
                                )

                                setHasUnsavedChanges(true)
                                setMessage('')
                                setErrorMessage('')
                            }}
                            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-[#FFFCF4]"
                        >
                            Copiar lunes al resto
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setRows((prev) =>
                                    prev.map((row) => ({
                                        ...row,
                                        is_active: true,
                                    }))
                                )
                                setHasUnsavedChanges(true)
                                setMessage('')
                                setErrorMessage('')
                            }}
                            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-[#FFFCF4]"
                        >
                            Abrir todos
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setRows((prev) =>
                                    prev.map((row) => ({
                                        ...row,
                                        is_active: false,
                                    }))
                                )
                                setHasUnsavedChanges(true)
                                setMessage('')
                                setErrorMessage('')
                            }}
                            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-[#FFFCF4]"
                        >
                            Cerrar todos
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {rows.map((row) => {
                            const dayMeta = getDayMeta(row.day_of_week)
                            const isClosed = !row.is_active
                            const isInvalid = row.is_active && row.start_time >= row.end_time

                            return (
                                <article
                                    key={row.day_of_week}
                                    className={`rounded-[22px] border px-4 py-3 transition ${isInvalid
                                        ? 'border-red-300 bg-red-50'
                                        : isClosed
                                            ? 'border-black/10 bg-[#FBF7EE]'
                                            : 'border-[#C8942E]/25 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.045)]'
                                        }`}
                                >
                                    <div className="grid gap-3 md:grid-cols-[minmax(190px,1fr)_170px_170px_132px] md:items-end">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isClosed
                                                    ? dayMeta.softClass
                                                    : dayMeta.badgeClass
                                                    }`}
                                            >
                                                {dayMeta.short}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-lg font-black leading-tight text-slate-950">
                                                        {dayMeta.label}
                                                    </h4>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isClosed
                                                            ? 'bg-slate-100 text-slate-500'
                                                            : dayMeta.softClass
                                                            }`}
                                                    >
                                                        {isClosed ? 'Cerrado' : 'Activo'}
                                                    </span>
                                                </div>

                                                <p className="mt-0.5 text-sm font-medium text-slate-500">
                                                    {isClosed
                                                        ? 'Día sin atención'
                                                        : `${row.start_time} a ${row.end_time}`}
                                                </p>
                                            </div>
                                        </div>

                                        <AdminInput
                                            id={`start-time-${row.day_of_week}`}
                                            label="Abre"
                                            type="time"
                                            value={row.start_time}
                                            disabled={isClosed}
                                            compact
                                            onChange={(value) =>
                                                updateRow(row.day_of_week, 'start_time', value)
                                            }
                                        />

                                        <AdminInput
                                            id={`end-time-${row.day_of_week}`}
                                            label="Cierra"
                                            type="time"
                                            value={row.end_time}
                                            disabled={isClosed}
                                            compact
                                            onChange={(value) =>
                                                updateRow(row.day_of_week, 'end_time', value)
                                            }
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateRow(
                                                    row.day_of_week,
                                                    'is_active',
                                                    !row.is_active
                                                )
                                            }
                                            className={`flex h-10 w-full items-center justify-center rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] ${row.is_active
                                                ? 'bg-[#C8942E] text-white shadow-[0_10px_22px_rgba(200,148,46,0.18)] hover:brightness-105'
                                                : 'border border-black/10 bg-white text-slate-600 hover:bg-[#FFFCF4]'
                                                }`}
                                        >
                                            {row.is_active ? 'Activo' : 'Cerrado'}
                                        </button>
                                    </div>
                                    {isInvalid && (
                                        <p className="mt-2 text-xs font-bold text-red-600">
                                            La hora de cierre debe ser posterior a la hora de apertura.
                                        </p>
                                    )}
                                </article>
                            )
                        })}
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-4 border-t border-black/10 bg-[#FFFCF4]/92 px-4 py-3 backdrop-blur md:-mx-5 md:px-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium leading-6 text-slate-500">
                                {hasUnsavedChanges
                                    ? 'Tienes cambios sin guardar.'
                                    : `${activeDaysCount} día${activeDaysCount === 1 ? '' : 's'} activo${activeDaysCount === 1 ? '' : 's'}. La disponibilidad pública está actualizada.`}
                            </p>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                            >
                                {saving
                                    ? 'Guardando...'
                                    : hasUnsavedChanges
                                        ? 'Guardar cambios'
                                        : 'Guardar horarios'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}