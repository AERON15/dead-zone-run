using System;

namespace DeadZoneRun.Entities.Variants
{
    public class PatientZeroZombie : Zombie
    {
        public double LastSummonTime { get; set; } = 0;
        public double LastRangedAttackTime { get; set; } = 0;
        public int RangedAttackBurstLeft { get; set; } = 0;
        public double NextRangedShotTime { get; set; } = 0;

        public bool IsSummoning { get; set; } = false;
        public double SummonCastEndsAt { get; set; } = 0;

        public PatientZeroZombie(float x, float y, float health) 
            : base("patient_zero", x, y, size: 140f, health: health, speed: 1.15f, damage: 25f, scoreValue: 500)
        {
            AttackCooldown = 800; // Fast bite
            double nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            LastSummonTime = nowMs;
            LastRangedAttackTime = nowMs - 5000; // 5s breathing room before first projectile attack
        }

        // Custom shooting loop triggers every 10 seconds.
        // Returns true if a burst is started.
        public bool UpdateRangedBurst(double nowTime)
        {
            if (RangedAttackBurstLeft <= 0 && nowTime - LastRangedAttackTime >= 10000 && !IsSummoning)
            {
                LastRangedAttackTime = nowTime;
                RangedAttackBurstLeft = 3; // 3 rapid shots in the burst
                NextRangedShotTime = nowTime; // Fire first shot immediately
                return true;
            }
            return false;
        }
    }
}
