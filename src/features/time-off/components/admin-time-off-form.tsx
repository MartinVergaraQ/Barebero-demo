'use client'

import { useEffect, useState } from 'react'
import { createTimeOff } from '@/src/features/time-off/api/create-time-off'
import {
    getTimeOffByBarber,
    type TimeOffItem,
} from '@/src/features/time-off/api/get-time-off-by-barber'
import { DeleteTimeOffButton } from '@/src/features/time-off/components/delete-time-off-button'

type Barber = {
    id: string
    business_id: string
    name: string
}

type Props = {
    barbers: Barber[]
}

function formatDateTimeLocal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0')

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())

    return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function AdminTimeOffForm({ barbers }: Props) {
    const isSingleBarber = barbers.length === 1
    const [selectedBarberId, setSelectedBarberId] = useState(
        isSingleBarber ? barbers[0].id : ''
    )
    const [items, setItems] = useState<TimeOffItem[]>([])

    const [form, setForm] = useState({
        start_at: '',
        end_at: '',
        reason: '',
    })

    const [loadingList, setLoadingList] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const selectedBarber = barbers.find(
        (barber) => barber.id === selectedBarberId
    )

    useEffect(() => {
        if (isSingleBarber && barbers[0] && selectedBarberId !== barbers[0].id) {
            setSelectedBarberId(barbers[0].id)
        }
    }, [isSingleBarber, barbers, selectedBarberId])

    async function loadItems(barberId: string) {
        setLoadingList(true)
        setErrorMessage('')

        try {
            const data = await getTimeOffByBarber(barberId)
            setItems(data)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error cargando bloqueos'
            )
        } finally {
            setLoadingList(false)
        }
    }

    useEffect(() => {
        if (!selectedBarberId) {
            setItems([])
            return
        }

        loadItems(selectedBarberId)
    }, [selectedBarberId])

    function handleChange(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value } = e.target

        if (name === 'barber_id') {
            setSelectedBarberId(value)
            return
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!selectedBarber) throw new Error('Selecciona un barbero')
            if (!form.start_at) throw new Error('Ingresa fecha/hora de inicio')
            if (!form.end_at) throw new Error('Ingresa fecha/hora de fin')

            const start = new Date(form.start_at)
            const end = new Date(form.end_at)

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                throw new Error('Las fechas no son válidas')
            }

            if (start >= end) {
                throw new Error('La fecha de inicio debe ser menor que la de fin')
            }

            await createTimeOff({
                business_id: selectedBarber.business_id,
                barber_id: selectedBarber.id,
                start_at: start.toISOString(),
                end_at: end.toISOString(),
                reason: form.reason,
            })

            setMessage('Bloqueo creado correctamente')
            setForm({
                start_at: '',
                end_at: '',
                reason: '',
            })

            await loadItems(selectedBarber.id)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando bloqueo'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-xl font-semibold">
                {isSingleBarber ? 'Mis bloqueos' : 'Bloqueos puntuales'}
            </h2>

            {selectedBarber && (
                <p className="mb-4 text-sm text-slate-600">
                    {isSingleBarber
                        ? 'Configura tus bloqueos puntuales para horas o tramos en que no atenderás.'
                        : `Editando bloqueos de ${selectedBarber.name}.`}
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

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                {!isSingleBarber && (
                    <div className="md:col-span-2">
                        <label className="mb-2 block font-medium">Barbero</label>
                        <select
                            name="barber_id"
                            value={selectedBarberId}
                            onChange={handleChange}
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

                <div>
                    <label className="mb-2 block font-medium">Inicio</label>
                    <input
                        name="start_at"
                        type="datetime-local"
                        value={form.start_at}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Fin</label>
                    <input
                        name="end_at"
                        type="datetime-local"
                        value={form.end_at}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Motivo</label>
                    <textarea
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={3}
                        placeholder="Vacaciones, permiso, cierre parcial..."
                    />
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Crear bloqueo'}
                    </button>
                </div>
            </form>

            <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold">
                    {isSingleBarber ? 'Mis bloqueos existentes' : 'Bloqueos existentes'}
                </h3>

                {!selectedBarberId ? (
                    <p>Selecciona un barbero para ver sus bloqueos.</p>
                ) : loadingList ? (
                    <p>Cargando bloqueos...</p>
                ) : items.length === 0 ? (
                    <p>
                        {isSingleBarber
                            ? 'No tienes bloqueos registrados.'
                            : 'No hay bloqueos registrados.'}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <article key={item.id} className="rounded-lg border p-4">
                                <p>
                                    <span className="font-medium">Inicio:</span>{' '}
                                    {formatDateTimeLocal(new Date(item.start_at))}
                                </p>
                                <p>
                                    <span className="font-medium">Fin:</span>{' '}
                                    {formatDateTimeLocal(new Date(item.end_at))}
                                </p>
                                <p>
                                    <span className="font-medium">Motivo:</span>{' '}
                                    {item.reason || '-'}
                                </p>
                                <DeleteTimeOffButton
                                    id={item.id}
                                    onDeleted={() => loadItems(item.barber_id)}
                                />
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}