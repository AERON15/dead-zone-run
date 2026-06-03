namespace DeadZoneRun.Entities.Variants
{
    public class TankZombie : Zombie
    {
        public TankZombie(float x, float y) 
            : base("tank", x, y, size: 54f, health: 60f, speed: 0.5f, damage: 20f, scoreValue: 30)
        {
            AttackCooldown = 1200; // Bites slower due to size
        }
    }
}
