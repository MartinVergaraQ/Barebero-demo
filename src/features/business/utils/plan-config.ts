export const PLAN_LIMITS = {
    starter: {
        maxBarbers: 2,
        maxServices: 10,
    },
    pro: {
        maxBarbers: 5,
        maxServices: 25,
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