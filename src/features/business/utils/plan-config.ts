export const DEFAULT_TRIAL_DAYS = 5

export const DEFAULT_BUSINESS_TIMEZONE =
    'America/Santiago'

export const DEFAULT_BUSINESS_COUNTRY =
    'Chile'

export const PLAN_LIMITS = {
    starter: {
        maxBarbers: 1,
        maxServices: 5,
    },
    pro: {
        maxBarbers: 2,
        maxServices: 15,
    },
    studio: {
        maxBarbers: 5,
        maxServices: 50,
    },
} as const

/*
 * Valores provisionales.
 * Al estar centralizados podrás cambiarlos
 * después sin buscar precios por todo el proyecto.
 */
export const PLAN_PRICES = {
    starter: 0,
    pro: 9990,
    studio: 19990,
} as const

export const PLAN_LABELS = {
    starter: 'Starter',
    pro: 'Pro',
    studio: 'Studio',
} as const

export const PLAN_ORDER = {
    starter: 1,
    pro: 2,
    studio: 3,
} as const

/*
 * Estas banderas representan el modelo comercial.
 * Algunas funciones todavía están planificadas,
 * por lo que no debes anunciarlas como disponibles
 * hasta que estén desarrolladas.
 */
export const PLAN_FEATURES = {
    starter: {
        publicBookings: true,
        automaticConfirmations: false,
        automaticReminders: false,
        automaticReviewRequests: false,
        advancedAnalytics: false,
        advancedCustomization: false,
        automations: 'none',
        aiAssistant: false,
        prioritySupport: false,
    },

    pro: {
        publicBookings: true,
        automaticConfirmations: true,
        automaticReminders: true,
        automaticReviewRequests: true,
        advancedAnalytics: true,
        advancedCustomization: true,
        automations: 'basic',
        aiAssistant: false,
        prioritySupport: true,
    },

    studio: {
        publicBookings: true,
        automaticConfirmations: true,
        automaticReminders: true,
        automaticReviewRequests: true,
        advancedAnalytics: true,
        advancedCustomization: true,
        automations: 'complete',
        aiAssistant: true,
        prioritySupport: true,
    },
} as const

export type AllowedPlanSlug =
    keyof typeof PLAN_LIMITS

export function isAllowedPlanSlug(
    value: unknown
): value is AllowedPlanSlug {
    return (
        typeof value === 'string' &&
        value in PLAN_LIMITS
    )
}

export function getPlanLimits(
    planSlug: AllowedPlanSlug
) {
    return PLAN_LIMITS[planSlug]
}

export function getPlanPrice(
    planSlug: AllowedPlanSlug
) {
    return PLAN_PRICES[planSlug]
}

export function getPlanLabel(
    planSlug: AllowedPlanSlug
) {
    return PLAN_LABELS[planSlug]
}
