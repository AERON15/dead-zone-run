using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons
{
    public class Projectile : Entity
    {
        // Core Projectile Stats
        public float Damage { get; set; }
        public int Age { get; set; } = 0;
        public int Life { get; set; } = 150; // default lifespan in ticks
        public string ColorHex { get; set; } = "#ffffff";

        // Piercing and Bouncing Mechanics
        public int PierceLeft { get; set; } = 1;
        public int MaxBounces { get; set; } = 0;
        public int BounceLeft { get; set; } = 0;
        public HashSet<Zombie> HitZombies { get; } = new HashSet<Zombie>();

        // Type Flags
        public bool IsShrapnel { get; set; } = false;
        public bool HasSplintered { get; set; } = false;
        public bool IsTurretBullet { get; set; } = false;
        public bool IsMortarShell { get; set; } = false;
        
        // Element Infusions
        public bool IsFire { get; set; } = false;
        public bool IsCryo { get; set; } = false;
        public bool IsOverclocked { get; set; } = false;
        public bool IsPulseOrb { get; set; } = false;

        // Custom Charge & Weapon specific values
        public bool IsChargedShot { get; set; } = false;
        public float ChargeFraction { get; set; } = 0.0f;
        public bool IsBoomerangDisc { get; set; } = false;
        public string BoomerangPhase { get; set; } = "outward"; // "outward" or "returning"
        public int BoomerangOutwardTicks { get; set; } = 0;
        public int BoomerangMaxOutward { get; set; } = 58;
        public float SpinAngle { get; set; } = 0f;
        public int CurveDir { get; set; } = 1; // 1 or -1 for symmetric curving
        public List<(float x, float y)> TrailHistory { get; } = new List<(float x, float y)>();

        public Projectile(float x, float y, float vx, float vy, float size, float damage)
            : base(x, y, size)
        {
            Vx = vx;
            Vy = vy;
            Damage = damage;
        }

        public override void Update()
        {
            base.Update();
            Age++;

            if (Age >= Life)
            {
                IsActive = false;
            }

            if (IsBoomerangDisc)
            {
                SpinAngle += 0.22f; // Spin speed rotation
                
                // Track visual trail history
                TrailHistory.Add((X, Y));
                if (TrailHistory.Count > 6)
                {
                    TrailHistory.RemoveAt(0);
                }
            }
        }
    }
}
