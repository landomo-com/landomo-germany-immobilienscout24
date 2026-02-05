/**
 * Transform ImmobilienScout24 data to StandardProperty format
 */

import { Property } from './shared-types';

/**
 * StandardProperty interface (from @landomo/core)
 * This defines the standardized format for all Landomo properties
 */
export interface StandardProperty {
  title: string;
  price: number;
  currency: string;
  property_type: string;
  transaction_type: 'sale' | 'rent';
  source_url: string;

  location: {
    address?: string;
    city: string;
    region?: string;
    country: string;
    postal_code?: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };

  details: {
    bedrooms?: number;
    bathrooms?: number;
    sqm?: number;
    rooms?: number;
    floor?: number;
  };

  features: string[];

  amenities?: {
    has_parking?: boolean;
    has_balcony?: boolean;
    has_garden?: boolean;
    has_elevator?: boolean;
    has_cellar?: boolean;
    has_built_in_kitchen?: boolean;
  };

  images: string[];
  description?: string;
  description_language?: string;

  agent?: {
    name: string;
    phone?: string;
    agency?: string;
    email?: string;
  };

  country_specific: Record<string, any>;
}

/**
 * Transform Property to StandardProperty format
 */
export function transformToStandard(raw: Property): StandardProperty {
  // Normalize property type
  const property_type = normalizePropertyType(raw.propertyType);

  // Normalize transaction type
  const transaction_type = normalizeTransactionType(raw.transactionType);

  return {
    title: raw.title,
    price: raw.price,
    currency: raw.currency,
    property_type,
    transaction_type,
    source_url: raw.url,

    location: {
      address: raw.location.address,
      city: raw.location.city,
      region: raw.location.region,
      country: 'Germany',
      postal_code: raw.location.postcode,
      coordinates: raw.location.coordinates ? {
        lat: raw.location.coordinates.lat,
        lon: raw.location.coordinates.lon
      } : undefined
    },

    details: {
      bedrooms: raw.details?.bedrooms,
      bathrooms: raw.details?.bathrooms,
      sqm: raw.details?.sqm,
      rooms: raw.details?.rooms,
      floor: raw.details?.floor
    },

    features: standardizeFeatures(raw.features),

    amenities: extractAmenities(raw.features),

    images: raw.images || [],
    description: raw.description,
    description_language: 'de',

    agent: raw.agent ? {
      name: raw.agent.name || 'Agent',
      phone: raw.agent.phone,
      agency: raw.agent.agency,
      email: raw.agent.email
    } : undefined,

    // Germany-specific fields
    country_specific: buildCountrySpecific(raw)
  };
}

/**
 * Normalize property type to standard values
 */
function normalizePropertyType(type: string): string {
  const normalized = type.toLowerCase();

  const typeMap: Record<string, string> = {
    'apartment': 'apartment',
    'wohnung': 'apartment',
    'house': 'house',
    'haus': 'house',
    'land': 'land',
    'grund': 'land',
    'grundstück': 'land',
    'office': 'office',
    'büro': 'office',
    'buero': 'office',
    'retail': 'retail',
    'laden': 'retail',
    'commercial': 'commercial',
    'gewerbe': 'commercial',
    'restaurant': 'restaurant',
    'gastro': 'restaurant'
  };

  return typeMap[normalized] || 'property';
}

/**
 * Normalize transaction type
 */
function normalizeTransactionType(type: string): 'sale' | 'rent' {
  const normalized = type.toLowerCase();
  if (normalized.includes('rent') || normalized.includes('miete')) {
    return 'rent';
  }
  return 'sale';
}

/**
 * Standardize feature names
 */
