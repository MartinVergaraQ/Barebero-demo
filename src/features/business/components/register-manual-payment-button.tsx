'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'
import { registerManualPaymentServer } from '@/src/features/business/api/register-manual-payment-server'
import { PLAN_PRICES, } from '@/src/features/business/utils/plan-config'

type Props = {
    businessId: string
    businessName: string
    defaultAmount: number
}

function formatCLP(value: number) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value)
}

function parseAmount(value: string) {
    const onlyNumbers = value.replace(/\D/g, '')
    return Number(onlyNumbers)
}

export function RegisterManualPaymentButton({
    businessId,
    businessName,
    defaultAmount,
}: Props) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [amountInput, setAmountInput] = useState(String(defaultAmount || ''))

    const amount = useMemo(() => parseAmount(amountInput), [amountInput])

    function handleConfirm() {
        startTransition(async () => {
            try {
                const result = await registerManualPaymentServer({
                    businessId,
                    amount,
                })

                if (!result.ok) {
                    toast.error(result.message)
                    return
                }

                toast.success('Pago manual registrado correctamente')
                setIsOpen(false)
                router.refresh()
            } catch {
                toast.error('No se pudo registrar el pago')
            }
        })
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                disabled={isPending}
                className="inline-flex h-8 w-full items-center justify-center rounded-xl bg-slate-950 px-3 text-[11px] font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                Registrar pago
            </button>

            <ConfirmDialog
                open={isOpen}
                onOpenChange={(open) => {
                    if (!isPending) setIsOpen(open)
                }}
                title="Registrar pago manual"
                description={`Registrarás un pago manual para ${businessName}. Esto activará el negocio y renovará el período por 1 mes.`}
                confirmText={isPending ? 'Registrando...' : 'Registrar pago'}
                cancelText="Cancelar"
                onConfirm={handleConfirm}
                loading={isPending}
            >
                <div className="mt-4">
                    <label className="mb-2 block text-sm font-black text-slate-700">
                        Monto pagado
                    </label>

                    <input
                        value={amountInput}
                        onChange={(event) => setAmountInput(event.target.value)}
                        inputMode="numeric"
                        placeholder={String(PLAN_PRICES.studio)}
                        className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:ring-4 focus:ring-[#C8942E]/10"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                        Se registrará como{' '}
                        <span className="font-black text-slate-800">
                            {formatCLP(amount || 0)}
                        </span>{' '}
                        CLP.
                    </p>
                </div>
            </ConfirmDialog>
        </>
    )
}