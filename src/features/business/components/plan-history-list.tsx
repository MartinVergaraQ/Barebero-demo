'use client'

import { useMemo, useState } from 'react'
import {
    formatDateTime,
    formatPlanLabel,
    getPlanChangeType,
} from '@/src/features/business/utils/subscription-rules'

type PlanHistoryItem = {
    id: string
    previous_plan_slug: string
    next_plan_slug: string
    created_at: string
    changed_by: string | null
    profiles: {
        full_name: string | null
    }[] | null
}

type Props = {
    items: PlanHistoryItem[]
}

type FilterType = 'all' | 'upgrade' | 'downgrade'

const filters: Array<{
    value: FilterType
    label: string
}> = [
        { value: 'all', label: 'Todos' },
        { value: 'upgrade', label: 'Upgrades' },
        { value: 'downgrade', label: 'Downgrades' },
    ]

export function PlanHistoryList({ items }: Props) {
    const [filter, setFilter] = useState<FilterType>('all')

    const filteredHistory = useMemo(() => {
        if (filter === 'all') return items

        return items.filter((item) => {
            const changeType = getPlanChangeType(
                item.previous_plan_slug,
                item.next_plan_slug
            )

            if (filter === 'upgrade') return changeType === 'Upgrade'
            if (filter === 'downgrade') return changeType === 'Downgrade'

            return true
        })
    }, [filter, items])

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-950">
                        Últimos cambios de plan
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Filtra movimientos por tipo de cambio.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {filters.map((item) => {
                        const active = filter === item.value

                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setFilter(item.value)}
                                className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-xs font-black transition active:scale-[0.98] ${active
                                        ? 'bg-[#C8942E] text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)]'
                                        : 'border border-black/10 bg-white text-slate-700 hover:bg-[#FFFCF4]'
                                    }`}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        📄
                    </div>

                    <h4 className="mt-4 text-xl font-black text-slate-950">
                        No hay cambios para este filtro
                    </h4>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                        Cuando existan movimientos de plan, aparecerán en esta sección.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredHistory.map((item) => {
                        const changeType = getPlanChangeType(
                            item.previous_plan_slug,
                            item.next_plan_slug
                        )

                        const isUpgrade = changeType === 'Upgrade'
                        const isDowngrade = changeType === 'Downgrade'

                        return (
                            <article
                                key={item.id}
                                className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4 transition hover:bg-white md:p-5"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isUpgrade
                                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                        : isDowngrade
                                                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                                                    }`}
                                            >
                                                {changeType}
                                            </span>

                                            <span className="text-xs font-bold text-slate-400">
                                                {formatDateTime(item.created_at)}
                                            </span>
                                        </div>

                                        <h4 className="mt-3 text-lg font-black text-slate-950">
                                            {formatPlanLabel(item.previous_plan_slug)} →{' '}
                                            {formatPlanLabel(item.next_plan_slug)}
                                        </h4>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Cambio realizado por:{' '}
                                            <span className="font-black text-slate-700">
                                                {item.profiles?.[0]?.full_name ??
                                                    'Usuario sin nombre'}
                                            </span>
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 md:min-w-[190px]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            Movimiento
                                        </p>

                                        <p
                                            className={`mt-1 text-sm font-black ${isUpgrade
                                                    ? 'text-emerald-700'
                                                    : isDowngrade
                                                        ? 'text-amber-800'
                                                        : 'text-slate-700'
                                                }`}
                                        >
                                            {isUpgrade
                                                ? 'Aumentó capacidad'
                                                : isDowngrade
                                                    ? 'Redujo capacidad'
                                                    : 'Sin cambio mayor'}
                                        </p>
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