function standardizeFeatures(features: string[]): string[] {
  if (!features || features.length === 0) return [];

  const featureMap: Record<string, string> = {
    'balcony': 'balcony',
    'balkon': 'balcony',
    'garden': 'garden',
    'garten': 'garden',
    'cellar': 'cellar',
    'keller': 'cellar',
    'elevator': 'elevator',
    'lift': 'elevator',
    'aufzug': 'elevator',
    'fahrstuhl': 'elevator',
    'built-in-kitchen': 'built_in_kitchen',
    'einbauküche': 'built_in_kitchen',
    'einbaukueche': 'built_in_kitchen',
    'guest-toilet': 'guest_toilet',
    'gäste-wc': 'guest_toilet',
    'gaeste-wc': 'guest_toilet',
    'wheelchair-accessible': 'wheelchair_accessible',
    'barrierefrei': 'wheelchair_accessible',
    'pets-allowed': 'pets_allowed',
    'haustiere-erlaubt': 'pets_allowed',
    'virtual-tour': 'virtual_tour',
    'new-build': 'new_build',
    'neubau': 'new_build'
  };

  return features.map(f => {
    const normalized = f.toLowerCase().trim();

    // Check if it's in the feature map
    for (const [key, value] of Object.entries(featureMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // Return normalized version
    return normalized.replace(/\s+/g, '_').replace(/[äöüß]/g, (char) => {
      const map: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return map[char] || char;
    });
  });
}

/**
 * Extract amenities from features
 */
function extractAmenities(features: string[]): {
  has_parking?: boolean;
  has_balcony?: boolean;
  has_garden?: boolean;
  has_elevator?: boolean;
  has_cellar?: boolean;
  has_built_in_kitchen?: boolean;
} {
  if (!features || features.length === 0) {
    return {};
  }

  const featuresLower = features.map(f => f.toLowerCase());

  return {
    has_parking: featuresLower.some(f =>
      f.includes('parking') ||
      f.includes('garage') ||
      f.includes('stellplatz') ||
      f.includes('parkplatz')
    ),
    has_balcony: featuresLower.some(f =>
      f.includes('balcony') ||
      f.includes('balkon')
    ),
    has_garden: featuresLower.some(f =>
      f.includes('garden') ||
      f.includes('garten')
    ),
    has_elevator: featuresLower.some(f =>
      f.includes('elevator') ||
      f.includes('lift') ||
      f.includes('aufzug') ||
      f.includes('fahrstuhl')
    ),
    has_cellar: featuresLower.some(f =>
      f.includes('cellar') ||
      f.includes('keller')
    ),
    has_built_in_kitchen: featuresLower.some(f =>
      f.includes('built-in-kitchen') ||
      f.includes('einbauküche') ||
      f.includes('einbaukueche')
    )
  };
}

/**
 * Build Germany-specific fields
 */
function buildCountrySpecific(raw: Property): Record<string, any> {
  const specific: Record<string, any> = {};

  // Extract energy efficiency class
  const energyFeature = raw.features.find((f: string) => f.toLowerCase().includes('energy-class'));
  if (energyFeature) {
    const match = energyFeature.match(/energy-class-([a-h]\+?)/i);
    if (match) {
      specific.energieausweis = match[1].toUpperCase();
    }
  }

  // Extract heating type
  const heatingFeature = raw.features.find((f: string) => f.toLowerCase().includes('heating-'));
  if (heatingFeature) {
    const heatingType = heatingFeature.replace(/^heating-/i, '');
    specific.heizungsart = heatingType;
  }

  // Extract condition
  const conditionFeature = raw.features.find((f: string) => f.toLowerCase().includes('condition-'));
  if (conditionFeature) {
    const condition = conditionFeature.replace(/^condition-/i, '');
    specific.zustand = condition;
  }

  // Construction year (Baujahr)
  if (raw.details?.constructionYear) {
    specific.baujahr = raw.details.constructionYear;
  }

  // Floor (Etage)
  if (raw.details?.floor !== undefined) {
    specific.etage = raw.details.floor;
  }

  // Total floors
  if (raw.details?.totalFloors) {
    specific.anzahl_etagen = raw.details.totalFloors;
  }

  // Available from date
  if (raw.details?.availableFrom) {
    specific.verfuegbar_ab = raw.details.availableFrom;
  }

  // Extract parking type from features
  const parkingFeature = raw.features.find((f: string) => f.toLowerCase().includes('parking-'));
  if (parkingFeature) {
    const parkingType = parkingFeature.replace(/^parking-/i, '');
    specific.stellplatz_typ = parkingType;
  }

  // Postcode (PLZ)
  if (raw.location.postcode) {
    specific.plz = raw.location.postcode;
  }

  // District/Quarter (Stadtteil)
  if (raw.location.region) {
    specific.stadtteil = raw.location.region;
  }

  // Agent is private or agency
  if (raw.agent?.isPrivate !== undefined) {
    specific.privater_anbieter = raw.agent.isPrivate;
  }

  return specific;
}

/**
 * Parse price from string (utility function)
 */
export function parsePrice(priceStr: string): number {
  const cleaned = priceStr
    .replace(/[^\d.,]/g, '')  // Remove non-numeric chars except . and ,
    .replace(/\./g, '')        // Remove thousand separators (German format)
    .replace(',', '.');        // Convert decimal comma to point

  return parseFloat(cleaned) || 0;
}

/**
 * Get currency for country
 */
export function getCurrency(country: string): string {
  const currencyMap: Record<string, string> = {
    'germany': 'EUR',
    'austria': 'EUR',
    'switzerland': 'CHF'
  };

  return currencyMap[country.toLowerCase()] || 'EUR';
}
