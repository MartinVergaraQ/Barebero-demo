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
    businessSlug
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
                    label: `${barber.name} (${count})`,
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

        return barbers.find((barber) => barber.id === item.barber_id)?.name ?? 'Trabajo del equipo'
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
        <section className="pb-12">
            <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-4 flex items-center gap-3">
                        <span
                            className="h-px w-10"
                            style={{ backgroundColor: PRIMARY }}
                        />

                        <p
                            className="text-xs font-black uppercase tracking-[0.32em]"
                            style={{ color: PRIMARY }}
                        >
                            Portafolio
                        </p>
                    </div>

                    <h2 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                        Trabajos recientes
                    </h2>

                    <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
                        Inspírate con resultados reales de nuestro equipo. Elige un estilo,
                        revisa quién lo realizó y reserva directamente con ese barbero.
                    </p>
                </div>

                <div className="w-fit rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    {items.length} trabajo{items.length === 1 ? '' : 's'}
                </div>
            </header>

            <div className="mb-7 rounded-[28px] border border-white bg-white/90 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filters.map((filter) => {
                        const active = activeBarberId === filter.id

                        return (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setActiveBarberId(filter.id)}
                                className={`shrink-0 rounded-full px-5 py-3 text-sm font-black transition duration-300 active:scale-95 ${active
                                    ? 'text-white shadow-[0_14px_30px_rgba(183,121,31,0.26)]'
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
                <div className="rounded-[30px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-xl font-black text-slate-950">
                        Aún no hay trabajos para este barbero
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        Prueba seleccionando otro profesional o vuelve a “Todos”.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item, index) => {
                        const imageUrl = getImageUrl(item)
                        const barberName = getBarberName(item)
                        const itemTitle = item.title?.trim() || 'Trabajo de barbería'
                        return (
                            <article
                                key={item.id}
                                className="group relative overflow-hidden rounded-[32px] bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.16)] ring-1 ring-white/70 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.24)]"
                                style={{
                                    animation: 'galleryFadeUp 520ms ease-out both',
                                    animationDelay: `${index * 70}ms`,
                                }}
                            >
                                <div className="relative h-[390px] overflow-hidden sm:h-[430px] md:h-[460px] xl:h-[430px]">
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

                                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/78" />

                                    <div className="absolute left-4 top-4 flex items-center gap-2">
                                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 shadow-sm backdrop-blur">
                                            Trabajo real
                                        </span>
                                    </div>

                                    <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/95 text-sm font-black text-slate-950 shadow-sm backdrop-blur">
                                        {getInitials(barberName)}
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-5">
                                        <div className="translate-y-2 transition duration-500 group-hover:translate-y-0">
                                            <h3 className="text-2xl font-black leading-tight text-white drop-shadow-sm">
                                                {item.title}
                                            </h3>

                                            <p className="mt-2 text-sm font-semibold text-white/80">
                                                {barberName}
                                            </p>

                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <Link
                                                    href={getBookingHref(item)}
                                                    className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-md transition duration-300 hover:bg-white hover:text-slate-950 active:scale-95"
                                                >
                                                    Reservar estilo
                                                </Link>

                                                <span
                                                    className="h-10 w-10 rounded-full opacity-90 shadow-[0_10px_25px_rgba(0,0,0,0.20)]"
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

            <style jsx>{`
                @keyframes galleryFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(18px);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </section>
    )
}