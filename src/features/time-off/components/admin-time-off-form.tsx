'use client'

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    usePathname,
    useRouter,
    useSearchParams,
} from 'next/navigation'
import { createTimeOffServer } from '@/src/features/time-off/api/create-time-off-server'
import {
    getTimeOffByBarber,
    type TimeOffItem,
} from '@/src/features/time-off/api/get-time-off-by-barber'
import { DeleteTimeOffButton } from '@/src/features/time-off/components/delete-time-off-button'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminAlert } from '@/src/features/admin/components/admin-alert'

type Barber = {
    id: string
    business_id: string
    name: string
    photo_url?: string | null
    specialty?: string | null
}

type Props = {
    barbers: Barber[]
    canEdit: boolean
    subscriptionBlockReason?: string
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function formatDisplayDateTime(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('es-CL', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date)
}

function getDurationLabel(startAt: string, endAt: string) {
    const start = new Date(startAt)
    const end = new Date(endAt)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return '-'
    }

    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))

    if (minutes < 60) return `${minutes} min`

    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function AdminTimeOffForm({ barbers, canEdit, subscriptionBlockReason }: Props) {
    const isSingleBarber = barbers.length === 1
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const barberIdFromUrl = searchParams.get('barber')

    const validBarberIdFromUrl =
        barberIdFromUrl &&
            barbers.some(
                (barber) => barber.id === barberIdFromUrl
            )
            ? barberIdFromUrl
            : ''

    const [selectedBarberId, setSelectedBarberId] =
        useState(
            validBarberIdFromUrl ||
            (isSingleBarber
                ? barbers[0]?.id ?? ''
                : '')
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
        const requestedBarberId =
            searchParams.get('barber')

        const requestedBarberExists =
            requestedBarberId &&
            barbers.some(
                (barber) =>
                    barber.id === requestedBarberId
            )

        if (requestedBarberExists) {
            setSelectedBarberId(requestedBarberId)
            return
        }

        if (isSingleBarber && barbers[0]) {
            setSelectedBarberId(barbers[0].id)
            return
        }

        setSelectedBarberId('')
    }, [searchParams, barbers, isSingleBarber])

    const loadRequestIdRef = useRef(0)

    const loadItems = useCallback(
        async (barberId: string) => {
            const normalizedBarberId =
                typeof barberId === 'string'
                    ? barberId.trim()
                    : ''

            if (!normalizedBarberId) {
                setItems([])
                return
            }

            const requestId =
                loadRequestIdRef.current + 1

            loadRequestIdRef.current = requestId

            setLoadingList(true)
            setErrorMessage('')

            try {
                const data =
                    await getTimeOffByBarber(
                        normalizedBarberId
                    )

                if (
                    requestId !==
                    loadRequestIdRef.current
                ) {
                    return
                }

                setItems(data)
            } catch (error) {
                if (
                    requestId !==
                    loadRequestIdRef.current
                ) {
                    return
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Error cargando bloqueos'
                )

                setItems([])
            } finally {
                if (
                    requestId ===
                    loadRequestIdRef.current
                ) {
                    setLoadingList(false)
                }
            }
        },
        []
    )

    useEffect(() => {
        if (!selectedBarberId) {
            loadRequestIdRef.current += 1
            setItems([])
            setLoadingList(false)
            return
        }

        setItems([])
        void loadItems(selectedBarberId)
    }, [selectedBarberId, loadItems])

    function handleBarberChange(nextBarberId: string) {
        if (nextBarberId === selectedBarberId) {
            return
        }

        const hasDraft =
            Boolean(form.start_at) ||
            Boolean(form.end_at) ||
            Boolean(form.reason.trim())

        if (hasDraft) {
            const confirmed = window.confirm(
                'Tienes un bloqueo sin guardar. ¿Deseas cambiar de barbero y descartar esos datos?'
            )

            if (!confirmed) {
                return
            }
        }

        setForm({
            start_at: '',
            end_at: '',
            reason: '',
        })

        setMessage('')
        setErrorMessage('')
        setItems([])
        setSelectedBarberId(nextBarberId)

        const params = new URLSearchParams(
            searchParams.toString()
        )

        if (nextBarberId) {
            params.set('barber', nextBarberId)
        } else {
            params.delete('barber')
        }

        const queryString = params.toString()

        router.replace(
            queryString
                ? `${pathname}?${queryString}`
                : pathname,
            {
                scroll: false,
            }
        )
    }

    function updateField(field: keyof typeof form, value: string) {
        if (!canEdit) return

        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!canEdit) {
            setErrorMessage(
                subscriptionBlockReason ||
                'La suscripción actual no permite crear bloqueos.'
            )
            return
        }
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

            const result = await createTimeOffServer({
                barber_id: selectedBarber.id,
                start_at: start.toISOString(),
                end_at: end.toISOString(),
                reason: form.reason,
            })

            if (!result.ok) {
                throw new Error(result.message)
            }

            setMessage('El tramo quedó bloqueado y ya no aparecerá para reservas públicas.')
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
        <section className="space-y-6">
            <AdminAlert
                floating
                variant="error"
                title="No se pudo procesar"
                message={errorMessage}
                onClose={() => setErrorMessage('')}
            />

            <AdminAlert
                floating
                variant="success"
                title="Bloqueos actualizados"
                message={message}
                onClose={() => setMessage('')}
            />

            {!canEdit && (
                <div className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <rect x="5" y="10" width="14" height="10" rx="2" />
                            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">
                                Bloqueos en modo lectura
                            </p>

                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                Pago pendiente
                            </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {subscriptionBlockReason ||
                                'Puedes consultar los bloqueos existentes, pero no crear ni eliminar registros.'}
                        </p>
                    </div>
                </div>
            )}
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
                                    {selectedBarber ? getInitials(selectedBarber.name) : 'B'}
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
                                        ? 'Mis bloqueos'
                                        : 'Bloqueos por barbero'}
                            </h3>

                            <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                                {selectedBarber?.specialty ||
                                    (selectedBarber
                                        ? `${items.length} bloqueo${items.length === 1 ? '' : 's'} registrado${items.length === 1 ? '' : 's'}`
                                        : 'Selecciona un profesional para cargar y crear bloqueos')}
                            </p>
                        </div>
                    </div>

                    {!isSingleBarber && (
                        <AdminSelect
                            id="time-off-barber"
                            label="Cambiar barbero"
                            value={selectedBarberId}
                            onChange={handleBarberChange}
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

            <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
                <section className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-5 xl:sticky xl:top-8 xl:h-fit">
                    <div className="mb-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Nuevo bloqueo
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            {canEdit
                                ? 'Crear tramo no disponible'
                                : 'Creación de bloqueos deshabilitada'}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            {canEdit
                                ? 'Define inicio, fin y motivo del bloqueo.'
                                : 'Puedes consultar los registros, pero no crear nuevos bloqueos.'}
                        </p>
                    </div>

                    {!selectedBarberId ? (
                        <div className="rounded-[22px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-10 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                                🚫
                            </div>

                            <h4 className="mt-4 text-lg font-black text-slate-950">
                                Selecciona un barbero
                            </h4>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Primero selecciona un profesional para crear bloqueos.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="rounded-[22px] border border-black/10 bg-white/55 p-3">
                                <div className="mb-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                        Tramo
                                    </p>

                                    <p className="mt-1 text-sm font-black text-slate-950">
                                        Define cuándo empieza y termina el bloqueo.
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    <AdminInput
                                        id="time-off-start"
                                        disabled={!canEdit || !selectedBarber || saving}
                                        label="Inicio"
                                        type="datetime-local"
                                        value={form.start_at}
                                        onChange={(value) => updateField('start_at', value)}
                                    />

                                    <AdminInput
                                        id="time-off-end"
                                        disabled={!canEdit || !selectedBarber || saving}
                                        label="Fin"
                                        type="datetime-local"
                                        value={form.end_at}
                                        onChange={(value) => updateField('end_at', value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="time-off-reason"
                                    className="mb-2 block text-sm font-black text-slate-700"
                                >
                                    Motivo
                                </label>

                                <textarea
                                    id="time-off-reason"
                                    value={form.reason}
                                    onChange={(event) =>
                                        updateField(
                                            'reason',
                                            event.target.value
                                        )
                                    }
                                    disabled={!canEdit || saving}
                                    rows={4}
                                    maxLength={500}
                                    placeholder="Vacaciones, permiso, cierre parcial..."
                                    className="min-h-[120px] w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <p className="mt-1 text-right text-xs font-semibold text-slate-400">
                                    {form.reason.length}/500
                                </p>
                            </div>

                            {canEdit ? (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                    {saving ? 'Guardando...' : 'Crear bloqueo'}
                                </button>
                            ) : (
                                <div className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-500">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <rect x="5" y="10" width="14" height="10" rx="2" />
                                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                    </svg>

                                    Solo lectura
                                </div>
                            )}
                        </form>
                    )}
                </section>

                <section className="overflow-hidden rounded-[26px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Registros
                            </p>

                            <h3 className="mt-1 text-xl font-black text-slate-950">
                                {isSingleBarber
                                    ? 'Mis bloqueos existentes'
                                    : 'Bloqueos existentes'}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa los tramos actualmente bloqueados.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {items.length} bloqueo{items.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {!selectedBarberId ? (
                        <div className="px-5 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                👤
                            </div>

                            <h4 className="mt-4 text-xl font-black text-slate-950">
                                Selecciona un barbero
                            </h4>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Al seleccionar un profesional podrás ver sus bloqueos registrados.
                            </p>
                        </div>
                    ) : loadingList ? (
                        <div className="space-y-3 p-5">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-28 animate-pulse rounded-[24px] bg-[#FBF7EE]"
                                />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C8942E]/15 bg-[#C8942E]/10 text-[#9A6818]">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-7 w-7"
                                    aria-hidden="true"
                                >
                                    <rect x="3" y="5" width="18" height="16" rx="3" />
                                    <path d="M8 3v4M16 3v4M3 10h18" />
                                    <path d="M9 15h6" />
                                </svg>
                            </div>

                            <h4 className="mt-4 text-xl font-black text-slate-950">
                                Sin bloqueos registrados
                            </h4>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                {isSingleBarber
                                    ? 'No tienes bloqueos puntuales por ahora.'
                                    : 'Este barbero no tiene bloqueos puntuales registrados.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {items.map((item) => (
                                <article
                                    key={item.id}
                                    className="grid gap-4 px-5 py-5 transition hover:bg-[#FBF7EE] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                                                Bloqueado
                                            </span>

                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                {getDurationLabel(item.start_at, item.end_at)}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            <div className="rounded-2xl bg-[#FBF7EE] px-4 py-3 ring-1 ring-black/5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    Inicio
                                                </p>

                                                <p className="mt-1 text-sm font-black text-slate-950">
                                                    {formatDisplayDateTime(item.start_at)}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-[#FBF7EE] px-4 py-3 ring-1 ring-black/5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    Fin
                                                </p>

                                                <p className="mt-1 text-sm font-black text-slate-950">
                                                    {formatDisplayDateTime(item.end_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                                            <span className="font-black text-slate-700">
                                                Motivo:
                                            </span>{' '}
                                            {item.reason || 'Sin motivo especificado.'}
                                        </p>
                                    </div>

                                    <div className="lg:justify-self-end">
                                        <DeleteTimeOffButton
                                            id={item.id}
                                            canEdit={canEdit}
                                            subscriptionBlockReason={subscriptionBlockReason}
                                            onDeleted={() => loadItems(item.barber_id)}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    )
}