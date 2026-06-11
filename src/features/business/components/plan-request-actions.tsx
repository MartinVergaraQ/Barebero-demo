'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    approvePlanChangeRequestServer,
    rejectPlanChangeRequestServer,
} from '@/src/features/business/api/resolve-plan-change-request-server'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    requestId: string
    businessName: string
    currentPlanLabel: string
    requestedPlanLabel: string
}

type ActionType = 'approve' | 'reject' | null

export function PlanRequestActions({
    requestId,
    businessName,
    currentPlanLabel,
    requestedPlanLabel,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [actionType, setActionType] = useState<ActionType>(null)
    const [adminNote, setAdminNote] = useState('')

    const isApprove = actionType === 'approve'
    const isReject = actionType === 'reject'

    function closeDialog() {
        if (isPending) return

        setActionType(null)
        setAdminNote('')
    }

    function handleConfirm() {
        if (!actionType) return

        startTransition(async () => {
            try {
                const result = isApprove
                    ? await approvePlanChangeRequestServer(requestId)
                    : await rejectPlanChangeRequestServer(
                        requestId,
                        adminNote
                    )

                if (!result.ok) {
                    toast.error(result.message)
                    return
                }

                setActionType(null)
                setAdminNote('')

                toast.success(
                    isApprove
                        ? 'Solicitud aprobada correctamente'
                        : 'Solicitud rechazada correctamente'
                )

                router.refresh()
            } catch {
                toast.error('No se pudo resolver la solicitud')
            }
        })
    }

    return (
        <>
            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={() => setActionType('approve')}
                    disabled={isPending}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Aprobar
                </button>

                <button
                    type="button"
                    onClick={() => setActionType('reject')}
                    disabled={isPending}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Rechazar
                </button>
            </div>

            <ConfirmDialog
                open={!!actionType}
                onOpenChange={(open) => {
                    if (!open) closeDialog()
                }}
                title={
                    isApprove
                        ? 'Aprobar cambio de plan'
                        : 'Rechazar cambio de plan'
                }
                description={
                    isApprove
                        ? `Vas a aprobar el cambio de ${businessName} de ${currentPlanLabel} a ${requestedPlanLabel}. El plan y los límites se actualizarán inmediatamente.`
                        : `Vas a rechazar la solicitud de ${businessName}. El plan actual se mantendrá sin cambios.`
                }
                confirmText={
                    isPending
                        ? 'Procesando...'
                        : isApprove
                            ? 'Aprobar cambio'
                            : 'Rechazar solicitud'
                }
                cancelText="Cancelar"
                onConfirm={handleConfirm}
                loading={isPending}
                destructive={isReject}
            >
                {isReject && (
                    <div className="mt-4">
                        <label
                            htmlFor={`admin-note-${requestId}`}
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Nota interna opcional
                        </label>

                        <textarea
                            id={`admin-note-${requestId}`}
                            value={adminNote}
                            onChange={(event) =>
                                setAdminNote(event.target.value)
                            }
                            rows={3}
                            placeholder="Ej: pendiente de pago, cliente pidió mantener plan actual, falta validación comercial..."
                            className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10"
                        />
                    </div>
                )}
            </ConfirmDialog>
        </>
    )
}