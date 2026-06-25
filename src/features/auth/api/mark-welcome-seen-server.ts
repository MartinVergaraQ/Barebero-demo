'use server'

import { createClient } from '@/src/lib/supabase/server'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

type MarkWelcomeSeenResult =
    | { ok: true }
    | { ok: false; message: string }

export async function markWelcomeSeenServer(): Promise<MarkWelcomeSeenResult> {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            ok: false,
            message: 'La sesión no es válida',
        }
    }

    const { error } = await supabaseAdmin.from('profiles').update({
        welcome_seen_at: new Date().toISOString(),
    }).eq('id', user.id).is('welcome_seen_at', null)

    if (error) {
        console.error('Error marcando bienvenida:', error)
        return {
            ok: false,
            message: 'No se pudo cerrar la bienvenida',
        }
    }

    return { ok: true }
}