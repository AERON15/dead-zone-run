namespace DeadZoneRun.Entities
{
    public abstract class Entity
    {
        public float X { get; set; }
        public float Y { get; set; }
        public float Vx { get; set; }
        public float Vy { get; set; }
        public float Size { get; set; }
        public float Speed { get; set; }
        public bool IsActive { get; set; } = true;

        protected Entity(float x, float y, float size, float speed = 0f)
        {
            X = x;
            Y = y;
            Size = size;
            Speed = speed;
        }

        public virtual void Update()
        {
            X += Vx;
            Y += Vy;
        }

        public float DistanceTo(Entity other)
        {
            float dx = other.X - X;
            float dy = other.Y - Y;
            return (float)System.Math.Sqrt(dx * dx + dy * dy);
        }

        public float DistanceSquaredTo(Entity other)
        {
            float dx = other.X - X;
            float dy = other.Y - Y;
            return dx * dx + dy * dy;
        }

        public bool CheckCollision(Entity other)
        {
            float radiusSum = (Size + other.Size) / 2f;
            return DistanceSquaredTo(other) < (radiusSum * radiusSum);
        }
    }
}
