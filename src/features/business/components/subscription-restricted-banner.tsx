type Props = {
    title?: string
    message: string
    compact?: boolean
}

export function SubscriptionRestrictedBanner({
    title = 'Suscripción limitada',
    message,
    compact = false,
}: Props) {
    return (
        <div
            className={`rounded-[22px] border border-orange-200 bg-[#FFF7E8] text-[#8A5D16] shadow-sm ${compact ? 'px-4 py-3' : 'px-5 py-4'
                }`}
        >
            <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E] text-sm font-black text-white">
                    !
                </div>

                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                        {title}
                    </p>

                    <p className="mt-1 text-sm font-bold leading-6">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    )
}