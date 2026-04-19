"use client";

// Marquee-style weather ticker that lives above the nav bar. Each item
// is a clickable pill that drops you onto the matching /planets?id=
// detail page. Bodies cycle in the same Stanton-then-Pyro order as the
// catalog. CSS-driven scroll (no JS rAF) so it costs nothing on idle.

import Link from "next/link";
import { BODIES, weatherIcon, weatherTone } from "@/lib/planets";

export function WeatherTicker() {
  // Duplicate the list once so the CSS scroll can loop seamlessly with
  // a translateX(-50%) cycle.
  const cycle = [...BODIES, ...BODIES];
  return (
    <div className="weather-ticker" aria-label="Live weather across Stanton and Pyro">
      <div className="weather-ticker-label">
        <span aria-hidden>📡</span> SYSTEM WEATHER
      </div>
      <div className="weather-ticker-track-mask">
        <div className="weather-ticker-track">
          {cycle.map((b, i) => (
            <Link
              key={`${b.slug}-${i}`}
              href={`/planets?id=${encodeURIComponent(b.slug)}`}
              className="weather-pill"
              style={{
                borderColor: `${weatherTone(b.weather)}55`,
                color: weatherTone(b.weather),
              }}
              aria-label={`${b.name}: ${b.weatherText}`}
            >
              <span className="weather-pill-icon" aria-hidden>
                {weatherIcon(b.weather)}
              </span>
              <span className="weather-pill-name">{b.name}</span>
              <span className="weather-pill-temp">
                {b.tempC.low > 200 || b.tempC.low < -200
                  ? `${b.tempC.low}°`
                  : `${b.tempC.low}° / ${b.tempC.high}°C`}
              </span>
              <span className="weather-pill-desc">· {b.weatherText}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
