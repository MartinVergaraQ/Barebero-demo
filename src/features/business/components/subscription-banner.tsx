type Props = {
    title: string
    message: string
    tone: 'amber' | 'red' | 'blue' | 'green'
}

const toneClasses = {
    amber: {
        wrapper: 'border-[#E7B957] bg-[#FFF7E8] text-[#8A5D16]',
        icon: 'bg-[#C8942E] text-white',
    },
    red: {
        wrapper: 'border-red-200 bg-red-50 text-red-800',
        icon: 'bg-red-600 text-white',
    },
    blue: {
        wrapper: 'border-[#D7C39A] bg-[#FFFCF4] text-slate-800',
        icon: 'bg-[#C8942E] text-white',
    },
    green: {
        wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        icon: 'bg-emerald-600 text-white',
    },
}

function getToneIcon(tone: Props['tone']) {
    if (tone === 'red') return '!'
    if (tone === 'green') return '✓'
    return '•'
}

export function SubscriptionBanner({ title, message, tone }: Props) {
    const classes = toneClasses[tone]

    return (
        <div
            className={`flex gap-3 rounded-[22px] border px-4 py-4 shadow-sm md:items-center ${classes.wrapper}`}
        >
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${classes.icon}`}
            >
                {getToneIcon(tone)}
            </div>

            <div className="min-w-0">
                <p className="text-sm font-black">{title}</p>

                <p className="mt-0.5 text-sm leading-6 opacity-85">
                    {message}
                </p>
            </div>
        </div>
    )
}