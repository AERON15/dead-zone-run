namespace DeadZoneRun.Entities.Variants
{
    public class NormalZombie : Zombie
    {
        public NormalZombie(float x, float y) 
            : base("normal", x, y, size: 42f, health: 30f, speed: 0.75f, damage: 10f, scoreValue: 10)
        {
        }
    }
}
