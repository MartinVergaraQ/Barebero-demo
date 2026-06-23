import Link from 'next/link'
import type { ElementType } from 'react'
import {
    AlertTriangle,
    ArrowRight,
    CircleCheck,
    Clock3,
    XCircle,
} from 'lucide-react'

type SubscriptionTone =
    | 'amber'
    | 'red'
    | 'blue'
    | 'green'

type Props = {
    title: string
    message: string
    tone: SubscriptionTone
    actionLabel?: string
    actionHref?: string
}

type ToneStyle = {
    wrapper: string
    icon: string
    title: string
    message: string
    action: string
}

const toneStyles: Record<
    SubscriptionTone,
    ToneStyle
> = {
    blue: {
        wrapper:
            'border-sky-200 bg-gradient-to-r from-white via-sky-50 to-white',
        icon:
            'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
        title:
            'text-sky-950',
        message:
            'text-slate-600',
        action:
            'border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50',
    },

    amber: {
        wrapper:
            'border-amber-200 bg-gradient-to-r from-white via-amber-50 to-white',
        icon:
            'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
        title:
            'text-amber-950',
        message:
            'text-amber-800',
        action:
            'border-amber-300 bg-amber-600 text-white hover:bg-amber-700',
    },

    red: {
        wrapper:
            'border-red-200 bg-gradient-to-r from-white via-red-50 to-white',
        icon:
            'bg-red-100 text-red-700 ring-1 ring-red-200',
        title:
            'text-red-950',
        message:
            'text-red-800',
        action:
            'border-red-600 bg-red-600 text-white hover:bg-red-700',
    },

    green: {
        wrapper:
            'border-emerald-200 bg-gradient-to-r from-white via-emerald-50 to-white',
        icon:
            'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
        title:
            'text-emerald-950',
        message:
            'text-emerald-800',
        action:
            'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
    },
}

const toneIcons: Record<
    SubscriptionTone,
    ElementType
> = {
    blue: Clock3,
    amber: AlertTriangle,
    red: XCircle,
    green: CircleCheck,
}

export function SubscriptionBanner({
    title,
    message,
    tone,
    actionLabel,
    actionHref,
}: Props) {
    const styles =
        toneStyles[tone]

    const Icon =
        toneIcons[tone]

    const showAction =
        Boolean(
            actionLabel &&
            actionHref
        )

    const role =
        tone === 'amber' ||
            tone === 'red'
            ? 'alert'
            : 'status'

    return (
        <section
            role={role}
            className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between ${styles.wrapper}`}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                >
                    <Icon
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                </span>

                <div className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
                    <p
                        className={`shrink-0 text-sm font-black leading-5 ${styles.title}`}
                    >
                        {title}
                    </p>

                    <p
                        className={`mt-0.5 text-sm font-medium leading-5 sm:mt-0 ${styles.message}`}
                    >
                        {message}
                    </p>
                </div>
            </div>

            {showAction && (
                <Link
                    href={actionHref!}
                    className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-xl border px-3.5 text-xs font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] sm:self-auto ${styles.action}`}
                >
                    {actionLabel}

                    <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                    />
                </Link>
            )}
        </section>
    )
}

