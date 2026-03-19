import { getAdminClient } from './supabase';
import { generateBots } from './bot-generator';

const BOT_PASSWORD = 'BeScout2026!';

export async function setupAccounts() {
  const admin = getAdminClient();
  const bots = generateBots(BOT_PASSWORD);

  console.log(`Setting up ${bots.length} bot accounts...\n`);

  let created = 0, existing = 0, errors = 0;

  for (const bot of bots) {
    try {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: bot.email,
        password: bot.password,
        email_confirm: true,
        user_metadata: { name: bot.name, is_bot: true, archetype: bot.archetype },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          existing++;
          console.log(`  [SKIP] ${bot.email} — already exists`);
          continue;
        }
        throw authError;
      }

      const userId = authData.user.id;

      await admin.from('profiles').upsert({
        id: userId,
        username: bot.email.replace('@bescout.app', '').replace('bot-', 'user_'),
        display_name: bot.name,
        bio: bot.strategy,
        top_role: 'User',
      }, { onConflict: 'id' });

      await admin.from('wallets').upsert({
        user_id: userId,
        balance: bot.budget,
        locked_balance: 0,
      }, { onConflict: 'user_id' });

      created++;
      console.log(`  [CREATE] ${bot.email} (${bot.name}) — ${bot.archetype} — ${(bot.budget / 100).toLocaleString()} CR`);
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ${bot.email}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${created} created, ${existing} existing, ${errors} errors`);
}

// Run directly if called as script
if (require.main === module) {
  setupAccounts().catch(console.error);
}
