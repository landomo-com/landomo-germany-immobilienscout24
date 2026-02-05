import { Property } from '@shared/types';

/**
 * Extended location interface with postcode support
 */
interface ExtendedLocation {
  address?: string;
  city: string;
  region?: string;
  postcode?: string;
  country: string;
  coordinates?: { lat: number; lon: number };
}

/**
 * Extended details interface with additional fields from API
 */
interface ExtendedDetails {
  sqm?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  constructionYear?: number;
  availableFrom?: string;
}

/**
 * Mobile API response types for ImmobilienScout24
 * Based on actual API response structure
 */

// New mobile API search response format
export interface MobileSearchResponse {
  totalResults?: number;
  pageSize?: number;
  pageNumber?: number;
  numberOfPages?: number;
  numberOfListings?: number;
  resultListItems?: ResultListItem[];
  // Legacy format support
  resultlist?: LegacyResultList;
  searchResponseModel?: {
    resultlist?: LegacyResultList;
  };
}

export interface ResultListItem {
  type?: string;  // 'EXPOSE_RESULT'
  item?: ResultItem;
}

export interface ResultItem {
  id?: string;
  title?: string;
  reportUrl?: string;
  pictures?: Array<{
    urlScaleAndCrop?: string;
  }>;
  titlePicture?: {
    preview?: string;
    full?: string;
  };
  address?: {
    line?: string;
    lat?: number;
    lon?: number;
    postcode?: string;
    city?: string;
    quarter?: string;
  };
  isProject?: boolean;
  isPrivate?: boolean;
  listingType?: string;
  published?: string;
  isNewObject?: boolean;
  liveVideoTourAvailable?: boolean;
  attributes?: Array<{
    label?: string;
    value?: string;
  }>;
  realEstateType?: string;  // 'apartmentbuy', 'apartmentrent', 'housebuy', 'houserent'
  energyEfficiencyClass?: string;
  realtor?: {
    logoUrlScale?: string;
    showcasePlacementColor?: string;
    companyName?: string;
    name?: string;
    phoneNumber?: string;
  };
  tags?: string[];
  // Additional fields that may be present
  balcony?: boolean;
  garden?: boolean;
  cellar?: boolean;
  lift?: boolean;
  builtInKitchen?: boolean;
  parkingSpaceType?: string;
  numberOfRooms?: number;
  livingSpace?: number;
  numberOfBedRooms?: number;
  numberOfBathRooms?: number;
  floor?: number;
  description?: string;
  condition?: string;
  heatingType?: string;
  constructionYear?: number;
  freeFrom?: string;
}

// Legacy response format (for backwards compatibility)
interface LegacyResultList {
  resultlistEntries?: Array<{
    '@numberOfHits'?: string;
    resultlistEntry?: LegacyListingEntry[];
  }>;
  paging?: {
    current?: number;
    pageSize?: number;
    numberOfPages?: number;
    numberOfHits?: number;
  };
}

interface LegacyListingEntry {
  '@id'?: string;
  '@publishDate'?: string;
  '@modification'?: string;
  realEstate?: LegacyRealEstate;
}

interface LegacyRealEstate {
  '@id'?: string;
  '@xsi.type'?: string;
  title?: string;
  descriptionNote?: string;
  description?: string;
  furnishingNote?: string;
  locationNote?: string;
  otherNote?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    postcode?: string;
    city?: string;
    quarter?: string;
    wgs84Coordinate?: {
      latitude?: number;
      longitude?: number;
    };
  };
  price?: {
    value?: number;
    currency?: string;
    marketingType?: string;
  };
  calculatedTotalRent?: {
    totalRent?: {
      value?: number;
    };
  };
  livingSpace?: number;
  numberOfRooms?: number;
  numberOfBedRooms?: number;
  numberOfBathRooms?: number;
  floor?: number;
  numberOfFloors?: number;
  balcony?: boolean;
  garden?: boolean;
  cellar?: boolean;
  lift?: boolean;
  builtInKitchen?: boolean;
  parkingSpaceType?: string;
  guestToilet?: boolean;
  handicappedAccessible?: boolean;
  petsAllowed?: string;
  energyEfficiencyClass?: string;
  condition?: string;
  heatingType?: string;
  constructionYear?: number;
  freeFrom?: string;
  titlePicture?: {
    '@href'?: string;
  };
  galleryAttachments?: {
    attachment?: Array<{
      '@href'?: string;
    }>;
  };
  commercializationType?: string;
  realtorCompanyName?: string;
  contactDetails?: {
    firstname?: string;
    lastname?: string;
    company?: string;
    phoneNumber?: string;
    cellPhoneNumber?: string;
    email?: string;
  };
}

