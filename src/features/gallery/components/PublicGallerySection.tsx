'use client'

import { useMemo, useState } from 'react'

type GalleryItem = {
    id: string
    title: string | null
    media_url: string
    display_order: number
    barber_id: string | null
    barbers?:
    | {
        id: string
        name: string
    }
    | {
        id: string
        name: string
    }[]
    | null
}

type Barber = {
    id: string
    name: string
}

type Props = {
    items: GalleryItem[]
    barbers: Barber[]
}

const PRIMARY = '#B7791F'

type FilterValue = 'all' | 'general' | string

function getBarberName(
    barber:
        | {
            id: string
            name: string
        }
        | {
            id: string
            name: string
        }[]
        | null
        | undefined
) {
    if (!barber) return null
    if (Array.isArray(barber)) return barber[0]?.name ?? null
    return barber.name
}

export function PublicGallerySection({ items, barbers }: Props) {
    const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all')

    const filters = useMemo(() => {
        const barberIdsInGallery = new Set(
            items
                .filter((item) => item.barber_id)
                .map((item) => item.barber_id as string)
        )

        const hasGeneralItems = items.some((item) => !item.barber_id)
        const generalCount = items.filter((item) => !item.barber_id).length

        const visibleBarbers = barbers
            .filter((barber) => barberIdsInGallery.has(barber.id))
            .map((barber) => ({
                key: barber.id,
                label: barber.name,
                count: items.filter((item) => item.barber_id === barber.id).length,
            }))

        return [
            { key: 'all', label: 'Todos', count: items.length },
            ...(hasGeneralItems
                ? [{ key: 'general', label: 'General', count: generalCount }]
                : []),
            ...visibleBarbers,
        ]
    }, [items, barbers])

    const filteredItems = useMemo(() => {
        if (selectedFilter === 'all') return items

        if (selectedFilter === 'general') {
            return items.filter((item) => !item.barber_id)
        }

        return items.filter((item) => item.barber_id === selectedFilter)
    }, [items, selectedFilter])

    const sectionTitle = useMemo(() => {
        if (selectedFilter === 'all') return 'Trabajos recientes'
        if (selectedFilter === 'general') return 'Trabajos generales del negocio'

        const activeBarber = barbers.find((barber) => barber.id === selectedFilter)
        return activeBarber
            ? `Trabajos de ${activeBarber.name}`
            : 'Trabajos recientes'
    }, [selectedFilter, barbers])

    return (
        <div className="space-y-5 pb-4">
            <div>
                <h2 className="text-2xl font-black md:text-3xl">
                    {sectionTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-500 md:text-base">
                    Mira cortes, estilos y resultados reales del negocio.
                </p>
            </div>

            {filters.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filters.map((filter) => {
                        const active = selectedFilter === filter.key

                        return (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setSelectedFilter(filter.key)}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${active
                                    ? 'text-white'
                                    : 'border border-slate-200 bg-white text-slate-600'
                                    }`}
                                style={
                                    active
                                        ? { backgroundColor: PRIMARY }
                                        : undefined
                                }
                            >
                                {filter.label} ({filter.count})
                            </button>
                        )
                    })}
                </div>
            )}

            {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                    {selectedFilter === 'general'
                        ? 'No hay fotos generales del negocio todavía.'
                        : selectedFilter === 'all'
                            ? 'No hay fotos de trabajos todavía.'
                            : 'No hay trabajos publicados para este barbero todavía.'}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => {
                        const barberName = getBarberName(item.barbers)

                        return (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm"
                            >
                                <img
                                    src={item.media_url}
                                    alt={item.title || 'Trabajo de barbería'}
                                    className="h-44 w-full object-cover md:h-52"
                                />

                                <div className="p-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {item.title || 'Trabajo reciente'}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {!item.barber_id
                                            ? 'General del negocio'
                                            : barberName || 'Trabajo de barbero'}
                                    </p>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}