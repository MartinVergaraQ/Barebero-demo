'use client'

import { useEffect } from 'react'
import { Check, AlertTriangle, Info, XCircle, X } from 'lucide-react'

type AdminAlertVariant = 'success' | 'error' | 'warning' | 'info'

type AdminAlertProps = {
    variant?: AdminAlertVariant
    title?: string
    message: string
    className?: string
    floating?: boolean
    onClose?: () => void
    autoClose?: boolean
    duration?: number
}

const variantConfig: Record<
    AdminAlertVariant,
    {
        icon: React.ElementType
        container: string
        iconWrap: string
        title: string
        progress: string
    }
> = {
    success: {
        icon: Check,
        container: 'border-emerald-200 bg-white text-slate-950',
        iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        title: 'text-emerald-700',
        progress: 'bg-emerald-500',
    },
    error: {
        icon: XCircle,
        container: 'border-red-200 bg-white text-slate-950',
        iconWrap: 'bg-red-100 text-red-700 ring-red-200',
        title: 'text-red-700',
        progress: 'bg-red-500',
    },
    warning: {
        icon: AlertTriangle,
        container: 'border-amber-200 bg-white text-slate-950',
        iconWrap: 'bg-amber-100 text-amber-700 ring-amber-200',
        title: 'text-amber-700',
        progress: 'bg-amber-500',
    },
    info: {
        icon: Info,
        container: 'border-blue-200 bg-white text-slate-950',
        iconWrap: 'bg-blue-100 text-blue-700 ring-blue-200',
        title: 'text-blue-700',
        progress: 'bg-blue-500',
    },
}

export function AdminAlert({
    variant = 'info',
    title,
    message,
    className = '',
    floating = false,
    onClose,
    autoClose = true,
    duration = 3500,
}: AdminAlertProps) {
    const config = variantConfig[variant]
    const Icon = config.icon

    useEffect(() => {
        if (!message || !autoClose || !onClose) return

        const timer = window.setTimeout(() => {
            onClose()
        }, duration)

        return () => window.clearTimeout(timer)
    }, [message, autoClose, duration, onClose])

    if (!message) return null

    return (
        <div
            className={
                floating
                    ? `fixed bottom-5 left-4 right-4 z-[120] mx-auto max-w-[420px] md:bottom-auto md:left-auto md:right-6 md:top-6 ${className}`
                    : className
            }
        >
            <div
                className={`relative overflow-hidden rounded-[22px] border px-4 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-black/5 backdrop-blur ${config.container}`}
            >
                <div className="flex items-start gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${config.iconWrap}`}
                    >
                        <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1 pt-0.5">
                        {title && (
                            <p className={`text-sm font-black leading-5 ${config.title}`}>
                                {title}
                            </p>
                        )}

                        <p className="mt-0.5 text-sm font-bold leading-5 text-slate-600">
                            {message}
                        </p>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Cerrar notificación"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {autoClose && (
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-100">
                        <div
                            className={`h-full ${config.progress}`}
                            style={{
                                animation: `admin-alert-progress ${duration}ms linear forwards`,
                            }}
                        />
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes admin-alert-progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    )
}