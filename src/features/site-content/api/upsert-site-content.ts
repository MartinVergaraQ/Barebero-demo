import { createClient } from '@/src/lib/supabase/browser'

export type UpsertSiteContentInput = {
    business_id: string
    key: string
    value_json: unknown
}

export async function upsertSiteContent(input: UpsertSiteContentInput) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('site_content')
        .upsert(
            [
                {
                    business_id: input.business_id,
                    key: input.key,
                    value_json: input.value_json,
                    updated_at: new Date().toISOString(),
                },
            ],
            {
                onConflict: 'business_id,key',
            }
        )
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}