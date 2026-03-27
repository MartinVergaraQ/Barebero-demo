export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | string
    | null
    | undefined

export function canCreateWithSubscription(status?: SubscriptionStatus) {
    return status !== 'past_due' && status !== 'canceled'
}

export function canEditWithSubscription(status?: SubscriptionStatus) {
    return status !== 'past_due' && status !== 'canceled'
}

export function canManageCatalogWithSubscription(status?: SubscriptionStatus) {
    return status !== 'past_due' && status !== 'canceled'
}

export function formatPlanLabel(planSlug?: string | null) {
    switch (planSlug) {
        case 'pro':
            return 'Pro'
        case 'studio':
            return 'Studio'
        case 'starter':
        default:
            return 'Starter'
    }
}

export function formatSubscriptionStatus(status?: SubscriptionStatus) {
    switch (status) {
        case 'active':
            return 'Activa'
        case 'past_due':
            return 'Pago pendiente'
        case 'canceled':
            return 'Cancelada'
        case 'trialing':
        default:
            return 'Período de prueba'
    }
}

export function formatTrialEndDate(value?: string | null) {
    if (!value) return '-'

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
        return '-'
    }

    return parsed.toLocaleDateString('es-CL')
}

export function getSubscriptionAction(
    status?: SubscriptionStatus,
    slug?: string
) {
    if (status === 'past_due') {
        return {
            title: 'Pago pendiente',
            description:
                'Tienes pagos pendientes. Regulariza tu suscripción para volver a editar y crear contenido del catálogo.',
            label: 'Regularizar pago',
            href: slug ? `/admin/b/${slug}/negocio` : '/admin',
        }
    }

    if (status === 'canceled') {
        return {
            title: 'Suscripción cancelada',
            description:
                'Reactiva tu suscripción para recuperar acceso completo a la gestión del negocio.',
            label: 'Reactivar suscripción',
            href: slug ? `/admin/b/${slug}/negocio` : '/admin',
        }
    }

    return {
        title: 'Gestionar plan',
        description:
            'Tu negocio está operativo. Puedes revisar opciones de plan y futuros cambios.',
        label: 'Cambiar plan',
        href: slug ? `/admin/b/${slug}/plan/cambiar` : '/admin',
    }
}

export function formatDateTime(value?: string | null) {
    if (!value) return '-'

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
        return '-'
    }

    return parsed.toLocaleString('es-CL')
}

export function getPlanChangeType(
    previousPlanSlug?: string | null,
    nextPlanSlug?: string | null
) {
    const order = {
        starter: 1,
        pro: 2,
        studio: 3,
    } as const

    const previous =
        previousPlanSlug && previousPlanSlug in order
            ? order[previousPlanSlug as keyof typeof order]
            : null

    const next =
        nextPlanSlug && nextPlanSlug in order
            ? order[nextPlanSlug as keyof typeof order]
            : null

    if (previous === null || next === null) {
        return 'Cambio'
    }

    if (next > previous) {
        return 'Upgrade'
    }

    if (next < previous) {
        return 'Downgrade'
    }

    return 'Cambio'
}