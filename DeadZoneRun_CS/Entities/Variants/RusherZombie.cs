using System;

namespace DeadZoneRun.Entities.Variants
{
    public class RusherZombie : Zombie
    {
        public bool HasHitPlayerThisRun { get; set; } = false;

        public RusherZombie(float x, float y) 
            : base("rusher", x, y, size: 46f, health: 45f, speed: 1.55f, damage: 18f, scoreValue: 40)
        {
        }

        // Rusher is immune to stun and toxic trail slow, but susceptible to Cryo
        public override void Chase(Player player, float worldWidth, float worldHeight)
        {
            float dx = player.X - X;
            float dy = player.Y - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);

            if (dist > 0)
            {
                float currentSpeed = Speed;

                // Slow down if frozen/cryo slow is active (Rusher has no cryo immunity)
                if (CryoSlowTicks > 0)
                {
                    CryoSlowTicks--;
                    currentSpeed *= 0.20f; // Rusher has 80% slow factor from cryo (1 - 0.80 = 0.20)
                }

                // Note: Rusher ignores StunTicks, Toxic Trail slow, and Pulse Cannon slow.
                Vx = (dx / dist) * currentSpeed;
                Vy = (dy / dist) * currentSpeed;

                X += Vx;
                Y += Vy;
            }
        }
    }
}
