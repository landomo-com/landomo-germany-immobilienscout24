/**
 * German Real Estate Data Normalization
 *
 * Specializes the data normalization for German properties from ImmobilienScout24.
 * Handles:
 * - EUR to USD conversion
 * - German property type standardization
 * - German text encoding and umlauts
 * - German-specific fields (Heizungsart, Zustand, etc.)
 * - District/region mapping
 * - Complex feature extraction
 */

import { Property } from '@shared/types';
import { createLogger } from '@shared/logger';

const logger = createLogger('GermanNormalizer');

/**
 * German to English property type mapping
 */
const GERMAN_PROPERTY_TYPES: Record<string, string> = {
  'Wohnung': 'apartment',
  'Apartment': 'apartment',
  'Haus': 'house',
  'House': 'house',
  'Einfamilienhaus': 'house',
  'Mehrfamilienhaus': 'multi-family-house',
  'Doppelhaus': 'duplex',
  'Reihenhaus': 'townhouse',
  'Villa': 'villa',
  'Grundstück': 'land',
  'Grund': 'land',
  'Ladenlokal': 'retail',
  'Büro': 'office',
  'Bürogebäude': 'office-building',
  'Gewerbeimmobilie': 'commercial',
  'Industrie': 'industrial',
  'Gastrobetrieb': 'restaurant',
  'Hotel': 'hotel',
  'Pension': 'guesthouse'
};

/**
 * German heating type translations
 */
const GERMAN_HEATING_TYPES: Record<string, string> = {
  'Zentralheizung': 'central-heating',
  'Etagenheizung': 'apartment-heating',
  'Einzelofen': 'single-stove',
  'Fußbodenheizung': 'floor-heating',
  'Gasheizung': 'gas-heating',
  'Ölheizung': 'oil-heating',
  'Wärmepumpe': 'heat-pump',
  'Fernwärme': 'district-heating',
  'Keine Heizung': 'no-heating'
};

/**
 * German property condition translations
 */
const GERMAN_PROPERTY_CONDITIONS: Record<string, string> = {
  'Saniert': 'renovated',
  'Vollständig renoviert': 'fully-renovated',
  'Gepflegt': 'maintained',
  'Baumängel': 'structural-defects',
  'Modernisiert': 'modernized',
  'Neu': 'new',
  'Rohbau': 'raw-structure',
  'Denkmalschutz': 'listed-building',
  'Abbruchreif': 'demolition-candidate'
};

/**
 * Berlin district names (Bezirke)
 */
const BERLIN_DISTRICTS: Record<string, string> = {
  'Mitte': 'mitte',
  'Friedrichshain-Kreuzberg': 'friedrichshain-kreuzberg',
  'Pankow': 'pankow',
  'Charlottenburg-Wilmersdorf': 'charlottenburg-wilmersdorf',
  'Spandau': 'spandau',
  'Steglitz-Zehlendorf': 'steglitz-zehlendorf',
  'Tempelhof-Schöneberg': 'tempelhof-schoeneberg',
  'Neukölln': 'neukoelln',
  'Treptow-Köpenick': 'treptow-koepenick',
  'Lichtenberg': 'lichtenberg',
  'Marzahn-Hellersdorf': 'marzahn-hellersdorf',
  'Reinickendorf': 'reinickendorf'
};

/**
 * Munich district names (Stadtbezirke)
 */
const MUNICH_DISTRICTS: Record<string, string> = {
  'Altstadt-Lehel': 'altstadt-lehel',
  'Ludwigsvorstadt-Isarvorstadt': 'ludwigsvorstadt-isarvorstadt',
  'Maxvorstadt': 'maxvorstadt',
  'Schwabing-West': 'schwabing-west',
  'Au-Haidhausen': 'au-haidhausen',
  'Sendling': 'sendling',
  'Sendling-Westpark': 'sendling-westpark',
  'Laim': 'laim',
  'Bogenhausen': 'bogenhausen',
  'Berg am Laim': 'berg-am-laim',
  'Trudering-Riem': 'trudering-riem',
  'Feldmoching-Hasenbergl': 'feldmoching-hasenbergl',
  'Richtung': 'riesersee',
  'Allach-Untermenzing': 'allach-untermenzing',
  'Moosach': 'moosach',
  'Milbertshofen-Am Hart': 'milbertshofen-am-hart',
  'Schwabing-Freimann': 'schwabing-freimann',
  'Neuhausen-Nymphenburg': 'neuhausen-nymphenburg',
  'Pasing-Obermenzing': 'pasing-obermenzing',
  'Hadern': 'hadern',
  'Forstenried-Fürstenried-Solln': 'forstenried-furstenried-solln'
};

