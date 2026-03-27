type Props = {
    title: string
    message: string
    tone: 'amber' | 'red' | 'blue' | 'green'
}

const toneClasses = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    red: 'border-red-300 bg-red-50 text-red-800',
    blue: 'border-blue-300 bg-blue-50 text-blue-800',
    green: 'border-green-300 bg-green-50 text-green-800',
}

export function SubscriptionBanner({ title, message, tone }: Props) {
    return (
        <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm">{message}</p>
        </div>
    )
}