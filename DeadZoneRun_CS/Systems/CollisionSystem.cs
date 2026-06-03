using System;
using System.Collections.Generic;
using DeadZoneRun.Entities;
using DeadZoneRun.Entities.Variants;
using DeadZoneRun.Weapons;

namespace DeadZoneRun.Systems
{
    public class CollisionSystem
    {
        public void UpdateCollisions(
            List<Projectile> bullets, 
            List<Zombie> zombies, 
            Player player, 
            double nowTime,
            Action<float, float, float> triggerExplosionCallback,
            Action<float, float, float, bool, bool> triggerPulseCallback,
            Action<float, float, float, float, float, Zombie, bool, bool> spawnShrapnelCallback)
        {
            // 1. Bullet-Zombie Collisions
            for (int bIdx = bullets.Count - 1; bIdx >= 0; bIdx--)
            {
                var b = bullets[bIdx];
                if (!b.IsActive) continue;

                for (int zIdx = zombies.Count - 1; zIdx >= 0; zIdx--)
                {
                    var z = zombies[zIdx];
                    if (z.Health <= 0) continue;

                    // Prevent hitting same zombie twice with same pierce bullet
                    if (b.HitZombies.Contains(z)) continue;

                    // Fast AABB pre-filter
                    float limit = (b.Size + z.Size) / 2f + 5f;
                    float hitDx = b.X - z.X;
                    if (hitDx > limit || hitDx < -limit) continue;

                    float hitDy = b.Y - z.Y;
                    if (hitDy > limit || hitDy < -limit) continue;

                    // Circle-Circle check
                    float radiusSum = b.Size / 2f + z.Size / 2f;
                    float distSq = hitDx * hitDx + hitDy * hitDy;

                    if (distSq < radiusSum * radiusSum)
                    {
                        // Hit detected!
                        float damageDealt = b.Damage;

                        // Check critical hits
                        bool isCrit = false;
                        if (!b.IsTurretBullet)
                        {
                            var random = new Random();
                            if (player.DodgeChance > 0 && random.NextDouble() < player.DodgeChance)
                            {
                                // Critical Chance uses critChance or similar
                            }
                            
                            // Weak Point Scan (Crit hit)
                            if (player.DodgeChance > 0f) // Crit chances / finisher rules
                            {
                                // etc.
                            }
                        }

                        // Detonate Mortar Shell
                        if (b.IsMortarShell)
                        {
                            triggerExplosionCallback?.Invoke(b.X, b.Y, damageDealt);
                            b.IsActive = false;
                            break;
                        }

                        // Detonate Pulse Orb
                        if (b.IsPulseOrb)
                        {
                            triggerPulseCallback?.Invoke(b.X, b.Y, damageDealt, b.IsFire, b.IsCryo);
                            b.IsActive = false;
                            break;
                        }

                        // Deal damage
                        z.TakeDamage(damageDealt);

                        // Element logic
                        if (b.IsFire) z.ApplyBurn(180); // 1.5 - 3 seconds
                        if (b.IsCryo) z.ApplyCryo(180);

                        // Knockback physics
                        if (!b.IsTurretBullet)
                        {
                            float travelAngle = (float)Math.Atan2(b.Vy, b.Vx);
                            float pushForce = 8f * (1f + player.KnockbackModifier);
                            if (z.Type != "rusher" && z.Type != "patient_zero")
                            {
                                z.X += (float)Math.Cos(travelAngle) * pushForce;
                                z.Y += (float)Math.Sin(travelAngle) * pushForce;
                            }
                        }

                        // Splinter Shot split shrapnel
                        if (!b.IsTurretBullet && player.SplinterShotLevel > 0 && !b.IsShrapnel && !b.HasSplintered)
                        {
                            b.HasSplintered = true;
                            spawnShrapnelCallback?.Invoke(b.X, b.Y, b.Vx, b.Vy, b.Damage, z);
                        }

                        b.HitZombies.Add(z);
                        
                        // Pierce Left decrement
                        b.PierceLeft--;
                        if (b.PierceLeft <= 0)
                        {
                            b.IsActive = false;
                        }

                        break; // Stop checking other zombies for this bullet in this frame
                    }
                }
            }

            // 2. Zombie-Player Collisions
            for (int zIdx = zombies.Count - 1; zIdx >= 0; zIdx--)
            {
                var z = zombies[zIdx];
                if (z.Health <= 0) continue;

                float zDx = player.X - z.X;
                float zDy = player.Y - z.Y;
                float distance = (float)Math.Sqrt(zDx * zDx + zDy * zDy);
                float radiusSum = player.Size / 2f + z.Size / 2f;

                if (distance < radiusSum)
                {
                    // Resolve overlap
                    float overlap = radiusSum - distance;
                    if (overlap > 0 && distance > 0)
                    {
                        z.X -= (zDx / distance) * overlap;
                        z.Y -= (zDy / distance) * overlap;
                    }

                    // Perform damage tick
                    if (z.Type != "spitter" && z.Type != "exploder")
                    {
                        if (nowTime - z.LastAttackTime >= z.AttackCooldown)
                        {
                            z.LastAttackTime = nowTime;
                            
                            // Check Dodge evades
                            var random = new Random();
                            if (player.DodgeChance > 0f && random.NextDouble() < player.DodgeChance)
                            {
                                // Evaded!
                                continue;
                            }

                            player.TakeDamage(z.Damage);

                            // Rusher stun on hit
                            if (z is RusherZombie rusher && !rusher.HasHitPlayerThisRun)
                            {
                                rusher.HasHitPlayerThisRun = true;
                                player.StillTicks = 0;
                                player.SlowStartLevel = 0; // custom stun
                                // Stun the player for 1.5 seconds (90 frames)
                                // We can write player.StunTicks = 90;
                            }
                        }
                    }
                }
            }

            // 3. Zombie-Zombie Crowd Separation
            for (int i = 0; i < zombies.Count; i++)
            {
                var z1 = zombies[i];
                if (z1.Health <= 0) continue;

                for (int j = i + 1; j < zombies.Count; j++)
                {
                    var z2 = zombies[j];
                    if (z2.Health <= 0) continue;

                    float dx = z2.X - z1.X;
                    float dy = z2.Y - z1.Y;
                    float dist = (float)Math.Sqrt(dx * dx + dy * dy);
                    float minDistance = (z1.Size + z2.Size) / 2f;

                    if (dist < minDistance && dist > 0)
                    {
                        float overlap = minDistance - dist;
                        // Push them apart slightly (e.g. 50% each)
                        float pushX = (dx / dist) * overlap * 0.5f;
                        float pushY = (dy / dist) * overlap * 0.5f;

                        z1.X -= pushX;
                        z1.Y -= pushY;
                        z2.X += pushX;
                        z2.Y += pushY;
                    }
                }
            }
        }
    }
}
