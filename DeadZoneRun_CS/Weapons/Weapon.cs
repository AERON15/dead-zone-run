using System.Collections.Generic;
using DeadZoneRun.Entities;

namespace DeadZoneRun.Weapons
{
    public abstract class Weapon
    {
        public string Id { get; protected set; }
        public string Name { get; protected set; }
        public string Description { get; protected set; }

        public float BaseDamage { get; set; }
        public float BaseFireRate { get; set; } // cooldown in ms
        public float BaseBulletSpeed { get; set; }
        public int BaseLife { get; set; }

        protected Weapon(string id, string name, string description, float damage, float fireRate, float bulletSpeed, int life)
        {
            Id = id;
            Name = name;
            Description = description;
            BaseDamage = damage;
            BaseFireRate = fireRate;
            BaseBulletSpeed = bulletSpeed;
            BaseLife = life;
        }

        // Fills elements (fire, cryo, etc.)
        protected (bool isFire, bool isCryo) RollBulletElement(Player player)
        {
            float fireChance = 0f;
            if (player.BurnLevel > 0)
            {
                fireChance = 0.30f + (player.BurnLevel - 1) * 0.25f;
            }
            
            float cryoChance = 0f;
            if (player.CryoCapsuleLevel > 0)
            {
                cryoChance = 0.30f + (player.CryoCapsuleLevel - 1) * 0.25f;
            }

            double roll = new System.Random().NextDouble();
            bool isFire = roll < fireChance;
            bool isCryo = !isFire && (roll < (fireChance + cryoChance));

            return (isFire, isCryo);
        }

        // Virtual method to fire weapon. Returns a list of generated Projectiles.
        public abstract List<Projectile> Fire(Player player, float angle, double nowTime, bool isOverclocked);
    }
}
