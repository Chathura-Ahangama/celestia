import math

DEG2RAD = math.pi / 180.0
RAD2DEG = 180.0 / math.pi

def normalizeDeg(deg):
    d = deg % 360.0
    return d + 360.0 if d < 0 else d

def sind(d): return math.sin(d * DEG2RAD)
def cosd(d): return math.cos(d * DEG2RAD)
def atan2d(y, x): return math.atan2(y, x) * RAD2DEG
def asind(x): return math.asin(x) * RAD2DEG

# 2002-10-18 07:53:00 AM at Kalawana, Sri Lanka (Lat 6.4253, Lon 80.4072, UTC+5.5)
year = 2002; month = 10; day = 18; hour_utc = 2 + 23.0 / 60.0

def julian_date(y, m, d, h_utc):
    if m <= 2: y -= 1; m += 12
    A = math.floor(y / 100); B = 2 - A + math.floor(A / 4)
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h_utc / 24.0

jd = julian_date(year, month, day, hour_utc)
T = (jd - 2451545.0) / 36525.0

# Lahiri Ayanamsa
ayanamsa = 23.85709167 + (T * 100.0) * (50.290966 / 3600.0)

# GMST and LMST
gmst = normalizeDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T**2 - T**3 / 38710000.0)
lat = 6.4253; lon = 80.4072
lmst = normalizeDeg(gmst + lon)
eps = 23.4392911 - 0.0130042 * T

# Ascendant (RAMC = lmst)
y_asc = cosd(lmst)
x_asc = -(sind(lmst) * cosd(eps) + math.tan(lat * DEG2RAD) * sind(eps))
asc_tropical = normalizeDeg(atan2d(y_asc, x_asc))
asc_sidereal = normalizeDeg(asc_tropical - ayanamsa)

SIGNS = [
    ("Aries", "Mesha"), ("Taurus", "Vrishabha"), ("Gemini", "Mithuna"),
    ("Cancer", "Kataka"), ("Leo", "Simha"), ("Virgo", "Kanya"),
    ("Libra", "Thula"), ("Scorpio", "Vrischika"), ("Sagittarius", "Dhanu"),
    ("Capricorn", "Makara"), ("Aquarius", "Kumbha"), ("Pisces", "Meena")
]

def format_sidereal(lon):
    s_idx = int(lon // 30)
    deg_in_sign = lon % 30
    d = int(deg_in_sign)
    m = int((deg_in_sign % 1) * 60)
    return f"{d:02d}° {m:02d}' {SIGNS[s_idx][1]} ({SIGNS[s_idx][0]})"

def get_house(planet_sid_lon, asc_sid_lon):
    # Bhava Madhya calculation: each house spans 30° centered or starting from Lagna
    # In Vedic Equal House / Bhava Madhya: House 1 center = Lagna, or Sign of Lagna = House 1
    # Sign-based house (Rashi House / Whole Sign / Bhava):
    asc_sign = int(asc_sid_lon // 30)
    planet_sign = int(planet_sid_lon // 30)
    house_num = ((planet_sign - asc_sign) % 12) + 1
    return house_num

print(f"Lagna (Ascendant): {format_sidereal(asc_sidereal)} (Sign Index: {int(asc_sidereal // 30)})")
print(f"Lahiri Ayanamsa: {ayanamsa:.4f}°\n")
