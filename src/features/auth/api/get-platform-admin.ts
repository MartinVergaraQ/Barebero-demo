import { createClient } from '@/src/lib/supabase/server'
import { canAccessPlatformAdmin } from '@/src/features/auth/utils/platform-access'

export type PlatformAdminProfile = {
    id: string
    user_id: string
    role: 'owner' | 'admin'
}

export async function getPlatformAdmin(): Promise<PlatformAdminProfile | null> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    const { data, error } = await supabase
        .from('platform_admins')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error || !data || !canAccessPlatformAdmin(data.role)) {
        return null
    }

    return data as PlatformAdminProfile
}