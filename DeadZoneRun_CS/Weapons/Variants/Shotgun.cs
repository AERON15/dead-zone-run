using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class Shotgun : Weapon
    {
        public Shotgun() 
            : base("shotgun", "Shotgun", "Fires a wide spread of short-range pellets. Strong recoil kickback.", damage: 10f, fireRate: 800f, bulletSpeed: 8.5f, life: 80)
        {
        }

        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            var list = new List<Projectile>();
            
            // Recoil kickback on player (handled directly by applying velocity offset)
            player.X -= (float)Math.Cos(angle) * 3.5f;
            player.Y -= (float)Math.Sin(angle) * 3.5f;

            int pellets = 5 + player.SpreadShotCount * 2;
            float fanSpacing = 0.07f;

            float finalDamage = player.BulletDamage;
            if (player.SpreadShotCount > 0)
            {
                finalDamage = Math.Max(1f, (float)Math.Round(finalDamage * 0.65f));
            }

            float finalSize = 10f * (1f + player.BulletSizeModifier) * 0.7f; // shotgun pellets are smaller circular sparks

            if (isOverclocked)
            {
                finalDamage = (float)Math.Round(finalDamage * 1.5f);
                finalSize *= 1.5f;
            }

            for (int s = 0; s < pellets; s++)
            {
                float offsetIndex = s - (pellets - 1) / 2f;
                float pelletAngle = angle + offsetIndex * fanSpacing;

                var element = RollBulletElement(player);
                var proj = new Projectile(player.X, player.Y, 
                                          (float)Math.Cos(pelletAngle) * player.BulletSpeed, 
                                          (float)Math.Sin(pelletAngle) * player.BulletSpeed, 
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

            return list;
        }
    }
}
