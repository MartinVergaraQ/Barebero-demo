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
        <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-950">
                        Últimos cambios
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Filtra los movimientos registrados por tipo de cambio.
                    </p>
                </div>

                <div className="flex w-fit overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                    {filters.map((item) => {
                        const active = filter === item.value

                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setFilter(item.value)}
                                className={`h-10 px-4 text-xs font-black transition active:scale-[0.98] ${active
                                        ? 'bg-[#C8942E] text-white'
                                        : 'text-slate-600 hover:bg-[#FBF7EE]'
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
                <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
                    {filteredHistory.map((item, index) => {
                        const changeType = getPlanChangeType(
                            item.previous_plan_slug,
                            item.next_plan_slug
                        )

                        const isUpgrade = changeType === 'Upgrade'
                        const isDowngrade = changeType === 'Downgrade'

                        const userName =
                            item.profiles?.[0]?.full_name?.trim() || 'Sistema'

                        return (
                            <article
                                key={item.id}
                                className={`flex flex-col gap-3 px-4 py-4 transition hover:bg-[#FBF7EE] md:flex-row md:items-center md:justify-between ${index !== filteredHistory.length - 1
                                        ? 'border-b border-black/10'
                                        : ''
                                    }`}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div
                                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-black ring-1 ${isUpgrade
                                                ? 'bg-emerald-100 text-emerald-800 ring-emerald-300'
                                                : isDowngrade
                                                    ? 'bg-orange-100 text-orange-800 ring-orange-300'
                                                    : 'bg-slate-100 text-slate-700 ring-slate-300'
                                            }`}
                                    >
                                        {isUpgrade ? '↑' : isDowngrade ? '↓' : '•'}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isUpgrade
                                                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                                        : isDowngrade
                                                            ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300'
                                                            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                                                    }`}
                                            >
                                                {changeType}
                                            </span>

                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                {formatDateTime(item.created_at)}
                                            </span>
                                        </div>

                                        <h4 className="mt-2 text-base font-black text-slate-950">
                                            {formatPlanLabel(item.previous_plan_slug)}{' '}
                                            <span className="text-slate-400">→</span>{' '}
                                            {formatPlanLabel(item.next_plan_slug)}
                                        </h4>

                                        <p className="mt-0.5 text-sm text-slate-500">
                                            Realizado por{' '}
                                            <span className="font-black text-slate-700">
                                                {userName}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${isUpgrade
                                            ? 'bg-emerald-600 text-white'
                                            : isDowngrade
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-slate-700 text-white'
                                        }`}
                                >
                                    {isUpgrade
                                        ? 'Aumentó capacidad'
                                        : isDowngrade
                                            ? 'Redujo capacidad'
                                            : 'Sin cambio mayor'}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}