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

    if (status === 'canceled') {
        return {
            tone: 'red',
            title: 'Suscripción cancelada',
            message: 'Tu suscripción está cancelada. Reactívala para seguir gestionando el negocio.',
        }
    }

    if (status === 'trialing') {
        return {
            tone: 'blue',
            title: 'Período de prueba',
            message: trialEndsAt
                ? `Tu prueba está activa hasta ${new Date(trialEndsAt).toLocaleDateString('es-CL')}.`
                : 'Tu negocio está en período de prueba.',
        }
    }

    return {
        tone: 'green',
        title: 'Suscripción activa',
        message: 'Tu negocio está activo y operativo.',
    }
}