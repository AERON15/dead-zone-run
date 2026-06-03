using System;

namespace DeadZoneRun.Systems
{
    public class WaveSystem
    {
        public int BossesDefeated { get; set; } = 0;
        public float BaseZombieSpawnDelay { get; set; } = 1500f; // ms

        public bool IsBossWave(int wave)
        {
            if (wave == 20) return true;
            if (wave == 40) return true;
            if (wave == 50) return true; // Dreadnaught
            if (wave < 40) return false;
            return (wave - 40) % 20 == 0;
        }

        public int GetWaveZombieTotal(int wave)
        {
            int safeWave = Math.Max(1, wave);

            if (safeWave <= 10)
            {
                int progress = safeWave - 1;
                return (int)Math.Floor(5f + progress * 2f + Math.Pow(progress, 1.1));
            }

            if (safeWave <= 25)
            {
                int progress = safeWave - 10;
                return (int)Math.Floor(38f + progress * 3.5f + Math.Pow(progress, 1.15));
            }

            int lateProgress = safeWave - 25;
            return (int)Math.Floor(122f + lateProgress * 5.0f + Math.Pow(lateProgress, 1.45));
        }

        public float GetZombieSpawnDelay(int wave)
        {
            int safeWave = Math.Max(1, wave);

            if (safeWave <= 10)
            {
                return Math.Max(1000f, BaseZombieSpawnDelay - (safeWave - 1) * 50f);
            }

            if (safeWave <= 25)
            {
                return Math.Max(700f, 1020f - (safeWave - 10) * 22f);
            }

            return Math.Max(400f, 690f - (safeWave - 25) * 8f);
        }

        public int GetZombieSpawnBatchSize(int wave)
        {
            if (wave < 9) return 1;
            if (wave < 19) return 2;
            if (wave < 31) return 3;
            return 4;
        }

        public int GetMaxActiveZombies(int wave)
        {
            int safeWave = Math.Max(1, wave);

            if (safeWave <= 20)
            {
                return 10 + (int)Math.Floor(safeWave * 1.2f);
            }

            return Math.Min(60, 34 + (int)Math.Floor((safeWave - 20) * 1.5f));
        }

        public (float healthScale, float speedScale, float damageScale, float scoreScale) GetZombieStatScales(int wave)
        {
            int extraWaves = Math.Max(0, wave - 1);
            int steadyWaves = Math.Min(extraWaves, 14); // Waves 1 to 15 (gentle scaling)
            int lateWaves = Math.Max(0, extraWaves - 14); // Wave 16+ (late-game challenge)

            // Post-boss permanent scaling: +8% health, +6% damage, +2% speed per boss defeated
            float bossHealthBonus = 1f + BossesDefeated * 0.08f;
            float bossDamageBonus = 1f + BossesDefeated * 0.06f;
            float bossSpeedBonus = 1f + BossesDefeated * 0.02f;

            float health = (float)((1f + steadyWaves * 0.03f + lateWaves * 0.05f + Math.Pow(lateWaves, 1.25) * 0.015f) * bossHealthBonus);
            float speed = (float)((1f + steadyWaves * 0.008f + Math.Min(0.45f, lateWaves * 0.008f)) * bossSpeedBonus);
            float damage = (float)((1f + steadyWaves * 0.012f + lateWaves * 0.035f + Math.Pow(lateWaves, 1.1) * 0.003f) * bossDamageBonus);
            float score = 1f + extraWaves * 0.055f;

            return (health, speed, damage, score);
        }
    }
}
