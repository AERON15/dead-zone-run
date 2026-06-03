using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class PlasmaSMG : Weapon
    {
        public PlasmaSMG() 
            : base("plasma_smg", "Plasma SMG", "High rate of fire, moderate spray recoil spread.", damage: 5f, fireRate: 150f, bulletSpeed: 8f, life: 145)
        {
        }

        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            var list = new List<Projectile>();
            int smgBolts = 1 + player.SpreadShotCount;

            float finalDamage = player.BulletDamage;
            if (player.SpreadShotCount > 0)
            {
                finalDamage = Math.Max(1f, (float)Math.Round(finalDamage * 0.65f));
            }

            float finalSize = 10f * (1f + player.BulletSizeModifier) * 0.85f;

            if (isOverclocked)
            {
                finalDamage = (float)Math.Round(finalDamage * 1.5f);
                finalSize *= 1.5f;
            }

            var random = new Random();

            for (int s = 0; s < smgBolts; s++)
            {
                // Spray recoil offset
                float sprayAngle = angle + (float)(random.NextDouble() - 0.5) * 0.14f;

                var element = RollBulletElement(player);
                var proj = new Projectile(player.X, player.Y, 
                                          (float)Math.Cos(sprayAngle) * player.BulletSpeed, 
                                          (float)Math.Sin(sprayAngle) * player.BulletSpeed, 
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
