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

ELEMENTS = {
  "Mercury": {
    "a": 0.38709927, "da": 0.00000037, "e": 0.20563593, "de": 0.00001906,
    "I": 7.00497902, "dI": -0.00594749, "L": 252.2503235, "dL": 149472.67411175,
    "wbar": 77.45779628, "dwbar": 0.16047689, "Omega": 48.33076593, "dOmega": -0.12534081
  },
  "Venus": {
    "a": 0.72333566, "da": 0.0000039, "e": 0.00677672, "de": -0.00004107,
    "I": 3.39467605, "dI": -0.0007889, "L": 181.9790995, "dL": 58517.81538729,
    "wbar": 131.60246718, "dwbar": 0.00268329, "Omega": 76.67984255, "dOmega": -0.27769418
  },
  "Earth": {
    "a": 1.00000261, "da": 0.00000562, "e": 0.01671123, "de": -0.00004392,
    "I": -0.00001531, "dI": -0.01294668, "L": 100.46457166, "dL": 35999.37244981,
    "wbar": 102.93768193, "dwbar": 0.32327364, "Omega": 0.0, "dOmega": 0.0
  },
  "Mars": {
    "a": 1.52371034, "da": 0.00001847, "e": 0.0933941, "de": 0.00007882,
    "I": 1.84969142, "dI": -0.00813131, "L": -4.55343205, "dL": 19140.30268499,
    "wbar": -23.94362959, "dwbar": 0.44441088, "Omega": 49.55953891, "dOmega": -0.29257343
  },
  "Jupiter": {
    "a": 5.202887, "da": -0.00011607, "e": 0.04838624, "de": -0.00013253,
    "I": 1.30439695, "dI": -0.00183714, "L": 34.39644051, "dL": 3034.74612775,
    "wbar": 14.72847983, "dwbar": 0.21252668, "Omega": 100.47390909, "dOmega": 0.20469106
  },
  "Saturn": {
    "a": 9.53667594, "da": -0.0012506, "e": 0.05386179, "de": -0.00050991,
    "I": 2.48599187, "dI": 0.00193609, "L": 49.95424423, "dL": 1222.49362201,
    "wbar": 92.59887831, "dwbar": -0.41897216, "Omega": 113.66242448, "dOmega": -0.28867794
  },
  "Uranus": {
    "a": 19.18916464, "da": -0.00196176, "e": 0.04725744, "de": -0.00004397,
    "I": 0.77263783, "dI": -0.00180155, "L": 314.05500511, "dL": 429.8640561,
    "wbar": 170.9542763, "dwbar": 0.40805281, "Omega": 74.01692503, "dOmega": 0.05234614
  },
  "Neptune": {
    "a": 30.06992276, "da": 0.00026291, "e": 0.00860619, "de": 0.00002152,
    "I": 1.77004347, "dI": 0.00035372, "L": 304.34866548, "dL": 219.8833092,
    "wbar": 44.96476227, "dwbar": -0.32241464, "Omega": 131.78422574, "dOmega": -0.00508664
  },
  "Pluto": {
    "a": 39.48211675, "da": -0.00031596, "e": 0.2488273, "de": 0.0000517,
    "I": 17.14001206, "dI": 0.00004818, "L": 238.92903833, "dL": 145.20780515,
    "wbar": 224.06876, "dwbar": -0.040629, "Omega": 110.3039368, "dOmega": -0.008099
  }
}

def solveKepler(M, e):
    E = M + e * math.sin(M)
    for _ in range(12):
        dE = (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        E -= dE
        if abs(dE) < 1e-9: break
    return E

def helio(name, T):
    el = ELEMENTS[name]
    a = el["a"] + el["da"] * T
    e = el["e"] + el["de"] * T
    I = el["I"] + el["dI"] * T
    L = normalizeDeg(el["L"] + el["dL"] * T)
    wbar = el["wbar"] + el["dwbar"] * T
    Omega = el["Omega"] + el["dOmega"] * T
    w = wbar - Omega
    M = normalizeDeg(L - wbar)
    if M > 180: M -= 360
    E = solveKepler(M * DEG2RAD, e)
    xp = a * (math.cos(E) - e)
    yp = a * math.sqrt(1 - e*e) * math.sin(E)
    cosw = cosd(w); sinw = sind(w)
    cosO = cosd(Omega); sinO = sind(Omega)
    cosI = cosd(I); sinI = sind(I)
    x = (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp
    y = (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp
    z = sinw * sinI * xp + cosw * sinI * yp
    return x, y, z

jd = 2452565.59931
T = (jd - 2451545.0) / 36525.0
ayanamsa = 23.85709167 + (T * 100.0) * (50.290966 / 3600.0)

ex, ey, ez = helio("Earth", T)

ZODIAC = ["Aries (Mesha)", "Taurus (Vrishabha)", "Gemini (Mithuna)", "Cancer (Kataka)", "Leo (Simha)", "Virgo (Kanya)", "Libra (Thula)", "Scorpio (Vrischika)", "Sagittarius (Dhanu)", "Capricorn (Makara)", "Aquarius (Kumbha)", "Pisces (Meena)"]

def fmt(deg):
    deg = deg % 360
    s_idx = int(deg // 30)
    d = int(deg % 30)
    m = int(((deg % 30) % 1) * 60)
    return f"{d:02d}° {m:02d}' in {ZODIAC[s_idx]}"

print(f"--- SIDEREAL (NIRAYANA / LAHIRI) PLANETARY POSITIONS ---")
for p in ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]:
    px, py, pz = helio(p, T)
    gx = px - ex
    gy = py - ey
    gz = pz - ez
    ecl_lon = normalizeDeg(atan2d(gy, gx))
    sid_lon = normalizeDeg(ecl_lon - ayanamsa)
    print(f"{p:8s}: Tropical {fmt(ecl_lon)}  -->  Sidereal: {fmt(sid_lon)}")
