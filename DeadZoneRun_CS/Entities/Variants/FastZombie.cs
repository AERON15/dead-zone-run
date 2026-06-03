namespace DeadZoneRun.Entities.Variants
{
    public class FastZombie : Zombie
    {
        public FastZombie(float x, float y) 
            : base("fast", x, y, size: 34f, health: 20f, speed: 1.2f, damage: 8f, scoreValue: 15)
        {
        }
    }
}
