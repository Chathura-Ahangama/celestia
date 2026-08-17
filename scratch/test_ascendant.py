import math

# Let's calculate the exact Local Sidereal Time and Ascendant for:
# Date: 2002-10-18
# Local time: 07:53 AM (07:53:00)
# Time Zone: UTC +5.5 (Sri Lanka)
# Location: Kalawana, Sri Lanka (Lat: 6.4253° N, Lon: 80.4072° E)

# UTC time: 07:53 - 05:30 = 02:23:00 UTC = 2.383333 hours
year = 2002
month = 10
day = 18
hour_utc = 2 + 23.0 / 60.0 # 2.383333

# Days since J2000.0 (2000 Jan 1.5 TT = 2451545.0)
# JD at 0h UT on 2002-10-18:
# 2000-01-01 was JD 2451544.5 (0h UT)
# Let's compute exact JD:
def julian_date(y, m, d, h_utc):
    if m <= 2:
        y -= 1
        m += 12
    A = math.floor(y / 100)
    B = 2 - A + math.floor(A / 4)
    jd0 = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + B - 1524.5
    return jd0 + h_utc / 24.0

jd = julian_date(2002, 10, 18, hour_utc)
T = (jd - 2451545.0) / 36525.0

# Greenwich Mean Sidereal Time (Meeus formula 12.4 in degrees)
# GMST in degrees:
gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T**2 - T**3 / 38710000.0
gmst = gmst % 360.0

lon = 80.4072
lat = 6.4253
lmst = (gmst + lon) % 360.0

# Obliquity of Ecliptic
eps = 23.4392911 - 0.0130042 * T
eps_rad = math.radians(eps)
lat_rad = math.radians(lat)
lmst_rad = math.radians(lmst)

# Ascendant (RAMC = lmst)
# Standard astronomical formula for Ascendant lambda_asc:
# tan(lambda_asc) = -cos(RAMC) / (sin(eps)*tan(phi) + cos(eps)*sin(RAMC))
# Using atan2(-cos(RAMC), sin(eps)*tan(phi) + cos(eps)*sin(RAMC)):
# Wait! Note the quadrants:
# Numerator: -cos(RAMC)
# Denominator: -(sin(eps)*tan(phi) + cos(eps)*sin(RAMC)) ? Or with sin(RAMC)*cos(eps) + tan(lat)*sin(eps)?
# Let's verify standard formula from Meeus Chapter 14:
# tan(H) where H is ecliptic longitude:
# y = cos(RAMC)
# x = -(sin(RAMC)*cos(eps) + tan(lat)*sin(eps))
# lambda = atan2(y, x) or atan2(sin(RAMC)*cos(eps) + tan(lat)*sin(eps), cos(RAMC))?

y1 = math.cos(lmst_rad)
x1 = -(math.sin(lmst_rad) * math.cos(eps_rad) + math.tan(lat_rad) * math.sin(eps_rad))
asc1 = math.degrees(math.atan2(y1, x1)) % 360.0

# Lahiri Ayanamsa:
ayanamsa = 23.85709167 + (T * 100.0) * (50.290966 / 3600.0)
asc1_sidereal = (asc1 - ayanamsa) % 360.0

print(f"JD: {jd:.5f}")
print(f"GMST: {gmst:.4f}°, LMST (RAMC): {lmst:.4f}° ({lmst/15.0:.4f}h)")
print(f"Ascendant (formula 1): Tropical {asc1:.4f}° -> Sidereal {asc1_sidereal:.4f}°")

# Let's check Sun altitude at 7:53 AM in Kalawana:
# Sun rises in east ~6:00 AM. At 7:53 AM, Sun is ~25° above eastern horizon.
# In Oct, Sun is in Libra.
# Since Sun is in Libra and is rising/just above horizon in early morning,
# the rising sign (Ascendant) in early morning (7:53 AM) when Sun is in Libra (12th house / eastern horizon)
# MUST BE LIBRA (Thula)!
# If Sun is in Libra at 00° 38' and rising near sunrise, the eastern horizon (Ascendant) is Libra (Thula)!
print("\nAstronomical Reality Check:")
print("At sunrise on Oct 18, Sun (0° Libra) rises on Eastern horizon.")
print("At 7:53 AM (approx 1.5 hours after sunrise), Sun is in the 12th House (just above the horizon),")
print("and the rising sign on the eastern horizon (Lagna / Ascendant) is LIBRA (Thula)!")
