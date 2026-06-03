using System.Collections.Generic;
using DeadZoneRun.Weapons.Variants;

namespace DeadZoneRun.Weapons
{
    public static class WeaponRegistry
    {
        private static readonly Dictionary<string, Weapon> Weapons = new Dictionary<string, Weapon>();

        static WeaponRegistry()
        {
            Register(new Pistol());
            Register(new Shotgun());
            Register(new PlasmaSMG());
            Register(new BoomerangDisc());
            Register(new PulseCannon());
            Register(new ChargeRifle());
        }

        private static void Register(Weapon weapon)
        {
            Weapons[weapon.Id] = weapon;
        }

        public static Weapon Get(string id)
        {
            if (Weapons.TryGetValue(id, out var weapon))
            {
                return weapon;
            }
            return Weapons["pistol"]; // Fallback to default
        }

        public static IEnumerable<Weapon> GetAll()
        {
            return Weapons.Values;
        }
    }
}
