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
    history: PlanHistoryItem[]
}

type FilterType = 'all' | 'upgrade' | 'downgrade'

export function PlanHistoryList({ history }: Props) {
    const [filter, setFilter] = useState<FilterType>('all')

    const filteredHistory = useMemo(() => {
        if (filter === 'all') return history

        return history.filter((item) => {
            const changeType = getPlanChangeType(
                item.previous_plan_slug,
                item.next_plan_slug
            )

            if (filter === 'upgrade') return changeType === 'Upgrade'
            if (filter === 'downgrade') return changeType === 'Downgrade'

            return true
        })
    }, [filter, history])

    return (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Últimos cambios de plan</h2>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`rounded-lg border px-3 py-1 text-sm ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white'
                            }`}
                    >
                        Todos
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilter('upgrade')}
                        className={`rounded-lg border px-3 py-1 text-sm ${filter === 'upgrade' ? 'bg-slate-900 text-white' : 'bg-white'
                            }`}
                    >
                        Upgrades
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilter('downgrade')}
                        className={`rounded-lg border px-3 py-1 text-sm ${filter === 'downgrade' ? 'bg-slate-900 text-white' : 'bg-white'
                            }`}
                    >
                        Downgrades
                    </button>
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                    No hay cambios para este filtro.
                </p>
            ) : (
                <div className="mt-4 space-y-3">
                    {filteredHistory.map((item) => {
                        const changeType = getPlanChangeType(
                            item.previous_plan_slug,
                            item.next_plan_slug
                        )

                        return (
                            <div key={item.id} className="rounded-lg border p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-medium">Cambio:</span>{' '}
                                        {formatPlanLabel(item.previous_plan_slug)} →{' '}
                                        {formatPlanLabel(item.next_plan_slug)}
                                    </p>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${changeType === 'Upgrade'
                                                ? 'bg-green-100 text-green-700'
                                                : changeType === 'Downgrade'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        {changeType}
                                    </span>
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    {formatDateTime(item.created_at)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Por: {item.profiles?.[0]?.full_name ?? 'Usuario sin nombre'}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}