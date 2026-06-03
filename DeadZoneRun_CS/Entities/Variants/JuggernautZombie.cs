using System;

namespace DeadZoneRun.Entities.Variants
{
    public class JuggernautZombie : Zombie
    {
        public JuggernautZombie(float x, float y) 
            : base("juggernaut", x, y, size: 66f, health: 420f, speed: 0.65f, damage: 18f, scoreValue: 80)
        {
            AttackCooldown = 3200; // fires fan cannon blast every 3.2 seconds
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
                    currentSpeed *= 0.5f; // Juggernaut is slowed 50% by Cryo (1 - 0.5)
                }
                if (IsOnToxicTrail)
                {
                    currentSpeed *= 0.7f;
                }

                const float jMin = 280f;
                const float jMax = 420f;

                if (dist > jMax)
                {
                    // Move towards the player
                    Vx = (dx / dist) * currentSpeed;
                    Vy = (dy / dist) * currentSpeed;
                }
                else if (dist < jMin)
                {
                    // Retreat aggressively (backs away faster than it approaches)
                    Vx = -(dx / dist) * currentSpeed * 1.5f;
                    Vy = -(dy / dist) * currentSpeed * 1.5f;
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

        // Returns true if a fan cannon shot was fired
        public bool TryShoot(Player player, double nowTime, out float baseAngle, out int fanShots, out float fanSpacing)
        {
            baseAngle = 0f;
            fanShots = 6;
            fanSpacing = 0.20f; // ~11.5 degrees fanning spread

            float dx = player.X - X;
            float dy = player.Y - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);

            if (dist < 500f && nowTime - LastAttackTime >= AttackCooldown)
            {
                LastAttackTime = nowTime;
                baseAngle = (float)Math.Atan2(dy, dx);
                return true;
            }
            return false;
        }
    }
}
