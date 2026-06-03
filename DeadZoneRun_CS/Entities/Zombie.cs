using System;

namespace DeadZoneRun.Entities
{
    public abstract class Zombie : Entity
    {
        public string Type { get; protected set; }
        public float Health { get; set; }
        public float MaxHealth { get; set; }
        public float Damage { get; set; }
        public int ScoreValue { get; set; }
        public int AttackCooldown { get; set; } = 1000; // in milliseconds
        public double LastAttackTime { get; set; } = 0;

        // Status Effects (Ticks based)
        public int StunTicks { get; set; } = 0;
        public int BurnTicks { get; set; } = 0;
        public int CryoSlowTicks { get; set; } = 0;
        public bool IsOnToxicTrail { get; set; } = false;
        public int FlashTicks { get; set; } = 0;
        public bool HasShield { get; set; } = false;
        public int ShieldPulseTick { get; set; } = 0;

        // Flags
        public bool HasHitPlayer { get; set; } = false;

        protected Zombie(string type, float x, float y, float size, float health, float speed, float damage, int scoreValue)
            : base(x, y, size, speed)
        {
            Type = type;
            MaxHealth = health;
            Health = health;
            Damage = damage;
            ScoreValue = scoreValue;
        }

        public virtual void TakeDamage(float amount)
        {
            Health = Math.Max(0f, Health - amount);
            FlashTicks = Math.Max(FlashTicks, 2); // Flash white/green briefly when hit
        }

        public virtual void ApplyBurn(int ticks)
        {
            BurnTicks = Math.Max(BurnTicks, ticks);
        }

        public virtual void ApplyCryo(int ticks)
        {
            CryoSlowTicks = Math.Max(CryoSlowTicks, ticks);
        }

        public virtual void ApplyStun(int ticks)
        {
            StunTicks = Math.Max(StunTicks, ticks);
        }

        // Pathfind towards player. We will customize this in sub-variants.
        public virtual void Chase(Player player, float worldWidth, float worldHeight)
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

                // Slow down if frozen/cryo slows are active
                if (CryoSlowTicks > 0)
                {
                    CryoSlowTicks--;
                    currentSpeed *= 0.5f; // Cryo reduces speed by 50%
                }

                // Toxic trail slows down speed as well
                if (IsOnToxicTrail)
                {
                    currentSpeed *= 0.7f;
                }

                Vx = (dx / dist) * currentSpeed;
                Vy = (dy / dist) * currentSpeed;

                X += Vx;
                Y += Vy;
            }
        }
    }
}
