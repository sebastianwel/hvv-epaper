import json
import datetime
import os
import zoneinfo
from urllib.parse import quote
from playwright.sync_api import sync_playwright

STATIONS = {
    "Messehallen (U2)": {
        "station": "Messehallen",
        "stationId": "Master:11909"
    },
    "Feldstraße (U3)": {
        "station": "U Feldstraße",
        "stationId": "Master:11017"
    }
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, "abfahrten.json")

def scrape_station(page, station_label, info):
    print(f"\nLade Abfahrten für: {station_label}...")
    abfahrten = []

    station_encoded = quote(info["station"])
    id_encoded = quote(info["stationId"])
    url = f"https://www.hvv.de/de/fahrplaene/abfahrten?station={station_encoded}&stationId={id_encoded}&Abfahrten="

    try:
        page.goto(url, timeout=30000)

        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        # Exakte Checkboxen über ihre IDs unchecken (falls aktiv)
        try:
            page.locator("#busCheckbox").uncheck(force=True)
            page.locator("#shipCheckbox").uncheck(force=True)
            
            # Auf den "Anzeigen"-Button klicken
            anzeigen_btn = page.locator("button.js-get-departures")
            if anzeigen_btn.count() > 0:
                anzeigen_btn.click()
                # Warten, bis die Tabelle sich aktualisiert hat
                page.wait_for_timeout(2000)
        except Exception as filter_err:
            print(f"Hinweis beim Anpassen der Filter: {filter_err}")

        # Warten, bis die Tabelle geladen ist
        page.wait_for_selector("tbody.js-departure-table-body tr", timeout=15000)

        rows = page.query_selector_all("tbody.js-departure-table-body tr")

        print(f"{'Linie':<8} | {'Richtung':<25} | {'Abfahrt'}")
        print("-" * 52)

        for row in rows:
            cols = row.query_selector_all("td")
            if len(cols) >= 3:
                raw_linie = cols[0].inner_text().replace('\n', ' ').strip()
                richtung = cols[1].inner_text().strip()
                abfahrt = cols[2].inner_text().replace('\n', ' ').strip()

                linie = raw_linie.split()[0] if raw_linie else "U"

                if linie.startswith("U"):
                    print(f"{linie:<8} | {richtung[:24]:<25} | {abfahrt}")
                    
                    abfahrten.append({
                        "linie": linie,
                        "richtung": richtung,
                        "abfahrt": abfahrt
                    })

    except Exception as e:
        print(f"Fehler beim Scrapen von {station_label}: {e}")

    return abfahrten

def main():
    berlin_tz = zoneinfo.ZoneInfo("Europe/Berlin")
    jetzt_berlin = datetime.datetime.now(berlin_tz)

    alle_daten = {
        "stand": jetzt_berlin.strftime("%Y-%m-%d %H:%M:%S"),
        "stationen": {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for label, info in STATIONS.items():
            abfahrten = scrape_station(page, label, info)
            alle_daten["stationen"][label] = abfahrten

        browser.close()

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(alle_daten, f, ensure_ascii=False, indent=2)

    print(f"\n==================================================")
    print(f"Erfolgreich gespeichert unter:\n{JSON_PATH}")

if __name__ == "__main__":
    main()
