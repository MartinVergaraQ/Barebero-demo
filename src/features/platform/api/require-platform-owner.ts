import 'server-only'

import { redirect } from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

export async function requirePlatformOwner() {
    const supabase =
        await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    const {
        data: platformAdmin,
        error: platformAdminError,
    } = await supabaseAdmin
        .from('platform_admins')
        .select(`
            id,
            user_id,
            email,
            role,
            is_active
        `)
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .eq('is_active', true)
        .maybeSingle()

    if (
        platformAdminError ||
        !platformAdmin
    ) {
        redirect('/admin')
    }

    return {
        user,
        platformAdmin,
    }
}