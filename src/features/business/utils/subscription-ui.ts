type SubscriptionTone = 'amber' | 'red' | 'blue' | 'green'

type SubscriptionUi = {
    tone: SubscriptionTone
    title: string
    message: string
}

export function getSubscriptionUi(
    status?: string | null,
    trialEndsAt?: string | null
): SubscriptionUi {
    if (status === 'past_due') {
        return {
            tone: 'amber',
            title: 'Pago pendiente',
            message: 'Tu negocio tiene pagos pendientes. Algunas acciones están bloqueadas.',
        }
    }

    if (status === 'cancelled') {
        return {
            tone: 'red',
            title: 'Suscripción cancelada',
            message: 'Tu suscripción está cancelada. Reactívala para seguir gestionando el negocio.',
        }
    }

    if (status === 'trialing') {
        const trialEnd =
            trialEndsAt
                ? new Date(trialEndsAt)
                : null

        const formattedTrialEnd =
            trialEnd &&
                !Number.isNaN(
                    trialEnd.getTime()
                )
                ? trialEnd.toLocaleDateString(
                    'es-CL'
                )
                : null

        return {
            tone: 'blue',
            title: 'Tu prueba está activa',
            message: formattedTrialEnd
                ? `Tienes acceso al plan hasta el ${formattedTrialEnd}.`
                : 'Estás utilizando el período de prueba.',
        }
    }

    return {
        tone: 'green',
        title: 'Suscripción activa',
        message: 'Tu negocio está activo y operativo.',
    }
}