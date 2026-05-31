'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type GalleryBarber = {
    id: string
    name: string
}

type GalleryItem = {
    id: string
    title: string | null
    image_url?: string | null
    media_url?: string | null
    display_order: number
    barber_id: string | null
    service_id: string | null
    barber?: {
        id: string
        name: string
    } | null
    barbers?: {
        id: string
        name: string
    }[] | null
}

type PublicGallerySectionProps = {
    items: GalleryItem[]
    barbers: GalleryBarber[]
    businessSlug: string
}

const PRIMARY = '#B7791F'
const INITIAL_GALLERY_LIMIT = 5

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

export function PublicGallerySection({
    items,
    barbers,
    businessSlug,
}: PublicGallerySectionProps) {
    const [activeBarberId, setActiveBarberId] = useState('all')
    const [showAll, setShowAll] = useState(false)

    const filters = useMemo(() => {
        return [
            {
                id: 'all',
                label: `Todos (${items.length})`,
            },
            ...barbers.map((barber) => {
                const count = items.filter((item) => item.barber_id === barber.id).length

                return {
                    id: barber.id,
                    label: `${barber.name.split(' ')[0]} (${count})`,
                }
            }),
        ]
    }, [barbers, items])

    const filteredItems = useMemo(() => {
        const result =
            activeBarberId === 'all'
                ? items
                : items.filter((item) => item.barber_id === activeBarberId)

        return [...result].sort((a, b) => a.display_order - b.display_order)
    }, [activeBarberId, items])

    const visibleItems = showAll
        ? filteredItems
        : filteredItems.slice(0, INITIAL_GALLERY_LIMIT)

    const hiddenItemsCount = Math.max(filteredItems.length - INITIAL_GALLERY_LIMIT, 0)

    useEffect(() => {
        setShowAll(false)
    }, [activeBarberId])

    function getBarberName(item: GalleryItem) {
        const directBarber = item.barbers?.[0]?.name
        if (directBarber) return directBarber

        return (
            barbers.find((barber) => barber.id === item.barber_id)?.name ??
            'Trabajo del equipo'
        )
    }

    function getImageUrl(item: GalleryItem) {
        return item.image_url || item.media_url || ''
    }

    function getBookingHref(item: GalleryItem) {
        const params = new URLSearchParams()

        if (item.service_id) {
            params.set('serviceId', item.service_id)
        }

        if (item.barber_id) {
            params.set('barberId', item.barber_id)
        }

        const query = params.toString()

        return `/b/${businessSlug}/reservar${query ? `?${query}` : ''}`
    }

    return (
        <section className="pb-10 md:pb-12">
            <header className="mb-4 md:mb-8">
                <div className="mb-3 flex items-center gap-3 md:mb-4">
                    <span
                        className="h-px w-8 md:w-10"
                        style={{ backgroundColor: PRIMARY }}
                    />

                    <p
                        className="text-[11px] font-black uppercase tracking-[0.28em] md:text-xs md:tracking-[0.32em]"
                        style={{ color: PRIMARY }}
                    >
                        Portafolio
                    </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="max-w-3xl font-display text-[34px] leading-none tracking-wide text-foreground md:text-6xl">
                            Trabajos recientes
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400 md:mt-4 md:text-lg md:leading-8">
                            Inspírate con resultados reales, revisa quién lo realizó y
                            reserva directamente con ese barbero.
                        </p>
                    </div>

                    <div className="hidden w-fit rounded-full border border-border-soft bg-white/[0.04] px-4 py-2 text-xs font-black text-slate-300 shadow-[0_12px_30px_rgba(0,0,0,0.22)] md:block md:px-5 md:py-3 md:text-sm">
                        {items.length} trabajo{items.length === 1 ? '' : 's'}
                    </div>
                </div>
            </header>

            <div className="mb-5 rounded-[22px] border border-border-soft bg-white/[0.04] p-2 shadow-[0_14px_38px_rgba(0,0,0,0.22)] backdrop-blur md:mb-7 md:rounded-[28px] md:p-3">
                <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {filters.map((filter) => {
                        const active = activeBarberId === filter.id

                        return (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setActiveBarberId(filter.id)}
                                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition duration-300 active:scale-95 md:px-5 md:py-3 ${active
                                    ? 'text-white shadow-[0_12px_26px_rgba(183,121,31,0.24)]'
                                    : 'border border-border-soft bg-white/[0.04] text-slate-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.07] hover:text-foreground hover:shadow-sm'
                                    }`}
                                style={active ? { backgroundColor: PRIMARY } : undefined}
                            >
                                {filter.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm md:rounded-[30px] md:p-10">
                    <p className="text-lg font-black text-slate-950 md:text-xl">
                        Aún no hay trabajos para este barbero
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        Prueba seleccionando otro profesional o vuelve a “Todos”.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div
                        className={
                            visibleItems.length <= 2
                                ? 'space-y-3'
                                : 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4'
                        }
                    >
                        {visibleItems.map((item, index) => {
                            const shouldUseListLayout = visibleItems.length <= 2
                            const imageUrl = getImageUrl(item)
                            const barberName = getBarberName(item)
                            const itemTitle = item.title?.trim() || 'Trabajo de barbería'
                            const featured = !shouldUseListLayout && index === 0

                            return (
                                <article
                                    key={item.id}
                                    className={`group relative overflow-hidden bg-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-white/10 transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.18)] ${shouldUseListLayout
                                        ? 'rounded-[24px]'
                                        : featured
                                            ? 'col-span-2 rounded-[24px] md:col-span-2 md:row-span-2 md:rounded-[30px]'
                                            : 'rounded-[20px] md:rounded-[24px]'
                                        }`}
                                >
                                    <div
                                        className={`relative overflow-hidden ${shouldUseListLayout
                                            ? 'h-[210px] md:h-[280px]'
                                            : featured
                                                ? 'h-[250px] md:h-[430px]'
                                                : 'h-[165px] md:h-[206px]'
                                            }`}
                                    >
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={itemTitle}
                                                className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-black text-slate-500">
                                                {getInitials(itemTitle)}
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/80" />

                                        <div className="absolute left-3 top-3 flex items-center gap-2">
                                            <span
                                                className="rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] shadow-sm backdrop-blur md:px-3 md:py-1.5 md:text-[10px]"
                                                style={{
                                                    borderColor: `${PRIMARY}66`,
                                                    backgroundColor: 'rgba(15,17,21,0.72)',
                                                    color: '#F6D58A',
                                                }}
                                            >
                                                Trabajo real
                                            </span>
                                        </div>

                                        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-[10px] font-black text-white shadow-sm backdrop-blur md:h-10 md:w-10 md:text-sm">
                                            {getInitials(barberName)}
                                        </div>

                                        <div className="absolute inset-x-0 bottom-0 p-3 pb-4 md:p-5">
                                            <h3
                                                className={`font-black leading-tight text-white drop-shadow-sm ${featured
                                                    ? 'line-clamp-2 text-xl md:text-3xl'
                                                    : 'line-clamp-2 text-[12px] leading-tight md:text-xl'
                                                    }`}
                                            >
                                                {itemTitle}
                                            </h3>

                                            <p
                                                className={`mt-1 font-semibold text-white/85 ${featured ? 'text-xs md:text-base' : 'text-[10px] md:text-sm'
                                                    }`}
                                            >
                                                {barberName}
                                            </p>

                                            {featured && (
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <Link
                                                        href={getBookingHref(item)}
                                                        className="inline-flex h-8 items-center justify-center rounded-full border border-white/20 bg-black/35 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur-md transition duration-300 hover:border-primary/60 hover:bg-primary hover:text-white active:scale-95 md:h-9 md:px-5 md:text-[10px]"
                                                    >
                                                        Reservar estilo
                                                    </Link>

                                                    <span
                                                        className="relative z-20 h-9 w-9 rounded-full opacity-90 shadow-[0_10px_25px_rgba(0,0,0,0.20)] md:h-11 md:w-11"
                                                        style={{ backgroundColor: PRIMARY }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href={getBookingHref(item)}
                                        aria-label={`Reservar ${itemTitle}`}
                                        className="absolute inset-0 z-10"
                                    />
                                </article>
                            )
                        })}
                    </div>

                    {filteredItems.length > INITIAL_GALLERY_LIMIT && (
                        <div className="pt-1 text-center">
                            <button
                                type="button"
                                onClick={() => setShowAll((current) => !current)}
                                className="inline-flex items-center justify-center rounded-full border border-border-soft bg-white/[0.04] px-5 py-2.5 text-sm font-black text-slate-300 shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.07] hover:text-foreground active:scale-[0.98]"
                            >
                                {showAll
                                    ? 'Ver menos trabajos'
                                    : `Ver galería completa (+${hiddenItemsCount})`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}