using System;
using System.Collections.Generic;

namespace DeadZoneRun.Entities
{
    public class Player : Entity
    {
        // Core Attributes
        public float Health { get; set; }
        public float MaxHealth { get; set; } = 100f;
        public int Score { get; set; } = 0;
        public int Coins { get; set; } = 0;

        // Weapon Selection
        public string SelectedGun { get; set; } = "pistol";
        public float BulletDamage { get; set; } = 10f;
        public float BulletSpeed { get; set; } = 7f;
        public float FireRate { get; set; } = 500f; // Cooldown in ms
        public double LastShotTime { get; set; } = 0;

        // Upgrades Modifiers
        public int DoubleShotCount { get; set; } = 0;
        public int SpreadShotCount { get; set; } = 0;
        public int BulletPierceLimit { get; set; } = 1;
        public int BounceLimit { get; set; } = 0;
        public float LifestealAmount { get; set; } = 0f;
        public int BurnLevel { get; set; } = 0;
        public int CryoCapsuleLevel { get; set; } = 0;
        public int OverclockLevel { get; set; } = 0;
        public int OverclockShotCounter { get; set; } = 0;

        // Legendary Upgrades
        public int NecroBombLevel { get; set; } = 0;
        public int ChainLightningLevel { get; set; } = 0;
        public int LightningShotCounter { get; set; } = 0;
        public int OrbitingDefenderLevel { get; set; } = 0;
        public float DefenderAngle { get; set; } = 0f;

        // Stackable Upgrades
        public float DamageReduction { get; set; } = 0.0f;
        public int RunnersHighLevel { get; set; } = 0;
        public float BulletSizeModifier { get; set; } = 0.0f;
        public int RetaliateLevel { get; set; } = 0;
        public double RetaliateExpiry { get; set; } = 0;
        public int ShockwaveLevel { get; set; } = 0;
        public float KnockbackModifier { get; set; } = 0.0f;
        public int SteadyAimLevel { get; set; } = 0;
        public int StillTicks { get; set; } = 0;
        public float DodgeChance { get; set; } = 0.0f;
        public int SplinterShotLevel { get; set; } = 0;
        public int ShieldLevel { get; set; } = 0;
        public float WaveHealPercentage { get; set; } = 0.15f;
        public int SlowStartLevel { get; set; } = 0;
        public int StimulantLevel { get; set; } = 0;
        public int KillFrenzyTimer { get; set; } = 0;
        public int FairyAuraLevel { get; set; } = 0;
        public int RustyTurretLevel { get; set; } = 0;
        public int BomberTurretLevel { get; set; } = 0;

        // Active Upgrades List
        public List<string> UpgradesChosen { get; } = new List<string>();

        public Player(float x, float y) : base(x, y, size: 36f, speed: 2.8f)
        {
            Health = MaxHealth;
        }

        public void TakeDamage(float amount)
        {
            // Apply armor/damage reduction
            float actualDamage = amount * (1f - DamageReduction);
            Health = Math.Max(0f, Health - actualDamage);
        }

        public void Heal(float amount)
        {
            Health = Math.Min(MaxHealth, Health + amount);
        }
    }
}
