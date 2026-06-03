using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons.Variants
{
    public class BoomerangDisc : Weapon
    {
        public BoomerangDisc() 
            : base("boomerang_disc", "Boomerang Disc", "Fires returning spinning discs. Unlimited pierce. Scales damage/size with Pierce levels.", damage: 12f, fireRate: 650f, bulletSpeed: 5.5f, life: 400)
        {
        }

        public override List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked)
        {
            var list = new List<Projectile>();
            int discCount = 1 + player.SpreadShotCount;

            float finalDamage = player.BulletDamage;
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

            // Pierce Upgrade Synergy
            int pierceLevel = Math.Max(0, player.BulletPierceLimit - 1);
            float pierceDamageMult = 1f + pierceLevel * 0.15f;
            float pierceSizeMult = 1f + pierceLevel * 0.10f;

            float scaledDamage = (float)Math.Round(finalDamage * pierceDamageMult);
            float scaledSize = finalSize * 1.5f * pierceSizeMult;

            for (int d = 0; d < discCount; d++)
            {
                float discAngle;
                if (discCount == 1)
                {
                    discAngle = angle;
                }
                else
                {
                    float fanSpacing = 0.22f;
                    float offsetIndex = d - (discCount - 1) / 2f;
                    discAngle = angle + offsetIndex * fanSpacing;
                }

                var element = RollBulletElement(player);
                var proj = new Projectile(player.X, player.Y, 
                                          (float)Math.Cos(discAngle) * player.BulletSpeed, 
                                          (float)Math.Sin(discAngle) * player.BulletSpeed, 
                                          scaledSize, scaledDamage)
                {
                    Life = BaseLife,
                    PierceLeft = 999, // Infinite pierce
                    MaxBounces = 0,
                    BounceLeft = 0,
                    IsFire = element.isFire,
                    IsCryo = element.isCryo,
                    IsOverclocked = isOverclocked,
                    IsBoomerangDisc = true,
                    BoomerangPhase = "outward",
                    BoomerangOutwardTicks = 0,
                    BoomerangMaxOutward = 58,
                    CurveDir = (d % 2 == 0) ? 1 : -1
                };
                list.Add(proj);
            }

            return list;
        }
    }
}
