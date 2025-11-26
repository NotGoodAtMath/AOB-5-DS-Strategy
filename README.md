# AOB-5-DS-Strategy
Can's 4 BR HR Strategy

In this setup each strategy uses the same 7-level progression the spreadsheet defined. Each level is designed to recover cumulative losses and add a target profit, so the “profitability” of a level really depends on (1) how often you actually land a win before going broke on level 7, and (2) how many times you’re allowed to stay at that level (the “replay times”).

Sweet spots / high-yield zones:

Levels 4–6 are where the profitability jumps without yet risking the final all-in:
Level 4 “milks” up to three wins (initial + 2 replays) at $10.80 each, so if you get on a heater here you can claw back earlier losses fast.
Level 5 returns $43.20 per win and repeats once.
Level 6 pays $172.80 and also repeats once. These are the sweet spots by design: they let you stay a couple spins at the levels that offer the best risk/reward before jumping back to level 1.
Level 7 is the “hail Mary.” It saves the bankroll in theory (recovering all $7,207), but if it fails the simulation stops. So it’s not a sweet spot; it’s the bailout option. The strategy only reaches it after six straight losses (which is rare but not impossible). Any profit coming from level 7 is huge, but it’s also the indicator that something went wrong earlier.
Levels 1–3 are low-yield but high-frequency. They’re profitable in aggregate because they happen most often. They’re not “sweet” in terms of payout, but they keep the progression from climbing when the wheel is favorable.
Practical takeaways
Expect most profit to come from repeated wins at Levels 3–6. Your Monte Carlo runs will typically show the cards spending a lot of time around those levels—when you see green status on Level 4 or 5, that’s the sweet spot doing its job.
Loss streaks that push you into Level 7 are the danger zone; every strategy stops if the $6,048 bet can’t be covered or loses.
When analyzing the CSV history, look at sequences where the “progression” column stays at 4, 5, or 6 with positive results—that’s where the strategy extracts value.
So, sweet/profitable progressions = levels 3–6 (especially 4–6 for payoff), while level 7 is purely a recovery attempt and level 1–2 are just maintenance wins.
