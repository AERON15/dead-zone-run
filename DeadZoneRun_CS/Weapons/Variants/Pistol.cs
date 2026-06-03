using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class Pistol : Weapon
    {
        public Pistol() 
            : base("pistol", "Laser Pistol", "Default energy weapon. Medium speed, medium damage.", damage: 10f, fireRate: 500f, bulletSpeed: 7f, life: 150)
        {
        }

        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            var list = new List<Projectile>();
            int totalBullets = 1 + player.SpreadShotCount + player.DoubleShotCount;

            // Calculate damage & size modifiers
            float finalDamage = player.BulletDamage;
            
            // Steady Aim standing bonus
            bool isPlayerMoving = false; // System handles this globally
            if (!isPlayerMoving && player.SteadyAimLevel > 0 && player.StillTicks >= 360)
            {
                finalDamage += Math.Min(60f, player.SteadyAimLevel * 15f);
            }

            // Double Shot / Spread shot penalty (-35% damage if extra bullets)
            if (player.SpreadShotCount > 0)
            {
                finalDamage = Math.Max(1f, (float)Math.Round(finalDamage * 0.65f));
            }

            float finalSize = 10f * (1f + player.BulletSizeModifier);

            if (isOverclocked)
            {
                finalDamage = (float)Math.Round(finalDamage * 1.5f);
                finalSize *= 1.5f;
            }

            if (totalBullets < 4)
            {
                // Perfectly parallel side-by-side bullets
                float parallelSpacing = 14f;
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
                                              finalSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = player.BulletPierceLimit,
                        MaxBounces = player.BounceLimit,
                        BounceLeft = player.BounceLimit,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked
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
                                              finalSize, finalDamage)
                    {
                        Life = BaseLife,
                        PierceLeft = player.BulletPierceLimit,
                        MaxBounces = player.BounceLimit,
                        BounceLeft = player.BounceLimit,
                        IsFire = element.isFire,
                        IsCryo = element.isCryo,
                        IsOverclocked = isOverclocked
                    };
                    list.Add(proj);
                }
            }

            return list;
        }
    }
}
