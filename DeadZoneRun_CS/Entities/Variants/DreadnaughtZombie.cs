using System;
using System.Collections.Generic;

namespace DeadZoneRun.Entities.Variants
{
    public class DreadnaughtZombie : Zombie
    {
        public double LastBlinkTime { get; set; } = 0;
        public double LastFanTime { get; set; } = 0;
        public int BlinkFlash { get; set; } = 0;
        public bool SummonDone { get; set; } = false;
        public bool IsWraith { get; set; } = false;

        public DreadnaughtZombie(float x, float y, float health) 
            : base("dreadnaught", x, y, size: 162f, health: health, speed: 1.45f, damage: 20f, scoreValue: 600)
        {
            AttackCooldown = 800; // Fast contact hit rate
            double nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            LastBlinkTime = nowMs + 4000; // 4s breathing room before first blink
            LastFanTime = nowMs + 3000;   // 3s breathing room before first fan attack
        }

        public override void Chase(Player player, float worldWidth, float worldHeight)
        {
            if (StunTicks > 0)
            {
                StunTicks--;
                return;
            }

            float dx = player.X - X;
            float dy = player.Y - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);

            // Dreadnaught is immune to standard slowdowns except Cryo
            float currentSpeed = Speed;
            if (CryoSlowTicks > 0)
            {
                CryoSlowTicks--;
                currentSpeed *= 0.5f; // slowed 50%
            }

            // Dreadnaught does not have kiting behavior; it glides towards the player
            if (dist > 0)
            {
                Vx = (dx / dist) * currentSpeed;
                Vy = (dy / dist) * currentSpeed;
                X += Vx;
                Y += Vy;
            }

            // Update wraith reduction state (below 50% HP)
            IsWraith = (Health / MaxHealth) <= 0.50f;

            if (BlinkFlash > 0)
            {
                BlinkFlash--;
            }
        }

        // Returns true if teleport (blink) occurred.
        public bool TryBlink(double nowTime, float cameraX, float cameraY, float canvasWidth, float canvasHeight, float worldWidth, float worldHeight, out float oldX, out float oldY)
        {
            oldX = X;
            oldY = Y;

            if (nowTime - LastBlinkTime >= 6000)
            {
                LastBlinkTime = nowTime;
                BlinkFlash = 18;

                // Pick random screen edge side
                Random random = new Random();
                int blinkSide = random.Next(4);
                float blinkBuf = 100f;

                if (blinkSide == 0)
                {
                    X = cameraX + (float)random.NextDouble() * canvasWidth;
                    Y = cameraY + blinkBuf;
                }
                else if (blinkSide == 1)
                {
                    X = cameraX + canvasWidth - blinkBuf;
                    Y = cameraY + (float)random.NextDouble() * canvasHeight;
                }
                else if (blinkSide == 2)
                {
                    X = cameraX + (float)random.NextDouble() * canvasWidth;
                    Y = cameraY + canvasHeight - blinkBuf;
                }
                else
                {
                    X = cameraX + blinkBuf;
                    Y = cameraY + (float)random.NextDouble() * canvasHeight;
                }

                // Keep inside world bounds
                X = Math.Max(40f, Math.Min(worldWidth - 40f, X));
                Y = Math.Max(40f, Math.Min(worldHeight - 40f, Y));
                return true;
            }

            return false;
        }

        // Returns true if a dual-cannon fan attack was fired.
        public bool TryShootDualCannons(double nowTime, out float fanBaseAngle, out List<(float x, float y)> muzzlePositions)
        {
            fanBaseAngle = 0f;
            muzzlePositions = new List<(float x, float y)>();

            if (nowTime - LastFanTime >= 5000)
            {
                LastFanTime = nowTime;
                return true;
            }

            return false;
        }
    }
}
