import {
    notFound,
    redirect,
} from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import { canManageSubscription } from '@/src/features/auth/utils/admin-access'

export type AdminBusinessAccess = {
    userId: string
    businessId: string
    businessName: string
    businessSlug: string
    role: 'owner' | 'admin'
}

export async function getAdminBusinessAccess(
    slug: string
): Promise<AdminBusinessAccess> {
    const normalizedSlug =
        typeof slug === 'string'
            ? slug.trim()
            : ''

    if (!normalizedSlug) {
        notFound()
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        redirect('/admin/login')
    }

    if (
        !canManageSubscription(
            profile.role
        )
    ) {
        redirect('/admin')
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', normalizedSlug)
        .maybeSingle()

    if (businessError || !business) {
        notFound()
    }

    if (
        profile.business_id !==
        business.id
    ) {
        redirect('/admin')
    }

    return {
        userId: user.id,
        businessId: business.id,
        businessName: business.name,
        businessSlug: business.slug,
        role: profile.role as
            | 'owner'
            | 'admin',
    }
}