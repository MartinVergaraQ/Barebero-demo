'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

export async function publishReview(id: string) {
    const { error } = await supabaseAdmin
        .from('reviews')
        .update({ is_published: true })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin')
    revalidatePath('/')
}

export async function hideReview(id: string) {
    const { error } = await supabaseAdmin
        .from('reviews')
        .update({ is_published: false })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin')
    revalidatePath('/')
}