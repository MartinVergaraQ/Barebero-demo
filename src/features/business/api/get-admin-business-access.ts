import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export type AdminBusinessAccess = {
    userId: string
    businessId: string
    businessName: string
    businessSlug: string
    role: 'owner' | 'admin' | 'barber'
}

export async function getAdminBusinessAccess(
    slug: string
): Promise<AdminBusinessAccess> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        redirect('/admin/login')
    }

    if (!['owner', 'admin'].includes(profile.role)) {
        redirect('/admin/login')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (businessError || !business) {
        notFound()
    }

    if (profile.business_id !== business.id) {
        redirect('/admin/login')
    }

    return {
        userId: user.id,
        businessId: business.id,
        businessName: business.name,
        businessSlug: business.slug,
        role: profile.role,
    }
}