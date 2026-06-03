namespace DeadZoneRun.Entities.Variants
{
    public class ExploderZombie : Zombie
    {
        public ExploderZombie(float x, float y) 
            : base("exploder", x, y, size: 42f, health: 15f, speed: 1.45f, damage: 45f, scoreValue: 25)
        {
        }

        // Exploder explodes, which is triggered when it gets killed or touches the player.
        public void Explode(System.Action<float, float, float> triggerExplosionCallback)
        {
            // Triggers a 45 damage AoE explosion centered on its death position
            triggerExplosionCallback?.Invoke(X, Y, Damage);
            Health = 0;
            IsActive = false;
        }
    }
}
