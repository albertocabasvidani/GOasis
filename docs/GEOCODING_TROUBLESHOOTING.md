# 🗺️ Risoluzione Problemi Geocoding

## Strategie Automatiche Implementate

Il sistema di geocoding usa **5 strategie progressive** per trovare le coordinate dei locali:

### 1. **Query Completa**
```
"Nome Locale, Luogo, Città, Italia"
```

### 2. **Venue + Location**
```
"Nome Locale, Luogo, Friuli-Venezia Giulia, Italia"
```

### 3. **Solo Location**
```
"Luogo, Friuli-Venezia Giulia, Italia"
```

### 4. **Venue Generico**
```
"Nome Locale, Friuli-Venezia Giulia, Italia"
```

### 5. **Ricerca con Termini Alternativi**
```
"bar pub ristorante locale Nome Locale, Luogo, Italia"
```

## Gestione Locale Difficili

### Opzione 1: Coordinate Manuali

**Per locali che falliscono il geocoding automatico:**

1. **Trova coordinate su Google Maps:**
   ```bash
   npm run add-coordinates search "Nome Locale" "Luogo"
   ```
   
   Questo ti darà l'URL Google Maps e le istruzioni.

2. **Aggiungi coordinate manuali:**
   ```bash
   npm run add-coordinates add "Nome Locale" 45.8162 13.3549 "Descrizione"
   ```

### Opzione 2: Alias per Nomi Alternativi

**Modifica `data/manual-coordinates.json`:**

```json
{
  "venue_aliases": {
    "aliases": {
      "All'Invidia": ["Allinvidia", "All Invidia", "All'invidia"],
      "4pr": ["4PR", "Quattro PR", "Quattro P.R."]
    }
  }
}
```

## Esempi Pratici

### Locale Non Trovato Automaticamente

```bash
# 1. Cerca su Google Maps
npm run add-coordinates search "Bisboccia" "Cervignano"

# 2. Vai sull'URL generato, trova il locale, copia coordinate

# 3. Aggiungi coordinate manuali
npm run add-coordinates add "Bisboccia" 45.8162762 13.3549474 "Locale storico di Cervignano"
```

### Locale con Nome Alternativo

Se "All'Invidia" è scritto come "Allinvidia" in Notion:

```json
{
  "venue_aliases": {
    "aliases": {
      "All'Invidia": ["Allinvidia", "All Invidia", "All'invidia"]
    }
  }
}
```

## Priorità di Ricerca

Il sistema cerca coordinate in questo ordine:

1. 🎯 **Coordinate manuali** (`manual-coordinates.json`)
2. 💾 **Cache esistenti** (da run precedenti)
3. 🔄 **Alias** (nomi alternativi)
4. 🌐 **Geocoding automatico** (5 strategie)

## Monitoraggio

### Nei Log del Workflow

```
✓ Geocoded Plan di Paluz: 46.2217, 13.2264 (single_result)
✗ Failed to geocode Locale Sconosciuto - consider adding manual coordinates
```

### File Generati

- `data/past-concerts-map.json` - Concerti con coordinate
- `data/manual-coordinates.json` - Override manuali

## Comandi Utili

```bash
# Visualizza stato coordinate
npm run add-coordinates

# Cerca locale su Google Maps
npm run add-coordinates search "Nome Locale" "Città"

# Aggiungi coordinate manuali
npm run add-coordinates add "Nome" lat lng "Descrizione"

# Rigenera mappa
npm run fetch-map
```

## API Utilizzate

### Nominatim (OpenStreetMap)
- **Gratuita** e open source
- **Rate limit**: 1 richiesta/secondo
- **Copertura**: Ottima per l'Italia
- **Precisione**: Buona per locali pubblici

### Fallback Future (Opzionali)

Per casi estremi, potresti aggiungere:

1. **Google Places API** (a pagamento)
2. **HERE Geocoding API** (freemium)
3. **MapBox Geocoding** (freemium)

Ma per i locali del Friuli-Venezia Giulia, Nominatim + coordinate manuali dovrebbero bastare!

---

**🎯 Obiettivo: 100% dei concerti mappati con coordinate accurate!**