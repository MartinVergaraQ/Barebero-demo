'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

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

const MOBILE_INITIAL_LIMIT = 4

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

function getCategoryLabel(service: PublicService) {
    const category = getServiceCategory(service)

    if (category === 'combos') return 'Combo'
    if (category === 'barba') return 'Barba'
    if (category === 'corte') return 'Corte'

    return 'Servicio'
}

export function PublicServicesExplorer({
    services,
    businessSlug,
    primary,
}: PublicServicesExplorerProps) {
    const [search, setSearch] = useState('')
    const [showAll, setShowAll] = useState(false)
    const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('all')

    const filteredServices = useMemo(() => {
        const query = normalize(search.trim())

        return services
            .filter((service) => {
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
            .sort((a, b) => {
                if (a.is_popular && !b.is_popular) return -1
                if (!a.is_popular && b.is_popular) return 1
                return a.name.localeCompare(b.name)
            })
    }, [services, search, activeFilter])

    const visibleServices = showAll
        ? filteredServices
        : filteredServices.slice(0, MOBILE_INITIAL_LIMIT)

    const hasHiddenServices = filteredServices.length > MOBILE_INITIAL_LIMIT

    useEffect(() => {
        setShowAll(false)
    }, [search, activeFilter])

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="rounded-[22px] border border-white bg-white/85 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur md:rounded-[28px] md:p-4">
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        ⌕
                    </span>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Busca corte, barba, fade..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)] md:px-11 md:py-4 md:text-base"
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

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((filter) => {
                        const active = activeFilter === filter.key

                        return (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveFilter(filter.key)}
                                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition duration-300 active:scale-95 md:px-5 md:py-2.5 md:text-sm ${active
                                    ? 'text-white shadow-[0_10px_24px_rgba(183,121,31,0.22)]'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-slate-950'
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
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                    <div
                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                        style={{ backgroundColor: `${primary}18`, color: primary }}
                    >
                        ✂
                    </div>

                    <p className="text-base font-black text-slate-950 md:text-lg">
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
                <>
                    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
                        {visibleServices.map((service, index) => (
                            <article
                                key={service.id}
                                className="group relative overflow-hidden rounded-[18px] border border-slate-100 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)] md:rounded-[24px] md:p-5"
                                style={{
                                    animation: `serviceFadeUp 360ms ease-out both`,
                                    animationDelay: `${index * 45}ms`,
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <p
                                                className="text-[9px] font-black uppercase tracking-[0.18em]"
                                                style={{ color: primary }}
                                            >
                                                {getCategoryLabel(service)}
                                            </p>

                                            {service.is_popular && (
                                                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-100">
                                                    Popular
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="line-clamp-1 text-sm font-black leading-tight text-slate-950 md:text-lg">
                                            {service.name}
                                        </h2>

                                        <p className="mt-1 line-clamp-1 text-[11px] font-semibold leading-4 text-slate-500 md:text-sm">
                                            {service.description || 'Servicio profesional de barbería.'}
                                        </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <p
                                            className="text-base font-black leading-none md:text-xl"
                                            style={{ color: primary }}
                                        >
                                            {formatPrice(service.price)}
                                        </p>

                                        <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                            CLP
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                        <span>⏱</span>
                                        <span>{service.duration_minutes} min</span>
                                    </div>

                                    <Link
                                        href={`/b/${businessSlug}/reservar?serviceId=${service.id}`}
                                        className="inline-flex h-10 min-w-[118px] items-center justify-center rounded-xl px-4 text-xs font-black text-white shadow-[0_10px_22px_rgba(183,121,31,0.18)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] md:h-10 md:min-w-[120px] md:text-sm"
                                        style={{ backgroundColor: primary }}
                                    >
                                        Reservar
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>

                    {hasHiddenServices && (
                        <div className="pt-1 text-center">
                            <button
                                type="button"
                                onClick={() => setShowAll((current) => !current)}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-slate-950 active:scale-[0.98]"
                            >
                                {showAll
                                    ? 'Ver menos servicios'
                                    : `Ver todos los servicios (${filteredServices.length})`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                @keyframes serviceFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
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