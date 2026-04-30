const { createClient } = require('@supabase/supabase-js');

async function createUsers() {
  const supabase = createClient(
    'https://sgtlkflzxbtcrycumoaq.supabase.co',
    'sb_publishable_wNoL_goA-UIG7QDJZ6_EaQ_T191ymc1'
  );

  const users = [
    { email: 'admin1@qubix.agency', password: 'QubixAdmin2026!', full_name: 'Admin 1', role: 'admin' },
    { email: 'admin2@qubix.agency', password: 'QubixAdmin2026!', full_name: 'Admin 2', role: 'admin' }
  ];

  for (const user of users) {
    console.log(`Creating user: ${user.email}...`);
    
    // Create auth user using public signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          full_name: user.full_name,
        }
      }
    });

    if (authError) {
      console.error(`Error creating ${user.email}:`, authError.message);
    } else {
      console.log(`Successfully created auth user for ${user.email}. ID: ${authData.user?.id}`);
      
      if (authData.user?.id) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: user.full_name,
            role: user.role
          });

        if (profileError) {
           console.error(`Error creating profile for ${user.email}:`, profileError.message);
        } else {
           console.log(`Successfully created profile for ${user.email}.`);
        }
      }
    }
  }
}

createUsers().then(() => console.log('Done.')).catch(console.error);
