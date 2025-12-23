// ---- IMPORTY ----
// Dokumentacja React hooków: https://react.dev/reference/react
import { useEffect, useState, useRef } from "react";

// Dokumentacja react-leaflet: https://react-leaflet.js.org/docs/start-introduction
import { GeoJSON, useMap } from "react-leaflet";

// Dokumentacja Axios: https://axios-http.com/docs/intro
import axios from "axios";

// Dokumentacja osmtogeojson: https://github.com/tyrasd/osmtogeojson
import osmtogeojson from "osmtogeojson";

// ---- TYPY ----
type MilitaryType = "barracks" | "naval_base" | "airfield" | "training_area" | "range" | "primary" | "office" | "danger_area" | "shelter" | "bunker";

// Typ danych GeoJSON
type GeoJSONData = GeoJSON.FeatureCollection;

// ---- LISTA TYPÓW ----
const MILITARY_TYPES: MilitaryType[] = [
  "barracks",
  "naval_base",
  "airfield",
  "training_area",
  "range",
  "primary",
  "office",
  "danger_area",
  "shelter",
  "bunker",
];

// ---- ETYKIETY ----
// Dodałem typowanie <MilitaryType, string> dla lepszej kontroli błędów
const MILITARY_LABELS: Record<MilitaryType, string> = {
  barracks: "Koszary",
  naval_base: "Baza morska",
  airfield: "Lotnisko wojskowe",
  training_area: "Poligon treningowy",
  range: "Strzelnica",
  primary: "Obekt główny",
  office: "Biuro",
  danger_area: "Niebeezpieczna strefa",
  shelter: "Schronienie",
  bunker: "Bunkier",
};

// ---- KOMPONENT MilitaryOSMLayer ----
export default function MilitaryOSMLayer() {
  const [militaryType, setMilitaryType] = useState<MilitaryType>("naval_base");

  // TODO: Dodaj typowanie dla danych (GeoJSONData | null)
  const [data, setData] = useState<GeoJSONData | null>(null);

  // TODO: Dodaj obsługę błędów w UI (np. komunikat "Nie udało się pobrać danych")
  const [loading, setLoading] = useState(false);

  // TODO: Sprawdź w dokumentacji Leaflet co można zrobić z ref: https://leafletjs.com/reference.html#geojson
  const layerRef = useRef<any>(null); // Dodałem <any> tymczasowo, najlepiej użyć właściwego typu z Leaflet
  const map = useMap();

  // ---- FUNKCJA POBIERANIA DANYCH ----
  const fetchData = async (type: MilitaryType) => {
    setLoading(true);
    setData(null);

    const query = `
      [out:json][timeout:60];
      area["ISO3166-1"="DE"]->.a;
      (
        way["military"="${type}"](area.a);
        relation["military"="${type}"](area.a);
      );
      out geom;
    `;

    const requestUrl =
      "https://overpass.kumi.systems/api/interpreter?data=" +
      encodeURIComponent(query);

    try {
      // const res = ... TODO Wykorzystaj axios w celu obsługi requestUrl
      const res = await axios.get(requestUrl);

      // TODO: Zbadaj strukturę danych res.data w konsoli
      console.log(res.data);

      // const geojson = ... Wykorzystaj bibliotekę osmtogeojson
      const geojson = osmtogeojson(res.data);

      // TODO setData(geojson);
      setData(geojson as GeoJSONData);
    } catch (e) {
      console.error("Błąd Overpass:", e);
      // TODO: Dodaj setData(null) i komunikat błędu w UI
    } finally {
      setLoading(false);
    }
  };

  // ---- useEffect: pobieranie danych ----
  useEffect(() => {
    fetchData(militaryType);
  }, [militaryType]);

  // ---- useEffect: dopasowanie widoku mapy ----
  useEffect(() => {
    if (!data || !layerRef.current) return;
    
    // @ts-ignore - czasami typy Leaflet mogą grymasić przy getBounds
    const bounds = layerRef.current.getBounds();
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { animate: true });
    }
  }, [data, map]);

  // ---- RENDER ----
  return (
    <>
      {/* ---- LOADER ---- */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            background: "black",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0 0 5px rgba(0,0,0,0.3)",
          }}
        >
          Ładowanie: {MILITARY_LABELS[militaryType]}
        </div>
      )}

      {/* ---- PRZYCISKI ---- */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 10,
          zIndex: 1000,
          background: "gray",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 0 5px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <strong>Typ obiektu wojskowego:</strong>
        
        {MILITARY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setMilitaryType(type)}
            title={`Kliknij, aby pokazać: ${MILITARY_LABELS[type]}`}
            style={{
              margin: "4px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #555",
              background: type === militaryType ? "#c62828" : "#eee",
              color: type === militaryType ? "#ffffffff" : "#000",
              cursor: "pointer",
            }}
          >
            {MILITARY_LABELS[type] || type}
          </button>
        ))}
      </div>

      {/* ---- WARSTWA GEOJSON ---- */}
      {data && (
        <GeoJSON
          data={data}
          ref={layerRef}
          style={() => ({
            color: "#ff0000ff",
            weight: 6,
            opacity: 1,
            fillColor: "#ff0000",
            fillOpacity: 0.45,
          })}
        />
      )}
    </>
  );
}