// Expose (detail) response types
export interface MobileExposeResponse {
  expose?: {
    realEstate?: LegacyRealEstate;
    contactFormType?: string;
    isFullyQualified?: boolean;
  };
}

/**
 * Parse property type from real estate type string
 */
function parsePropertyTypeFromString(realEstateType?: string): string {
  if (!realEstateType) return 'property';

  const type = realEstateType.toLowerCase();
  if (type.includes('apartment') || type.includes('wohnung')) return 'apartment';
  if (type.includes('house') || type.includes('haus')) return 'house';
  if (type.includes('land') || type.includes('grund')) return 'land';
  if (type.includes('office') || type.includes('buero')) return 'office';
  if (type.includes('retail') || type.includes('laden')) return 'retail';
  if (type.includes('gastro')) return 'restaurant';
  if (type.includes('industrial') || type.includes('gewerbe')) return 'commercial';

  return 'property';
}

/**
 * Parse transaction type from real estate type string
 */
function parseTransactionTypeFromString(realEstateType?: string): 'sale' | 'rent' {
  if (!realEstateType) return 'sale';

  const type = realEstateType.toLowerCase();
  if (type.includes('rent') || type.includes('miete')) return 'rent';
  return 'sale';
}

/**
 * Parse price from attributes array
 * Attributes format: [{label: "", value: "227.144 \u20ac"}, {label: "", value: "34,26 m\u00b2"}, ...]
 */
function parsePriceFromAttributes(attributes?: Array<{ label?: string; value?: string }>): { price: number; currency: string } {
  if (!attributes || attributes.length === 0) {
    return { price: 0, currency: 'EUR' };
  }

  // First attribute is typically the price
  const priceAttr = attributes[0]?.value || '';

  // Remove currency symbol and parse
  const cleanPrice = priceAttr
    .replace(/[^\d.,]/g, '')  // Remove non-numeric chars except . and ,
    .replace(/\./g, '')        // Remove thousand separators (German format: 1.000.000)
    .replace(',', '.');        // Convert decimal comma to point

  const price = parseFloat(cleanPrice) || 0;

  // Detect currency
  let currency = 'EUR';
  if (priceAttr.includes('CHF')) currency = 'CHF';
  else if (priceAttr.includes('$')) currency = 'USD';

  return { price, currency };
}

/**
 * Parse living space from attributes array
 */
function parseLivingSpaceFromAttributes(attributes?: Array<{ label?: string; value?: string }>): number | undefined {
  if (!attributes || attributes.length < 2) return undefined;

  // Second attribute is typically the living space
  const sqmAttr = attributes[1]?.value || '';

  if (sqmAttr.includes('m')) {
    const cleanSqm = sqmAttr
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    return parseFloat(cleanSqm) || undefined;
  }

  return undefined;
}

/**
 * Parse rooms from attributes array
 */
function parseRoomsFromAttributes(attributes?: Array<{ label?: string; value?: string }>): number | undefined {
  if (!attributes || attributes.length < 3) return undefined;

  // Third attribute is typically the rooms
  const roomsAttr = attributes[2]?.value || '';

  if (roomsAttr.includes('Zi')) {
    const cleanRooms = roomsAttr
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    return parseFloat(cleanRooms) || undefined;
  }

  return undefined;
}

/**
 * Parse city and district from address line
 * Format: "Neuenhagener Str. 48, 12623 Berlin, Mahlsdorf (Hellersdorf)"
 */
