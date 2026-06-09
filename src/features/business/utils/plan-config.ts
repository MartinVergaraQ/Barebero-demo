export const PLAN_LIMITS = {
    starter: {
        maxBarbers: 1,
        maxServices: 5,
    },
    pro: {
        maxBarbers: 3,
        maxServices: 15,
    },
    studio: {
        maxBarbers: null,
        maxServices: null,
    },
} as const

export const PLAN_ORDER = {
    starter: 1,
    pro: 2,
    studio: 3,
} as const

export type AllowedPlanSlug = keyof typeof PLAN_LIMITS