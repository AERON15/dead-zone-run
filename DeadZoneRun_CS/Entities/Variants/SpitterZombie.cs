using System;

namespace DeadZoneRun.Entities.Variants
{
    public class SpitterZombie : Zombie
    {
        public SpitterZombie(float x, float y) 
            : base("spitter", x, y, size: 38f, health: 25f, speed: 0.7f, damage: 10f, scoreValue: 25)
        {
            AttackCooldown = 2000; // Spits every 2 seconds
        }

        public override void Chase(Player player, float worldWidth, float worldHeight)
        {
            if (StunTicks > 0)
            {
                StunTicks--;
                return;
            }

            float dx = player.X - X;
            float dy = player.Y - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);

            if (dist > 0)
            {
                float currentSpeed = Speed;
                if (CryoSlowTicks > 0)
                {
                    CryoSlowTicks--;
                    currentSpeed *= 0.5f;
                }
                if (IsOnToxicTrail)
                {
                    currentSpeed *= 0.7f;
                }

                const float sweetSpotMax = 340f;
                const float sweetSpotMin = 220f;

                if (dist > sweetSpotMax)
                {
                    // Too far: Move towards the player
                    Vx = (dx / dist) * currentSpeed;
                    Vy = (dy / dist) * currentSpeed;
                }
                else if (dist < sweetSpotMin)
                {
                    // Too close: Kite and retreat
                    Vx = -(dx / dist) * currentSpeed;
                    Vy = -(dy / dist) * currentSpeed;
                }
                else
                {
                    // Sweet spot: stand still
                    Vx = 0;
                    Vy = 0;
                }

                X += Vx;
                Y += Vy;
            }
        }

        // Returns true if a spit projectile was fired
        public bool TryShoot(Player player, double nowTime, out float projectileAngle)
        {
            projectileAngle = 0f;
            float dx = player.X - X;
            float dy = player.Y - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);

            if (dist < 400f && nowTime - LastAttackTime >= AttackCooldown)
            {
                LastAttackTime = nowTime;
                projectileAngle = (float)Math.Atan2(dy, dx);
                return true;
            }
            return false;
        }
    }
}
