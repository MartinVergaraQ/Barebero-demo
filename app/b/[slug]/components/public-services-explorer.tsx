'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type PublicService = {
    id: string
    name: string
    slug: string
    description: string | null
    duration_minutes: number
    price: number
    is_popular?: boolean | null
}

type PublicServicesExplorerProps = {
    services: PublicService[]
    businessSlug: string
    primary: string
}

const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'corte', label: 'Corte' },
    { key: 'barba', label: 'Barba' },
    { key: 'combos', label: 'Combos' },
] as const

function formatPrice(price: number | string) {
    const numericPrice = typeof price === 'string' ? Number(price) : price
    if (Number.isNaN(numericPrice)) return '$0'

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(numericPrice)
}

function normalize(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function getServiceCategory(service: PublicService) {
    const value = normalize(`${service.name} ${service.slug} ${service.description ?? ''}`)

    if (
        value.includes('combo') ||
        value.includes('+') ||
        value.includes('cabello y barba') ||
        value.includes('corte y barba')
    ) {
        return 'combos'
    }

    if (value.includes('barba') || value.includes('perfilado')) {
        return 'barba'
    }

    if (
        value.includes('corte') ||
        value.includes('cabello') ||
        value.includes('fade') ||
        value.includes('degradado')
    ) {
        return 'corte'
    }

    return 'all'
}

export function PublicServicesExplorer({
    services,
    businessSlug,
    primary,
}: PublicServicesExplorerProps) {
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('all')

    const filteredServices = useMemo(() => {
        const query = normalize(search.trim())

        return services.filter((service) => {
            const serviceText = normalize(
                `${service.name} ${service.slug} ${service.description ?? ''}`
            )

            const matchesSearch = !query || serviceText.includes(query)

            const serviceCategory = getServiceCategory(service)

            const matchesFilter =
                activeFilter === 'all' ||
                serviceCategory === activeFilter ||
                (activeFilter === 'combos' && serviceText.includes('+'))

            return matchesSearch && matchesFilter
        })
    }, [services, search, activeFilter])

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="rounded-[24px] border border-white bg-white/85 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur md:rounded-[28px] md:p-4">
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        ⌕
                    </span>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Busca por corte, barba, fade, combo..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)] md:px-11 md:py-4 md:text-base"
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Limpiar búsqueda"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((filter) => {
                        const active = activeFilter === filter.key

                        return (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveFilter(filter.key)}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition duration-300 active:scale-95 md:px-5 md:py-2.5 ${active
                                    ? 'text-white shadow-[0_12px_28px_rgba(183,121,31,0.24)]'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-amber-200 hover:text-slate-950 hover:shadow-sm'
                                    }`}
                                style={active ? { backgroundColor: primary } : undefined}
                            >
                                {filter.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {filteredServices.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                    <div
                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                        style={{ backgroundColor: `${primary}18`, color: primary }}
                    >
                        ✂
                    </div>

                    <p className="text-lg font-black text-slate-950">
                        No hay servicios disponibles en esta categoría
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setSearch('')
                            setActiveFilter('all')
                        }}
                        className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(183,121,31,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                        style={{ backgroundColor: primary }}
                    >
                        Ver todos los servicios
                    </button>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                    {filteredServices.map((service, index) => (
                        <article
                            key={service.id}
                            className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(15,23,42,0.14)] md:min-h-[260px] md:rounded-[30px] md:p-5"
                            style={{
                                animation: `serviceFadeUp 420ms ease-out both`,
                                animationDelay: `${index * 60}ms`,
                            }}
                        >
                            <div
                                className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                                style={{
                                    background:
                                        'radial-gradient(circle at top right, rgba(183,121,31,0.13), transparent 34%), linear-gradient(180deg, rgba(255,250,242,0.45), transparent 45%)',
                                }}
                            />

                            <div className="relative flex h-full flex-col">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p
                                            className="mb-2 text-[10px] font-black uppercase tracking-[0.24em]"
                                            style={{ color: primary }}
                                        >
                                            {getServiceCategory(service) === 'combos'
                                                ? 'Combo'
                                                : getServiceCategory(service) === 'barba'
                                                    ? 'Barba'
                                                    : 'Servicio'}
                                        </p>
                                    </div>

                                    {service.is_popular && (
                                        <span className="shrink-0 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 shadow-[0_6px_18px_rgba(183,121,31,0.14)]">
                                            Popular
                                        </span>
                                    )}
                                </div>

                                <div className="min-h-[72px] pt-2">
                                    <h2 className="line-clamp-2 text-[22px] font-black leading-tight text-slate-950 md:text-xl">
                                        {service.name}
                                    </h2>

                                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                                        {service.description || 'Servicio profesional de barbería.'}
                                    </p>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-inner md:mt-5 md:py-4">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Duración
                                            </p>
                                            <p className="mt-1 text-base font-black text-slate-900">
                                                {service.duration_minutes} min
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 md:text-[11px]">
                                                Precio
                                            </p>

                                            <p
                                                className="mt-1 text-[22px] font-black leading-none md:text-2xl"
                                                style={{ color: primary }}
                                            >
                                                {formatPrice(service.price)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-3 md:h-5" />
                                <Link
                                    href={`/b/${businessSlug}/reservar?serviceId=${service.id}`}
                                    className="relative mt-auto inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(183,121,31,0.20)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(183,121,31,0.30)] active:translate-y-0 active:scale-[0.98] md:py-3.5"
                                    style={{ backgroundColor: primary }}
                                >
                                    Reservar
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes serviceFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(14px);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}