function parseAddressLine(addressLine?: string): { address?: string; city: string; region?: string } {
  if (!addressLine) {
    return { city: 'Unknown' };
  }

  const parts = addressLine.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    const address = parts[0];

    // Try to parse "12623 Berlin, Mahlsdorf (Hellersdorf)" format
    const cityPart = parts.slice(1).join(', ');
    const cityMatch = cityPart.match(/\d*\s*([A-Za-zäöüÄÖÜß\s-]+?)(?:,|$)/);
    const city = cityMatch ? cityMatch[1].trim() : parts[1]?.replace(/\d+\s*/, '').trim() || 'Unknown';

    // Extract district/region from remaining part
    const regionMatch = cityPart.match(/,\s*(.+?)(?:\s*\(|$)/);
    const region = regionMatch ? regionMatch[1].trim() : undefined;

    return { address, city, region };
  }

  return { city: addressLine };
}

/**
 * Extract features from result item
 */
function extractFeaturesFromItem(item: ResultItem): string[] {
  const features: string[] = [];

  if (item.liveVideoTourAvailable) features.push('virtual-tour');
  if (item.isNewObject) features.push('new-build');
  if (item.energyEfficiencyClass) features.push(`energy-class-${item.energyEfficiencyClass}`);
  if (item.tags) features.push(...item.tags);

  // Extract additional features if present
  if (item.balcony) features.push('balcony');
  if (item.garden) features.push('garden');
  if (item.cellar) features.push('cellar');
  if (item.lift) features.push('elevator');
  if (item.builtInKitchen) features.push('built-in-kitchen');
  if (item.parkingSpaceType) features.push(`parking-${item.parkingSpaceType.toLowerCase()}`);
  if (item.condition) features.push(`condition-${item.condition.toLowerCase()}`);
  if (item.heatingType) features.push(`heating-${item.heatingType.toLowerCase()}`);

  return features;
}

/**
 * Extract images from result item
 */
function extractImagesFromItem(item: ResultItem): string[] {
  const images: string[] = [];

  // Title picture (full quality)
  if (item.titlePicture?.full) {
    images.push(item.titlePicture.full);
  }

  // Gallery pictures
  if (item.pictures) {
    for (const pic of item.pictures) {
      if (pic.urlScaleAndCrop) {
        // Replace template with actual size
        const url = pic.urlScaleAndCrop.replace('%WIDTH%x%HEIGHT%', '800x600');
        if (!images.includes(url)) {
          images.push(url);
        }
      }
    }
  }

  return images;
}

/**
 * Parse postcode from address line
 * Format: "Neuenhagener Str. 48, 12623 Berlin, Mahlsdorf (Hellersdorf)"
 */
function parsePostcodeFromAddressLine(addressLine?: string): string | undefined {
  if (!addressLine) return undefined;

  // Match German postcode (5 digits)
  const postcodeMatch = addressLine.match(/\b(\d{5})\b/);
  return postcodeMatch ? postcodeMatch[1] : undefined;
}

/**
 * Parse a new format result item to Property
 */
export function parseResultItem(resultItem: ResultListItem): Property | null {
  const item = resultItem.item;
  if (!item || !item.id) return null;

  const { price, currency } = parsePriceFromAttributes(item.attributes);
  // Prefer direct fields if available, fall back to attributes parsing
  const sqm = item.livingSpace ?? parseLivingSpaceFromAttributes(item.attributes);
  const rooms = item.numberOfRooms ?? parseRoomsFromAttributes(item.attributes);
  const { address, city, region } = parseAddressLine(item.address?.line);

  // Extract postcode from address line or direct field
  const postcode = item.address?.postcode || parsePostcodeFromAddressLine(item.address?.line);

  // Build description from available text
  const description = item.description || undefined;

  // Extract agent info from realtor
  const agent = item.realtor?.companyName || item.realtor?.name ? {
    name: item.realtor.name || 'Agent',
    phone: item.realtor.phoneNumber,
    agency: item.realtor.companyName
  } : undefined;

  // Build extended location with postcode
  const location: ExtendedLocation = {
    address,
    city: item.address?.city || city,
    region: item.address?.quarter || region,
    country: 'Germany',
    coordinates: item.address?.lat && item.address?.lon ? {
      lat: item.address.lat,
      lon: item.address.lon
    } : undefined
  };

  // Add postcode if available
  if (postcode) {
    location.postcode = postcode;
  }

  // Build extended details with construction year and available from date
  const details: ExtendedDetails = {
    sqm,
    rooms,
    bedrooms: item.numberOfBedRooms,
    bathrooms: item.numberOfBathRooms,
    floor: item.floor
  };

  // Add construction year if available (documented in API)
  if (item.constructionYear) {
    details.constructionYear = item.constructionYear;
  }

  // Add available from date if available (documented as freeFrom in API)
  if (item.freeFrom) {
    details.availableFrom = item.freeFrom;
  }

  const property: Property = {
    id: `is24-${item.id}`,
    source: 'immobilienscout24',
    url: `https://www.immobilienscout24.de/expose/${item.id}`,
    title: item.title || 'Property listing',
    price,
    currency,
    propertyType: parsePropertyTypeFromString(item.realEstateType),
    transactionType: parseTransactionTypeFromString(item.realEstateType),
    location: location as Property['location'],
    details: details as Property['details'],
    features: extractFeaturesFromItem(item),
    images: extractImagesFromItem(item),
    description,
    agent,
    scrapedAt: new Date().toISOString()
  };

  return property;
}

