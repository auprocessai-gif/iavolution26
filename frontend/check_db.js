import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("No credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Probando lectura anonima de iavolution.profiles...");
    const { data: profiles, error: pErr } = await supabase.schema('iavolution').from('profiles').select('id, email, role_id');

    if (pErr) {
        console.error("Error leyendo profiles:", pErr.message);
    } else {
        console.log(`Se encontraron ${profiles.length} perfiles:`, profiles);
    }

    const { data: roles, error: rErr } = await supabase.schema('iavolution').from('roles').select('id, name');

    if (rErr) {
        console.error("Error leyendo roles:", rErr.message);
    } else {
        console.log(`Se encontraron ${roles.length} roles:`, roles);
    }
}

check();
