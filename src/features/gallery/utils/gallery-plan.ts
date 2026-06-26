import {
    getPlanFeatures,
    normalizePlanSlug,
} from '@/src/features/business/utils/plan-config'

export const GALLERY_PLAN_ERROR =
    'La galería está disponible desde el plan Pro.'

export function canUseGalleryByPlan(
    planSlug?: string | null
) {
    return getPlanFeatures(
        normalizePlanSlug(planSlug)
    ).publicGallery
}