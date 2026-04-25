// Slice 194: Refresh Bot-Wallets nach Budget-Hochzug.
// Bots existieren schon aus fruehen Setups, aber Wallet-Balance ist alt (5-15k $SCOUT).
// Dieses Script setzt alle 50 Bot-Wallets auf neuen Budget aus archetypes.ts.
// Run: npx tsx e2e/bots/ai/refresh-wallets.ts

import { getAdminClient } from './supabase';
import { generateBots } from './bot-generator';

const BOT_PASSWORD = 'BeScout2026!';

async function refreshWallets() {
  const admin = getAdminClient();
  const bots = generateBots(BOT_PASSWORD);

  console.log(`Refreshing ${bots.length} bot wallets to new budgets...\n`);

  let updated = 0, missing = 0, errors = 0;

  for (const bot of bots) {
    try {
      // Find user by email
      const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
      if (listError) throw listError;

      const user = users.find((u) => u.email === bot.email);
      if (!user) {
        missing++;
        console.log(`  [MISSING] ${bot.email} — bot user not found`);
        continue;
      }

      // Update wallet balance to new archetype budget
      const { error: walletError } = await admin
        .from('wallets')
        .update({ balance: bot.budget })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      updated++;
      console.log(
        `  [REFRESH] ${bot.email} (${bot.archetype}) → ${(bot.budget / 100).toLocaleString('de')} CR`,
      );
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ${bot.email}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Total budget check
  const totalBudgetCents = bots.reduce((sum, b) => sum + b.budget, 0);
  const totalScout = totalBudgetCents / 100;

  console.log(`\nDone: ${updated} updated, ${missing} missing, ${errors} errors`);
  console.log(`Total Bot-Pool: ${totalScout.toLocaleString('de')} $SCOUT (${(totalBudgetCents / 100_000_00).toFixed(0)}M cents)`);
}

if (require.main === module) {
  refreshWallets().catch(console.error);
}
