/**
 * Blog Admin Management Script
 * 
 * Usage:
 *   npm run manage-admins -- grant svetolesov@gmail.com
 *   npm run manage-admins -- revoke user@example.com
 *   npm run manage-admins -- list
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function grantAdmin(email: string) {
  console.log(`\n🔑 Granting admin access to: ${email}`);
  
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, metadata')
    .eq('email', email)
    .single();

  if (fetchError || !profile) {
    console.error(`❌ User not found: ${email}`);
    return;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      metadata: {
        ...(profile.metadata as object || {}),
        role: 'admin'
      }
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('❌ Failed to grant admin access:', updateError.message);
    return;
  }

  console.log(`✅ Admin access granted to: ${email}`);
}

async function revokeAdmin(email: string) {
  console.log(`\n🔒 Revoking admin access from: ${email}`);
  
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, metadata')
    .eq('email', email)
    .single();

  if (fetchError || !profile) {
    console.error(`❌ User not found: ${email}`);
    return;
  }

  const metadata = profile.metadata as { role?: string } | null;
  if (metadata?.role !== 'admin') {
    console.log(`ℹ️  User ${email} is not an admin`);
    return;
  }

  // Remove role from metadata
  const newMetadata = { ...(metadata || {}) };
  delete newMetadata.role;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ metadata: newMetadata })
    .eq('id', profile.id);

  if (updateError) {
    console.error('❌ Failed to revoke admin access:', updateError.message);
    return;
  }

  console.log(`✅ Admin access revoked from: ${email}`);
}

async function listAdmins() {
  console.log('\n👥 Current blog admins:\n');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, metadata, created_at');

  if (error) {
    console.error('❌ Failed to fetch profiles:', error.message);
    return;
  }

  const admins = profiles?.filter(p => {
    const metadata = p.metadata as { role?: string } | null;
    return metadata?.role === 'admin';
  }) || [];

  if (admins.length === 0) {
    console.log('No admins found');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.email}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Created: ${new Date(admin.created_at).toLocaleDateString()}\n`);
  });

  console.log(`Total: ${admins.length} admin(s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  console.log('🔧 Blog Admin Management Tool\n');

  switch (command) {
    case 'grant':
      if (!email) {
        console.error('❌ Email required: npm run manage-admins -- grant user@example.com');
        process.exit(1);
      }
      await grantAdmin(email);
      break;

    case 'revoke':
      if (!email) {
        console.error('❌ Email required: npm run manage-admins -- revoke user@example.com');
        process.exit(1);
      }
      await revokeAdmin(email);
      break;

    case 'list':
      await listAdmins();
      break;

    default:
      console.log('Usage:');
      console.log('  npm run manage-admins -- grant <email>   - Grant admin access');
      console.log('  npm run manage-admins -- revoke <email>  - Revoke admin access');
      console.log('  npm run manage-admins -- list            - List all admins');
      process.exit(1);
  }
}

main().catch(console.error);