/**
 * Parse a legacy format listing entry to Property
 */
export function parseLegacyListingEntry(entry: LegacyListingEntry): Property | null {
  const realEstate = entry.realEstate;
  if (!realEstate) return null;

  const id = entry['@id'] || realEstate['@id'];
  if (!id) return null;

  const address = realEstate.address;
  const price = realEstate.price;

  // Build comprehensive features list
  const features: string[] = [];
  if (realEstate.balcony) features.push('balcony');
  if (realEstate.garden) features.push('garden');
  if (realEstate.cellar) features.push('cellar');
  if (realEstate.lift) features.push('elevator');
  if (realEstate.builtInKitchen) features.push('built-in-kitchen');
  if (realEstate.guestToilet) features.push('guest-toilet');
  if (realEstate.handicappedAccessible) features.push('wheelchair-accessible');
  if (realEstate.petsAllowed && realEstate.petsAllowed.toLowerCase() !== 'no') features.push('pets-allowed');
  if (realEstate.energyEfficiencyClass) features.push(`energy-class-${realEstate.energyEfficiencyClass}`);
  if (realEstate.parkingSpaceType) features.push(`parking-${realEstate.parkingSpaceType.toLowerCase()}`);
  if (realEstate.condition) features.push(`condition-${realEstate.condition.toLowerCase()}`);
  if (realEstate.heatingType) features.push(`heating-${realEstate.heatingType.toLowerCase()}`);
  if (realEstate.constructionYear) features.push(`built-${realEstate.constructionYear}`);

  // Extract all images
  const images: string[] = [];
  if (realEstate.titlePicture?.['@href']) {
    images.push(realEstate.titlePicture['@href']);
  }
  if (realEstate.galleryAttachments?.attachment) {
    for (const att of realEstate.galleryAttachments.attachment) {
      if (att['@href'] && !images.includes(att['@href'])) {
        images.push(att['@href']);
      }
    }
  }

  // Build description from available text fields
  const descriptionParts: string[] = [];
  if (realEstate.descriptionNote) descriptionParts.push(realEstate.descriptionNote);
  if (realEstate.description) descriptionParts.push(realEstate.description);
  if (realEstate.furnishingNote) descriptionParts.push(`Ausstattung: ${realEstate.furnishingNote}`);
  if (realEstate.locationNote) descriptionParts.push(`Lage: ${realEstate.locationNote}`);
  if (realEstate.otherNote) descriptionParts.push(realEstate.otherNote);
  const description = descriptionParts.length > 0 ? descriptionParts.join('\n\n') : undefined;

  // Extract agent info from contact details or company name
  let agent: { name: string; phone?: string; agency?: string } | undefined;
  if (realEstate.contactDetails) {
    const contact = realEstate.contactDetails;
    const agentName = [contact.firstname, contact.lastname].filter(Boolean).join(' ') || 'Agent';
    agent = {
      name: agentName,
      phone: contact.phoneNumber || contact.cellPhoneNumber,
      agency: contact.company || realEstate.realtorCompanyName
    };
  } else if (realEstate.realtorCompanyName) {
    agent = {
      name: 'Agent',
      agency: realEstate.realtorCompanyName
    };
  }

  // Build extended location with postcode (documented in API response)
  const location: ExtendedLocation = {
    address: [address?.street, address?.houseNumber].filter(Boolean).join(' ') || undefined,
    city: address?.city || 'Unknown',
    region: address?.quarter,
    country: 'Germany',
    coordinates: address?.wgs84Coordinate ? {
      lat: address.wgs84Coordinate.latitude || 0,
      lon: address.wgs84Coordinate.longitude || 0
    } : undefined
  };

  // Add postcode if available (documented in API response as address.postcode)
  if (address?.postcode) {
    location.postcode = address.postcode;
  }

  // Build extended details with additional fields from API
  const details: ExtendedDetails = {
    sqm: realEstate.livingSpace,
    rooms: realEstate.numberOfRooms,
    bedrooms: realEstate.numberOfBedRooms,
    bathrooms: realEstate.numberOfBathRooms,
    floor: realEstate.floor
  };

  // Add total floors if available (documented in legacy API as numberOfFloors)
  if (realEstate.numberOfFloors) {
    details.totalFloors = realEstate.numberOfFloors;
  }

  // Add construction year if available (documented in API)
  if (realEstate.constructionYear) {
    details.constructionYear = realEstate.constructionYear;
  }

  // Add available from date if available (documented as freeFrom in API)
  if (realEstate.freeFrom) {
    details.availableFrom = realEstate.freeFrom;
  }

  const property: Property = {
    id: `is24-${id}`,
    source: 'immobilienscout24',
    url: `https://www.immobilienscout24.de/expose/${id}`,
    title: realEstate.title || 'Property listing',
    price: price?.value || 0,
    currency: price?.currency || 'EUR',
    propertyType: parsePropertyTypeFromString(realEstate['@xsi.type']),
    transactionType: realEstate.commercializationType?.toLowerCase().includes('rent') ? 'rent' : 'sale',
    location: location as Property['location'],
    details: details as Property['details'],
    features,
    images,
    description,
    agent,
    scrapedAt: new Date().toISOString()
  };

  return property;
}

