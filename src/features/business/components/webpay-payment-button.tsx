'use client'

import {
    useTransition,
} from 'react'

import {
    toast,
} from 'sonner'

import {
    createWebpayPaymentServer,
} from '@/src/features/business/api/create-webpay-payment-server'

type Props = {
    businessSlug: string
    label?: string
}

function submitToWebpay({
    url,
    token,
}: {
    url: string
    token: string
}) {
    const form =
        document.createElement(
            'form'
        )

    form.method =
        'POST'

    form.action =
        url

    form.style.display =
        'none'

    const tokenInput =
        document.createElement(
            'input'
        )

    tokenInput.type =
        'hidden'

    tokenInput.name =
        'token_ws'

    tokenInput.value =
        token

    form.appendChild(
        tokenInput
    )

    document.body.appendChild(
        form
    )

    form.submit()
}

export function WebpayPaymentButton({
    businessSlug,
    label = 'Continuar al pago',
}: Props) {
    const [
        isPending,
        startTransition,
    ] = useTransition()

    function handlePayment() {
        if (isPending) return

        startTransition(async () => {
            try {
                const result =
                    await createWebpayPaymentServer({
                        businessSlug,
                    })

                if (!result.ok) {
                    toast.error(
                        result.message
                    )
                    return
                }

                submitToWebpay({
                    url:
                        result.url,
                    token:
                        result.token,
                })
            } catch (error) {
                console.error(
                    'Error iniciando pago Webpay:',
                    error
                )

                toast.error(
                    'No se pudo iniciar el pago'
                )
            }
        })
    }

    return (
        <button
            type="button"
            onClick={
                handlePayment
            }
            disabled={
                isPending
            }
            aria-busy={
                isPending
            }
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isPending
                ? 'Conectando con Webpay...'
                : label}
        </button>
    )
}