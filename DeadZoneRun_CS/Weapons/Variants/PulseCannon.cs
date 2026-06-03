using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class PulseCannon : Weapon
    {
        public PulseCannon() 
            : base("pulse_cannon", "Pulse Cannon", "Fires slow orb projectiles that detonate on contact, dealing AoE void damage.", damage: 20f, fireRate: 900f, bulletSpeed: 4f, life: 180)
        {
        }

        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            var list = new List<Projectile>();
            
            // Recoil kickback on player
            player.X -= (float)Math.Cos(angle) * 3.8f;
            player.Y -= (float)Math.Sin(angle) * 3.8f;

            int totalBullets = 1 + player.SpreadShotCount + player.DoubleShotCount;

            float finalDamage = player.BulletDamage;
            if (player.SpreadShotCount > 0)
            {
                finalDamage = Math.Max(1f, (float)Math.Round(finalDamage * 0.65f));
            }

            float pulseOrbSize = 26f * (1f + player.BulletSizeModifier);

            if (isOverclocked)
            {
                finalDamage = (float)Math.Round(finalDamage * 1.5f);
                pulseOrbSize *= 1.5f;
            }

            if (totalBullets < 4)
            {
                // Parallel side-by-side orbs
                float parallelSpacing = 16f;
                float perpX = -(float)Math.Sin(angle);
                float perpY = (float)Math.Cos(angle);

                for (int p = 0; p < totalBullets; p++)
                {
                    float parallelOffset = p - (totalBullets - 1) / 2f;
                    float ox = parallelOffset * parallelSpacing * perpX;
                    float oy = parallelOffset * parallelSpacing * perpY;

                    var element = RollBulletElement(player);
                    var proj = new Projectile(player.X + ox, player.Y + oy, 
                                              (float)Math.Cos(angle) * player.BulletSpeed, 
                                              (float)Math.Sin(angle) * player.BulletSpeed, 
                                              pulseOrbSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = 1, // detonate on first contact
                        MaxBounces = 0,
                        BounceLeft = 0,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked,
                        IsPulseOrb = true
                    };
                    list.Add(proj);
                }
            }
            else
            {
                // Fan shape fanning out
                float fanAngleSpacing = 0.08f;

                for (int i = 0; i < totalBullets; i++)
                {
                    float offsetIndex = i - (totalBullets - 1) / 2f;
                    float currentAngle = angle + offsetIndex * fanAngleSpacing;

                    var element = RollBulletElement(player);
                    var proj = new Projectile(player.X, player.Y, 
                                              (float)Math.Cos(currentAngle) * player.BulletSpeed, 
                                              (float)Math.Sin(currentAngle) * player.BulletSpeed, 
                                              pulseOrbSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = 1, // detonate on first contact
                        MaxBounces = 0,
                        BounceLeft = 0,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked,
                        IsPulseOrb = true
                    };
                    list.Add(proj);
                }
            }

            return list;
        }
    }
}
