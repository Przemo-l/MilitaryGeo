// ---- IMPORTY ----
import { useEffect, useState, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet"; 

// ---- TYPY ----
type MilitaryType = "barracks" | "naval_base" | "airfield" | "training_area" | "range" | "primary" | "office" | "danger_area" | "shelter" | "bunker";

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
const MILITARY_LABELS: Record<MilitaryType | "all", string> = {
  barracks: "Koszary",
  naval_base: "Baza morska",
  airfield: "Lotnisko wojskowe",
  training_area: "Poligon treningowy",
  range: "Strzelnica",
  primary: "Obiekt główny",
  office: "Biuro",
  danger_area: "Niebezpieczna strefa",
  shelter: "Schronienie",
  bunker: "Bunkier",
  all: "Wszystkie warstwy",
};

// ---- KOMPONENT MilitaryOSMLayer ----
export default function MilitaryOSMLayer() {
  const [militaryType, setMilitaryType] = useState<MilitaryType>("naval_base");
  const [showAllMode, setShowAllMode] = useState(false);

  const [data, setData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- STANY DLA STYLU ----
  const [styleColor, setStyleColor] = useState("#ff0000");
  const [styleWeight, setStyleWeight] = useState(6);
  const [styleOpacity, setStyleOpacity] = useState(1); 

  const layerRef = useRef<L.GeoJSON>(null);
  const map = useMap();

  // ---- FUNKCJA POBIERANIA DANYCH (POJEDYNCZA) ----
  const fetchData = async (type: MilitaryType) => {
    setLoading(true);
    // Nie musimy tu ustawiać setShowAllMode(false), zrobimy to w handlerze przycisku
    setData(null);

    const url = `/data/${type}.json`;

    try {
      const result = await fetch(url);
      if (!result.ok) {
        console.error("Nie znaleziono pliku", url);
        setLoading(false);
        return;
      }
      const geojson = await result.json();
      setData(geojson);
    } catch (error) {
      console.error("File read error", error);
    } finally {
      setLoading(false);
    }
  };

  // ---- FUNKCJA POBIERANIA WSZYSTKICH WARSTW ----
  const fetchAllLayers = async () => {
    setLoading(true);
    setShowAllMode(true);
    setData(null);

    try {
      const promises = MILITARY_TYPES.map((type) =>
        fetch(`/data/${type}.json`).then((res) => {
            if(!res.ok) throw new Error(`Błąd ładowania ${type}`);
            return res.json();
        })
      );

      const results = await Promise.all(promises);
      const allFeatures = results.flatMap((geo) => geo.features);
      
      const combinedData: GeoJSONData = {
        type: "FeatureCollection",
        features: allFeatures,
      };

      setData(combinedData);
    } catch (error) {
      console.error("Błąd podczas ładowania wszystkich warstw", error);
    } finally {
      setLoading(false);
    }
  };

  // ---- NOWY HANDLER ZMIANY TYPU ----
  const handleTypeChange = (type: MilitaryType) => {
    setShowAllMode(false); // Najważniejsza poprawka: wychodzimy z trybu "Wszystkie"
    setMilitaryType(type);
  };

  // ---- POPRAWIONY useEffect ----
  useEffect(() => {
    // Jeśli NIE jesteśmy w trybie "showAll", pobieramy dane dla konkretnego typu
    if (!showAllMode) {
      fetchData(militaryType);
    }
    // Dodano showAllMode do zależności, żeby React zareagował na wyjście z trybu "Wszystkie"
  }, [militaryType, showAllMode]); 

  // Dopasowanie widoku mapy
  useEffect(() => {
    if (!data || !layerRef.current) return;
    const timer = setTimeout(() => {
        try {
            const bounds = layerRef.current?.getBounds();
            if (bounds && bounds.isValid()) {
                map.fitBounds(bounds, { animate: true });
            }
        } catch(e) { console.warn("Błąd fitBounds", e)}
    }, 100);
    return () => clearTimeout(timer);
  }, [data, map]);

  const currentLabel = showAllMode ? MILITARY_LABELS.all : MILITARY_LABELS[militaryType];
  const featureCount = data?.features?.length || 0;

  return (
    <>
      {/* ---- LOADER ---- */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2000,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 0 15px rgba(0,0,0,0.5)",
            fontSize: "18px",
            fontWeight: "bold"
          }}
        >
          Ładowanie: {currentLabel}...
        </div>
      )}

      {/* ---- GÓRNY PASEK PRZYCISKÓW ---- */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          width: "95%",
          pointerEvents: "none", 
        }}
      >
        <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            justifyContent: "center", 
            gap: "5px",
            pointerEvents: "auto",
            background: "rgba(255,255,255,0.7)",
            padding: "5px",
            borderRadius: "8px"
        }}>
            {MILITARY_TYPES.map((type) => (
            <button
                key={type}
                // UŻYWAMY NOWEGO HANDLERA
                onClick={() => handleTypeChange(type)}
                style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #555",
                background: !showAllMode && type === militaryType ? "#c62828" : "#fff",
                color: !showAllMode && type === militaryType ? "#ffffff" : "#000",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
                whiteSpace: "nowrap"
                }}
            >
                {MILITARY_LABELS[type]}
            </button>
            ))}

            <button
                onClick={fetchAllLayers}
                style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "2px solid #000",
                background: showAllMode ? "#000" : "#fff",
                color: showAllMode ? "#fff" : "#000",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "12px",
                whiteSpace: "nowrap"
                }}
            >
                POKAŻ WSZYSTKIE
            </button>
        </div>
      </div>

      {/* ---- LEGENDA (LEWY DOLNY RÓG) ---- */}
      <div
        style={{
            position: "absolute",
            bottom: 30,
            left: 10,
            zIndex: 1000,
            background: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            minWidth: "200px",
            fontFamily: "Arial, sans-serif",
            color: "#000000",
            textAlign: "left"
        }}
      >
        <h3 style={{
            margin: "0 0 10px 0", 
            fontSize: "16px", 
            borderBottom: "1px solid #ccc", 
            paddingBottom: "5px",
            color: "#000000"
        }}>
            Legenda
        </h3>
        <div style={{marginBottom: "5px", color: "#000000"}}>
            <strong>Typ:</strong> {currentLabel}
        </div>
        <div style={{color: "#000000"}}>
            <strong>Liczba obiektów:</strong> {featureCount}
        </div>
      </div>

      {/* ---- PANEL STYLU (PRAWY DOLNY RÓG) ---- */}
      <div
        style={{
            position: "absolute",
            bottom: 30,
            right: 10,
            zIndex: 1000,
            background: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            width: "250px",
            fontFamily: "Arial, sans-serif",
            color: "#000000",
            textAlign: "left"
        }}
      >
        <h3 style={{margin: "0 0 15px 0", fontSize: "16px", color: "#000000"}}>Styl warstwy</h3>
        
        {/* Kolor */}
        <div style={{marginBottom: "10px"}}>
            <label style={{display: "block", marginBottom: "5px", fontSize: "14px", color: "#000000"}}>Kolor:</label>
            <input 
                type="color" 
                value={styleColor} 
                onChange={(e) => setStyleColor(e.target.value)}
                style={{width: "100%", height: "35px", cursor: "pointer", border: "1px solid #ccc", padding: 0}}
            />
        </div>

        {/* Grubość */}
        <div style={{marginBottom: "10px"}}>
            <label style={{display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "14px", color: "#000000"}}>
                <span>Grubość:</span>
                <span>{styleWeight}</span>
            </label>
            <input 
                type="range" 
                min="1" 
                max="20" 
                value={styleWeight} 
                onChange={(e) => setStyleWeight(Number(e.target.value))}
                style={{width: "100%", cursor: "pointer"}}
            />
        </div>

        {/* Przezroczystość */}
        <div style={{marginBottom: "5px"}}>
            <label style={{display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "14px", color: "#000000"}}>
                <span>Przezroczystość:</span>
                <span>{styleOpacity}</span>
            </label>
            <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                value={styleOpacity} 
                onChange={(e) => setStyleOpacity(Number(e.target.value))}
                style={{width: "100%", cursor: "pointer"}}
            />
        </div>
      </div>

      {/* ---- WARSTWA GEOJSON ---- */}
      {data && (
        <GeoJSON
          key={JSON.stringify(data.features[0]?.properties) + styleColor + styleWeight + styleOpacity}
          data={data}
          ref={layerRef}
          style={() => ({
            color: styleColor,
            weight: styleWeight,
            opacity: 1,
            fillColor: styleColor,
            fillOpacity: styleOpacity,
          })}
        />
      )}
    </>
  );
}