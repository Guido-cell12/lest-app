import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://viiciiamtdckxsnlcyne.supabase.co'
const supabaseKey = 'sb_publishable_9gXMkx9OiMpaeQojAgtVCQ_nU5Mvheg'

export const supabase = createClient(supabaseUrl, supabaseKey)