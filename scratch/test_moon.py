import math

# Let's test the calculations in app/lib/planets.ts vs exact Lahiri Nirayana values
# Let's write a python test that calculates all planets using standard ephemeris at JD 2452565.59931

T = (2452565.59931 - 2451545.0) / 36525.0
ayanamsa = 23.85709167 + (T * 100.0) * (50.290966 / 3600.0)

# Meeus Moon position
L_prime = 218.3164477 + 481267.88123421 * T - 0.0015786 * T**2 + T**3 / 538841.0
D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T**2 + T**3 / 545868.0
M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T**2 + T**3 / 24490000.0
M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T**2 + T**3 / 69699.0
F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T**2 - T**3 / 3526000.0

D_r = math.radians(D % 360)
M_r = math.radians(M % 360)
Mp_r = math.radians(M_prime % 360)
F_r = math.radians(F % 360)

moon_lon = L_prime + (
    6.288774 * math.sin(Mp_r) +
    1.274027 * math.sin(2*D_r - Mp_r) +
    0.658314 * math.sin(2*D_r) +
    0.213618 * math.sin(2*Mp_r) -
    0.185116 * math.sin(M_r) -
    0.114332 * math.sin(2*F_r) +
    0.058793 * math.sin(2*D_r - 2*Mp_r) +
    0.057066 * math.sin(2*D_r - M_r - Mp_r) +
    0.053322 * math.sin(2*D_r + Mp_r) +
    0.045758 * math.sin(2*D_r - M_r) -
    0.040923 * math.sin(M_r - Mp_r) -
    0.034720 * math.sin(D_r) -
    0.030383 * math.sin(M_r + Mp_r) +
    0.015327 * math.sin(2*D_r - 2*F_r) -
    0.012528 * math.sin(2*F_r + Mp_r)
)
moon_sidereal = (moon_lon - ayanamsa) % 360

ZODIAC = ["Aries (Mesha)", "Taurus (Vrishabha)", "Gemini (Mithuna)", "Cancer (Kataka)", "Leo (Simha)", "Virgo (Kanya)", "Libra (Thula)", "Scorpio (Vrischika)", "Sagittarius (Dhanu)", "Capricorn (Makara)", "Aquarius (Kumbha)", "Pisces (Meena)"]

def fmt(deg):
    deg = deg % 360
    s_idx = int(deg // 30)
    d = int(deg % 30)
    m = int(((deg % 30) % 1) * 60)
    return f"{d:02d}° {m:02d}' in {ZODIAC[s_idx]}"

print("Moon Sidereal:", fmt(moon_sidereal))
print("User Moon target: 25° 46' in Aquarius (Kumbha)")
