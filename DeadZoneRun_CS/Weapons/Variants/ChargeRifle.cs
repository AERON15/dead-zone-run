using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class ChargeRifle : Weapon
    {
        public ChargeRifle() 
            : base("charge_rifle", "Charge Rifle", "Advanced high-voltage cyber rifle. Hold to charge, release to fire. Full charge inflicts 4x damage and auto-pierces.", damage: 15f, fireRate: 350f, bulletSpeed: 10f, life: 220)
        {
        }

        // Custom Fire implementation that takes a chargeFraction parameter (from 0.0 to 1.0)
        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            // By default, fire at minimum charge if called generically
            return FireCharged(player, angle, nowTime, isOverclocked, chargeFraction: 0.0f);
        }

        public List<Projectile> FireCharged(Player player, float angle, double nowTime, bool isOverclocked, float chargeFraction)
        {
            var list = new List<Projectile>();
            bool isFullCharge = chargeFraction >= 1.0f;

            // Recoil kickback on player (up to 8.0px pushback at full charge)
            float recoilForce = 1.8f + chargeFraction * 6.2f;
            player.X -= (float)Math.Cos(angle) * recoilForce;
            player.Y -= (float)Math.Sin(angle) * recoilForce;

            float damageMult = 1.0f + chargeFraction * 3.0f; // 1x to 4x damage
            float finalDamage = (float)Math.Round(player.BulletDamage * damageMult);
            float finalSize = 10f * (1f + player.BulletSizeModifier) * (0.7f + chargeFraction * 0.9f); // oversized rail blast

            if (isOverclocked)
            {
                finalDamage = (float)Math.Round(finalDamage * 1.5f);
                finalSize *= 1.5f;
            }

            int finalPierce = isFullCharge ? 999 : player.BulletPierceLimit;
            int totalBeams = 1 + player.SpreadShotCount;

            // Double Shot penalty applies to spread beams
            if (player.SpreadShotCount > 0)
            {
                finalDamage = Math.Max(1f, (float)Math.Round(finalDamage * 0.65f));
            }

            if (totalBeams < 4)
            {
                // Parallel side-by-side beams
                float perpX = -(float)Math.Sin(angle);
                float perpY = (float)Math.Cos(angle);
                float parallelSpacing = 16f;

                for (int p = 0; p < totalBeams; p++)
                {
                    float parallelOffset = p - (totalBeams - 1) / 2f;
                    float ox = parallelOffset * parallelSpacing * perpX;
                    float oy = parallelOffset * parallelSpacing * perpY;

                    var element = RollBulletElement(player);
                    var proj = new Projectile(player.X + ox, player.Y + oy, 
                                              (float)Math.Cos(angle) * player.BulletSpeed, 
                                              (float)Math.Sin(angle) * player.BulletSpeed, 
                                              finalSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = finalPierce,
                        MaxBounces = player.BounceLimit,
                        BounceLeft = player.BounceLimit,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked,
                        IsChargedShot = true,
                        ChargeFraction = chargeFraction
                    };
                    list.Add(proj);
                }
            }
            else
            {
                // Fan shape fanning out
                float fanAngleSpacing = 0.08f;

                for (int p = 0; p < totalBeams; p++)
                {
                    float offsetIndex = p - (totalBeams - 1) / 2f;
                    float beamAngle = angle + offsetIndex * fanAngleSpacing;

                    var element = RollBulletElement(player);
                    var proj = new Projectile(player.X, player.Y, 
                                              (float)Math.Cos(beamAngle) * player.BulletSpeed, 
                                              (float)Math.Sin(beamAngle) * player.BulletSpeed, 
                                              finalSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = finalPierce,
                        MaxBounces = player.BounceLimit,
                        BounceLeft = player.BounceLimit,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked,
                        IsChargedShot = true,
                        ChargeFraction = chargeFraction
                    };
                    list.Add(proj);
                }
            }

            return list;
        }
    }
}
