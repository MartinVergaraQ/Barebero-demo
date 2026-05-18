'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

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
        if (activeBarberId === 'all') return items

        return items.filter((item) => item.barber_id === activeBarberId)
    }, [activeBarberId, items])

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
            <header className="mb-5 md:mb-8">
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
                        <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                            Trabajos recientes
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-8">
                            Inspírate con resultados reales, revisa quién lo realizó y
                            reserva directamente con ese barbero.
                        </p>
                    </div>

                    <div className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] md:px-5 md:py-3 md:text-sm">
                        {items.length} trabajo{items.length === 1 ? '' : 's'}
                    </div>
                </div>
            </header>

            <div className="mb-5 rounded-[22px] border border-white bg-white/90 p-2 shadow-[0_14px_38px_rgba(15,23,42,0.07)] backdrop-blur md:mb-7 md:rounded-[28px] md:p-3">
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
                                        : 'border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-amber-200 hover:text-slate-950 hover:shadow-sm'
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item) => {
                        const imageUrl = getImageUrl(item)
                        const barberName = getBarberName(item)
                        const itemTitle = item.title?.trim() || 'Trabajo de barbería'

                        return (
                            <article
                                key={item.id}
                                className="group relative overflow-hidden rounded-[26px] bg-slate-950 shadow-[0_16px_42px_rgba(15,23,42,0.14)] ring-1 ring-white/70 transition duration-500 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.22)] md:rounded-[32px]"
                            >
                                <div className="relative h-[310px] overflow-hidden sm:h-[360px] md:h-[420px] xl:h-[410px]">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={itemTitle}
                                            className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-3xl font-black text-slate-500">
                                            {getInitials(itemTitle)}
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-black/78" />

                                    <div className="absolute left-4 top-4 flex items-center gap-2">
                                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 shadow-sm backdrop-blur">
                                            Trabajo real
                                        </span>
                                    </div>

                                    <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/95 text-sm font-black text-slate-950 shadow-sm backdrop-blur md:h-11 md:w-11">
                                        {getInitials(barberName)}
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                                        <div className="transition duration-500 group-hover:-translate-y-1">
                                            <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white drop-shadow-sm md:text-3xl">
                                                {itemTitle}
                                            </h3>

                                            <p className="mt-1.5 text-sm font-semibold text-white/85 md:mt-2 md:text-base">
                                                {barberName}
                                            </p>

                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <Link
                                                    href={getBookingHref(item)}
                                                    className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-md transition duration-300 hover:bg-white hover:text-slate-950 active:scale-95 md:px-5"
                                                >
                                                    Reservar estilo
                                                </Link>

                                                <span
                                                    className="h-10 w-10 rounded-full opacity-90 shadow-[0_10px_25px_rgba(0,0,0,0.20)] md:h-11 md:w-11"
                                                    style={{ backgroundColor: PRIMARY }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}