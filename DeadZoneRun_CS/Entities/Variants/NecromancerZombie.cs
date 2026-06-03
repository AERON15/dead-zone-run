using System;
using System.Collections.Generic;

namespace DeadZoneRun.Entities.Variants
{
    public class NecromancerZombie : Zombie
    {
        public bool IsSummoning { get; set; } = false;
        public double SummonCastEndsAt { get; set; } = 0;
        public double LastSummonTime { get; set; } = 0;
        public float SummonCooldown { get; set; } = 8000f; // 8 seconds default
        public float SummonCastTime { get; set; } = 1500f; // 1.5 seconds warning

        public NecromancerZombie(float x, float y) 
            : base("necromancer", x, y, size: 46f, health: 40f, speed: 0.6f, damage: 12f, scoreValue: 50)
        {
            LastSummonTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        public override void Chase(Player player, float worldWidth, float worldHeight)
        {
            if (StunTicks > 0)
            {
                StunTicks--;
                return;
            }

            // If casting/summoning, stand still
            if (IsSummoning)
            {
                Vx = 0;
                Vy = 0;
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

                const float sweetSpotMax = 450f;
                const float sweetSpotMin = 280f;

                if (dist > sweetSpotMax)
                {
                    Vx = (dx / dist) * currentSpeed;
                    Vy = (dy / dist) * currentSpeed;
                }
                else if (dist < sweetSpotMin)
                {
                    Vx = -(dx / dist) * currentSpeed;
                    Vy = -(dy / dist) * currentSpeed;
                }
                else
                {
                    Vx = 0;
                    Vy = 0;
                }

                X += Vx;
                Y += Vy;
            }
        }

        // Triggers the start of summoning. Returns target spots to create warning indicator.
        public List<(float x, float y, string type)> StartSummoning(double nowTime, float worldWidth, float worldHeight)
        {
            IsSummoning = true;
            SummonCastEndsAt = nowTime + SummonCastTime;
            LastSummonTime = nowTime;

            var spots = new List<(float x, float y, string type)>();
            var possibleTypes = new[] { "normal", "fast", "tank", "spitter" };
            var random = new Random();

            for (int i = 0; i < 3; i++)
            {
                double angle = random.NextDouble() * Math.PI * 2;
                double radius = 70 + random.NextDouble() * 70;
                string chosenType = possibleTypes[random.Next(possibleTypes.Length)];

                float spotX = (float)Math.Max(20, Math.Min(worldWidth - 20, X + Math.Cos(angle) * radius));
                float spotY = (float)Math.Max(20, Math.Min(worldHeight - 20, Y + Math.Sin(angle) * radius));

                spots.Add((spotX, spotY, chosenType));
            }

            return spots;
        }
    }
}
