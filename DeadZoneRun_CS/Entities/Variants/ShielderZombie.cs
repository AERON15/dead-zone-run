using System;
using System.Collections.Generic;

namespace DeadZoneRun.Entities.Variants
{
    public class ShielderZombie : Zombie
    {
        public double LastShieldCastTime { get; set; } = 0;
        public float ShieldCastInterval { get; set; } = 10000f; // 10 seconds in ms
        public int ShieldCastIndicatorTicks { get; set; } = 0;

        public ShielderZombie(float x, float y) 
            : base("shielder", x, y, size: 52f, health: 90f, speed: 0.5f, damage: 10f, scoreValue: 60)
        {
            LastShieldCastTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        // Returns up to 5 target zombies to shield
        public List<Zombie> TryCastShield(List<Zombie> allZombies, double nowTime)
        {
            var targets = new List<Zombie>();

            if (nowTime - LastShieldCastTime >= ShieldCastInterval)
            {
                LastShieldCastTime = nowTime;

                // Find candidate zombies (alive, not self, and doesn't already have shield)
                var candidates = new List<Zombie>();
                foreach (var z in allZombies)
                {
                    if (z != this && !z.HasShield && z.Health > 0)
                    {
                        candidates.Add(z);
                    }
                }

                if (candidates.Count > 0)
                {
                    ShieldCastIndicatorTicks = 45; // trigger casting ring visual ticks

                    // Select up to 5 randomly
                    if (candidates.Count <= 5)
                    {
                        targets.AddRange(candidates);
                    }
                    else
                    {
                        var random = new Random();
                        // Shuffle candidates
                        for (int i = candidates.Count - 1; i > 0; i--)
                        {
                            int k = random.Next(i + 1);
                            var temp = candidates[i];
                            candidates[i] = candidates[k];
                            candidates[k] = temp;
                        }
                        targets.AddRange(candidates.GetRange(0, 5));
                    }
                }
            }

            return targets;
        }
    }
}