/**
 * Currency conversion rates (EUR to USD)
 * Updated as of February 2026
 */
const CURRENCY_RATES: Record<string, number> = {
  'EUR': 1.09,
  'USD': 1.0,
  'GBP': 1.27,
  'CHF': 1.12
};

/**
 * Normalize German property for standard output
 */
export function normalizeGermanProperty(property: Property): Property {
  // Normalize property type
  if (property.propertyType && typeof property.propertyType === 'string') {
    const normalized = normalizePropertyType(property.propertyType);
    if (normalized) {
      property.propertyType = normalized as any;
    }
  }

  // Normalize currency and convert to USD if needed
  if (property.currency && property.currency !== 'USD') {
    property = convertCurrencyToUSD(property);
  }

  // Normalize region/district names
  if (property.location?.city === 'Berlin' && property.location?.region) {
    property.location.region = normalizeDistrict(property.location.region, 'Berlin');
  } else if (property.location?.city === 'Munich' && property.location?.region) {
    property.location.region = normalizeDistrict(property.location.region, 'Munich');
  }

  // Normalize features
  if (property.features && Array.isArray(property.features)) {
    property.features = normalizeFeatures(property.features);
  }

  // Normalize German text in description
  if (property.details?.description) {
    property.details.description = normalizeGermanText(property.details.description);
  }

  // Normalize metadata
  if (property.metadata) {
    property.metadata = normalizeMetadata(property.metadata);
  }

  return property;
}

/**
 * Normalize German property type to standard English
 */
export function normalizePropertyType(germanType: string | undefined): string | undefined {
  if (!germanType) return undefined;

  const type = germanType.trim();

  // Direct mapping
  if (GERMAN_PROPERTY_TYPES[type]) {
    return GERMAN_PROPERTY_TYPES[type];
  }

  // Case-insensitive search
  for (const [german, english] of Object.entries(GERMAN_PROPERTY_TYPES)) {
    if (type.toLowerCase().includes(german.toLowerCase())) {
      return english;
    }
  }

  return germanType; // Return original if no match
}

/**
 * Convert EUR prices to USD
 */
export function convertCurrencyToUSD(property: Property): Property {
  if (property.currency && property.price) {
    const rate = CURRENCY_RATES[property.currency] || 1.0;
    const originalPrice = property.price;
    const originalCurrency = property.currency;

    property.price = Math.round(property.price * rate);
    property.currency = 'USD';

    // Store original currency info in metadata
    if (!property.metadata) {
      property.metadata = {};
    }
    property.metadata.originalPrice = originalPrice;
    property.metadata.originalCurrency = originalCurrency;
    property.metadata.conversionRate = rate;
  }

  return property;
}

/**
 * Normalize district/region names
 */
export function normalizeDistrict(district: string, city: string): string {
  const districtMap = city === 'Berlin' ? BERLIN_DISTRICTS :
                      city === 'Munich' ? MUNICH_DISTRICTS : {};

  if (districtMap[district]) {
    return districtMap[district];
  }

  // Case-insensitive search
  for (const [original, normalized] of Object.entries(districtMap)) {
    if (original.toLowerCase() === district.toLowerCase()) {
      return normalized;
    }
  }

  // Return normalized lowercase version
  return normalizeGermanText(district).toLowerCase();
}

/**
 * Normalize feature names and translate German terms
 */
export function normalizeFeatures(features: string[]): string[] {
  return features.map(feature => {
    // Translate German heating types
    if (feature.startsWith('heating-')) {
      const heatingType = feature.replace('heating-', '');
      const translated = GERMAN_HEATING_TYPES[heatingType];
      if (translated) {
        return `heating-${translated}`;
      }
    }

    // Translate German conditions
    if (feature.startsWith('condition-')) {
      const condition = feature.replace('condition-', '');
      const translated = GERMAN_PROPERTY_CONDITIONS[condition];
      if (translated) {
        return `condition-${translated}`;
      }
    }

    return feature;
  }).filter(Boolean);
}

/**
 * Normalize German text (umlauts, special characters)
 */
export function normalizeGermanText(text: string | undefined): string {
  if (!text) return '';

  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE');
}

/**
 * Normalize metadata fields
 */
function normalizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      // Translate German condition if present
      if (key === 'condition' && GERMAN_PROPERTY_CONDITIONS[value]) {
        normalized[key] = GERMAN_PROPERTY_CONDITIONS[value];
      }
      // Translate German heating type if present
      else if (key === 'heatingType' && GERMAN_HEATING_TYPES[value]) {
        normalized[key] = GERMAN_HEATING_TYPES[value];
      }
      // Normalize other text
      else {
        normalized[key] = value;
      }
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Extract German-specific amenities from description
 */
export function extractGermanAmenities(description: string | undefined): string[] {
  if (!description) return [];

  const amenities: string[] = [];
  const lowerDesc = description.toLowerCase();

  // Common German amenities and features
  const germanAmenityPatterns: Record<string, string[]> = {
    'parquet': ['parkett', 'parkettboden'],
    'tiled': ['fliesen', 'geflieste'],
    'carpet': ['teppich', 'teppichbelag'],
    'built-in-kitchen': ['einbaukueche', 'einbauküche', 'komplette kueche'],
    'dishwasher': ['geschirrspueler', 'spuelmaschine'],
    'oven': ['backofen', 'herd'],
    'microwave': ['mikrowelle'],
    'laundry-room': ['waescherei', 'waschecke'],
    'balcony': ['balkon'],
    'terrace': ['terrasse'],
    'patio': ['innenhof'],
    'garden': ['garten'],
    'cellar': ['keller'],
    'attic': ['boden', 'dachboden'],
    'parking': ['parkplatz', 'tiefgarage', 'garage'],
    'video-intercom': ['video-sprechanlage', 'sprechanlage'],
    'security-system': ['sicherheitsanlage', 'alarmsystem'],
    'wheelchair-accessible': ['barrierefrei', 'behindertengerecht'],
    'guest-toilet': ['gaeste-wc', 'gaestewc'],
    'sauna': ['sauna'],
    'gym': ['fitnessraum', 'sportbereich']
  };

  for (const [amenity, patterns] of Object.entries(germanAmenityPatterns)) {
    for (const pattern of patterns) {
      if (lowerDesc.includes(pattern)) {
        amenities.push(amenity);
        break;
      }
    }
  }

  return amenities;
}

/**
 * Calculate property age from construction year
 */
export function calculatePropertyAge(constructionYear: number | undefined): number | undefined {
  if (!constructionYear) return undefined;
  const currentYear = new Date().getFullYear();
  return currentYear - constructionYear;
}

/**
 * Classify property condition from German text
 */
export function classifyCondition(conditionText: string | undefined): string | undefined {
  if (!conditionText) return undefined;

  const lower = conditionText.toLowerCase();

  // Perfect condition
  if (lower.includes('neubau') || lower.includes('neuwertig') || lower.includes('praktisch neu')) {
    return 'excellent';
  }

  // Well-maintained
  if (lower.includes('sehr gut') || lower.includes('ausgezeichnet') || lower.includes('optimal')) {
    return 'excellent';
  }

  // Good condition
  if (lower.includes('gut') || lower.includes('gepflegt') || lower.includes('modernisiert')) {
    return 'good';
  }

  // Fair/Average condition
  if (lower.includes('durchschnitt') || lower.includes('normal') || lower.includes('akzeptabel')) {
    return 'fair';
  }

  // Needs renovation
  if (lower.includes('saniert') || lower.includes('renoviert')) {
    return 'renovated';
  }

  // Poor condition
  if (lower.includes('baumangel') || lower.includes('mangelhaft') || lower.includes('abbruchreif')) {
    return 'poor';
  }

  return GERMAN_PROPERTY_CONDITIONS[conditionText] || conditionText;
}

/**
 * Extract price per square meter
 */
export function calculatePricePerSqm(price: number | undefined, sqm: number | undefined): number | undefined {
  if (!price || !sqm || sqm === 0) return undefined;
  return Math.round(price / sqm);
}

/**
 * Batch normalize properties
 */
export function normalizeGermanProperties(properties: Property[]): Property[] {
  return properties.map(prop => normalizeGermanProperty(prop));
}

export default {
  normalizeGermanProperty,
  normalizePropertyType,
  convertCurrencyToUSD,
  normalizeDistrict,
  normalizeFeatures,
  normalizeGermanText,
  extractGermanAmenities,
  calculatePropertyAge,
  classifyCondition,
  calculatePricePerSqm,
  normalizeGermanProperties
};
