export const DEFAULT_TRIAL_DAYS = 14

export const DEFAULT_BUSINESS_TIMEZONE =
    'America/Santiago'

export const DEFAULT_BUSINESS_COUNTRY =
    'Chile'

export const PLAN_SLUGS = [
    'starter',
    'pro',
    'studio',
] as const

export type AllowedPlanSlug =
    typeof PLAN_SLUGS[number]

export type PlanAutomationLevel =
    | 'none'
    | 'basic'
    | 'complete'

export type PlanFeatures = {
    publicBookings: boolean
    publicBranding: boolean
    publicGallery: boolean
    publicReviews: boolean

    customerCancellation: boolean
    customerRescheduling: boolean

    automaticConfirmationNotifications: boolean
    automaticReminders: boolean
    automaticReviewRequests: boolean

    basicAnalytics: boolean
    advancedAnalytics: boolean
    advancedCustomization: boolean

    configurableCancellationPolicy: boolean
    waitlist: boolean

    automations: PlanAutomationLevel
    aiAssistant: boolean
    prioritySupport: boolean
}

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
} as const satisfies Record<
    AllowedPlanSlug,
    {
        maxBarbers: number
        maxServices: number
    }
>

export const PLAN_PRICES = {
    starter: 0,
    pro: 9990,
    studio: 19990,
} as const satisfies Record<
    AllowedPlanSlug,
    number
>

export const PLAN_LABELS = {
    starter: 'Starter',
    pro: 'Pro',
    studio: 'Studio',
} as const satisfies Record<
    AllowedPlanSlug,
    string
>

export const PLAN_ORDER = {
    starter: 1,
    pro: 2,
    studio: 3,
} as const satisfies Record<
    AllowedPlanSlug,
    number
>

/*
 * Estas capacidades representan el modelo comercial.
 *
 * Una capacidad no debe mostrarse como disponible
 * en la interfaz hasta que su implementación esté
 * realmente terminada.
 */
export const PLAN_FEATURES = {
    starter: {
        publicBookings: true,
        publicBranding: false,
        publicGallery: false,
        publicReviews: false,

        customerCancellation: false,
        customerRescheduling: false,

        automaticConfirmationNotifications: false,
        automaticReminders: false,
        automaticReviewRequests: false,

        basicAnalytics: false,
        advancedAnalytics: false,
        advancedCustomization: false,

        configurableCancellationPolicy: false,
        waitlist: false,

        automations: 'none',
        aiAssistant: false,
        prioritySupport: false,
    },

    pro: {
        /*
         * Pro debe incluir toda la operación
         * importante para una barbería real.
         */
        publicBookings: true,
        publicBranding: true,
        publicGallery: true,
        publicReviews: true,

        customerCancellation: true,
        customerRescheduling: true,

        automaticConfirmationNotifications: true,
        automaticReminders: true,
        automaticReviewRequests: true,

        basicAnalytics: true,
        advancedAnalytics: false,
        advancedCustomization: false,

        configurableCancellationPolicy: false,
        waitlist: false,

        automations: 'basic',
        aiAssistant: false,
        prioritySupport: false,
    },

    studio: {
        /*
         * Studio incluye todo Pro y agrega
         * automatización, personalización,
         * analítica y operación avanzada.
         */
        publicBookings: true,
        publicBranding: true,
        publicGallery: true,
        publicReviews: true,

        customerCancellation: true,
        customerRescheduling: true,

        automaticConfirmationNotifications: true,
        automaticReminders: true,
        automaticReviewRequests: true,

        basicAnalytics: true,
        advancedAnalytics: true,
        advancedCustomization: true,

        configurableCancellationPolicy: true,
        waitlist: true,

        automations: 'complete',

        /*
         * Déjalo false mientras el asistente
         * todavía no esté implementado.
         */
        aiAssistant: false,

        prioritySupport: true,
    },
} as const satisfies Record<
    AllowedPlanSlug,
    PlanFeatures
>

export function isAllowedPlanSlug(
    value: unknown
): value is AllowedPlanSlug {
    return (
        typeof value === 'string' &&
        PLAN_SLUGS.includes(
            value as AllowedPlanSlug
        )
    )
}

export function normalizePlanSlug(
    value?: string | null
): AllowedPlanSlug {
    return isAllowedPlanSlug(value)
        ? value
        : 'starter'
}

export function getPlanLimits(
    planSlug?: string | null
) {
    return PLAN_LIMITS[
        normalizePlanSlug(planSlug)
    ]
}

export function getPlanPrice(
    planSlug?: string | null
) {
    return PLAN_PRICES[
        normalizePlanSlug(planSlug)
    ]
}

export function getPlanLabel(
    planSlug?: string | null
) {
    return PLAN_LABELS[
        normalizePlanSlug(planSlug)
    ]
}

export function getPlanFeatures(
    planSlug?: string | null
) {
    return PLAN_FEATURES[
        normalizePlanSlug(planSlug)
    ]
}

export function isPlanAtLeast(
    currentPlan?: string | null,
    requiredPlan?: string | null
) {
    const current =
        normalizePlanSlug(currentPlan)

    const required =
        normalizePlanSlug(requiredPlan)

    return (
        PLAN_ORDER[current] >=
        PLAN_ORDER[required]
    )
}