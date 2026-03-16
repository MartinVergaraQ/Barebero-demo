'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

export async function approveReview(id: string) {
    const { error } = await supabaseAdmin
        .from('reviews')
        .update({ is_published: true })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/reviews')
    revalidatePath('/')
}

export async function rejectReview(id: string) {
    const { error } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/reviews')
    revalidatePath('/')
}