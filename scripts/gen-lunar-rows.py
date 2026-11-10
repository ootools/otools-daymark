"""Generate scripts/lunar-rows.txt: compact lunar month-start table, 1900-2100.

Data source: lunardate (lunarInfo table used by Chinese almanac apps), NOT ICU's
Chinese calendar -- ICU miscalculates 2027's 12th lunar month as 30 days while
the official calendar has 29 days (Spring Festival = 2027-02-06).

Usage:
  python scripts/gen-lunar-rows.py

Each row = 2 chars (sexagenary index of the lunar year, base36)
         + N * 4 chars (2-char day-of-year / 1-char lunar month / 1-char leap flag)
Rows are joined by '|' and consumed by gen-calendar-data.mjs.
"""
import calendar
from datetime import date
from pathlib import Path

from lunardate import LunarDate

ROOT = Path(__file__).resolve().parent.parent
YEAR_FROM, YEAR_TO = 1900, 2100
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def b36(n, width):
    out = ["0"] * width
    i = width - 1
    while n > 0 and i >= 0:
        out[i] = DIGITS[n % 36]
        n //= 36
        i -= 1
    return "".join(out)


def main():
    rows = [[] for _ in range(YEAR_TO - YEAR_FROM + 1)]
    unsupported = []
    for y in range(YEAR_FROM, YEAR_TO + 1):
        for m in range(1, 13):
            for d in range(1, calendar.monthrange(y, m)[1] + 1):
                try:
                    lunar = LunarDate.from_solar_date(y, m, d)
                except Exception:
                    unsupported.append("%04d-%02d-%02d" % (y, m, d))
                    continue
                if lunar.day == 1:
                    doy = (date(y, m, d) - date(y, 1, 1)).days
                    rows[y - YEAR_FROM].append((doy, lunar.month, 1 if lunar.is_leap_month else 0))

    lines = []
    for y in range(YEAR_FROM, YEAR_TO + 1):
        segs = sorted(rows[y - YEAR_FROM])
        # 1900-01-01..30 precede the lunarInfo epoch (1900-01-31): fewer segments is expected.
        if len(segs) not in (11, 12, 13):
            raise SystemExit("year %d has %d month starts" % (y, len(segs)))
        ganzhi = (y - 4) % 60
        lines.append(b36(ganzhi, 2) + "".join(
            b36(doy, 2) + b36(month, 1) + str(leap) for doy, month, leap in segs))

    out = ROOT / "scripts" / "lunar-rows.txt"
    out.write_text("|".join(lines), encoding="utf-8")

    # Self-check against official dates (State Council 2027 holiday notice etc.)
    cases = [
        (2026, 2, 17, 1, 1),    # 2026 Spring Festival
        (2026, 11, 10, 10, 2),  # anchor day used by the ganzhi algorithm
        (2027, 2, 6, 1, 1),     # 2027 Spring Festival (2/5 is New Year's Eve)
        (2027, 6, 9, 5, 5),     # Dragon Boat Festival
        (2027, 9, 15, 8, 15),   # Mid-Autumn Festival
    ]
    failed = 0
    for y, m, d, want_m, want_d in cases:
        lunar = LunarDate.from_solar_date(y, m, d)
        ok = lunar.month == want_m and lunar.day == want_d
        print("%s  lunar %04d-%02d-%02d -> %d-%d%s" % (
            "PASS" if ok else "FAIL", y, m, d, lunar.month, lunar.day,
            " (leap)" if lunar.is_leap_month else ""))
        if not ok:
            failed += 1
    print("rows=%d  size=%d bytes  unsupported_days=%d%s" % (
        len(lines), len("|".join(lines)), len(unsupported),
        (" (first: " + unsupported[0] + ")") if unsupported else ""))
    print("wrote", out)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
