'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'
import { updateBusinessSubscriptionStatusServer } from '@/src/features/business/api/update-business-subscription-status-server'

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'

type Props = {
    businessId: string
    businessName: string
    currentStatus: string
}

type ActionConfig = {
    status: SubscriptionStatus
    label: string
    title: string
    description: string
    confirmText: string
    destructive?: boolean
}

const ACTIONS: ActionConfig[] = [
    {
        status: 'active',
        label: 'Activar',
        title: 'Activar suscripción',
        description:
            'El negocio quedará activo y se renovará el período manual desde hoy por un mes.',
        confirmText: 'Activar suscripción',
    },
    {
        status: 'past_due',
        label: 'Pago pendiente',
        title: 'Marcar pago pendiente',
        description:
            'El negocio quedará marcado con pago pendiente. Úsalo cuando el cliente aún no haya regularizado el cobro.',
        confirmText: 'Marcar pago pendiente',
    },
    {
        status: 'cancelled',
        label: 'Cancelar',
        title: 'Cancelar suscripción',
        description:
            'El negocio quedará cancelado. Esta acción puede bloquear funciones según tus reglas de suscripción.',
        confirmText: 'Cancelar suscripción',
        destructive: true,
    },
]

function getButtonClass(status: SubscriptionStatus) {
    if (status === 'active') {
        return 'bg-emerald-600 text-white hover:bg-emerald-700'
    }

    if (status === 'past_due') {
        return 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
    }

    if (status === 'cancelled') {
        return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
    }

    return 'border border-black/10 bg-white text-slate-700 hover:bg-[#FFFCF4]'
}

export function BusinessSubscriptionActions({
    businessId,
    businessName,
    currentStatus,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(
        null
    )

    function handleConfirm() {
        if (!selectedAction) return

        startTransition(async () => {
            try {
                const result = await updateBusinessSubscriptionStatusServer({
                    businessId,
                    status: selectedAction.status,
                })

                if (!result.ok) {
                    toast.error(result.message)
                    return
                }

                toast.success('Estado de suscripción actualizado')
                setSelectedAction(null)
                router.refresh()
            } catch {
                toast.error('No se pudo actualizar la suscripción')
            }
        })
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {ACTIONS.filter((action) => currentStatus !== action.status).map((action) => {
                    return (
                        <button
                            key={action.status}
                            type="button"
                            disabled={isPending}
                            onClick={() => setSelectedAction(action)}
                            className={`inline-flex h-8 items-center justify-center rounded-xl px-2 text-[11px] font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${getButtonClass(
                                action.status
                            )}`}
                        >
                            {action.label}
                        </button>
                    )
                })}
            </div>

            <ConfirmDialog
                open={!!selectedAction}
                onOpenChange={(open) => {
                    if (!open && !isPending) {
                        setSelectedAction(null)
                    }
                }}
                title={selectedAction?.title ?? ''}
                description={
                    selectedAction
                        ? `${selectedAction.description} Negocio: ${businessName}.`
                        : ''
                }
                confirmText={
                    isPending
                        ? 'Procesando...'
                        : selectedAction?.confirmText ?? 'Confirmar'
                }
                cancelText="Cancelar"
                onConfirm={handleConfirm}
                loading={isPending}
                destructive={selectedAction?.destructive}
            />
        </>
    )
}