/**
 * Parse search response to Property array
 * Supports both new and legacy response formats
 */
export function parseSearchResponse(response: MobileSearchResponse): {
  properties: Property[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
} {
  const properties: Property[] = [];
  let totalHits = 0;
  let currentPage = 1;
  let totalPages = 1;

  // Try new format first
  if (response.resultListItems && response.resultListItems.length > 0) {
    totalHits = response.totalResults || response.numberOfListings || 0;
    currentPage = response.pageNumber || 1;
    totalPages = response.numberOfPages || 1;

    for (const resultItem of response.resultListItems) {
      if (resultItem.type === 'EXPOSE_RESULT' && resultItem.item) {
        const property = parseResultItem(resultItem);
        if (property) {
          properties.push(property);
        }
      }
    }

    return { properties, totalHits, currentPage, totalPages };
  }

  // Fall back to legacy format
  const resultlist = response.resultlist || response.searchResponseModel?.resultlist;

  if (resultlist) {
    if (resultlist.paging) {
      currentPage = resultlist.paging.current || 1;
      totalPages = resultlist.paging.numberOfPages || 1;
      totalHits = resultlist.paging.numberOfHits || 0;
    }

    if (resultlist.resultlistEntries) {
      for (const entryGroup of resultlist.resultlistEntries) {
        if (entryGroup['@numberOfHits']) {
          totalHits = parseInt(entryGroup['@numberOfHits'], 10) || totalHits;
        }

        if (entryGroup.resultlistEntry) {
          for (const entry of entryGroup.resultlistEntry) {
            const property = parseLegacyListingEntry(entry);
            if (property) {
              properties.push(property);
            }
          }
        }
      }
    }
  }

  return { properties, totalHits, currentPage, totalPages };
}

/**
 * Parse expose (detail) response to Property
 */
export function parseExposeResponse(response: MobileExposeResponse, exposeId: string): Property | null {
  const realEstate = response.expose?.realEstate;
  if (!realEstate) return null;

  return parseLegacyListingEntry({
    '@id': exposeId,
    realEstate
  });
}
