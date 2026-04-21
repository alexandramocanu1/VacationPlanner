export interface ParsedLocation {
  lat: number;
  lng: number;
  name: string;
  address: string;
  placeId?: string;
}

export async function parseGoogleMapsUrlAsync(url: string): Promise<ParsedLocation | null> {
  try {
    let resolvedUrl = url;

    // Resolve URL-uri scurte
    if (
      url.includes('goo.gl') ||
      url.includes('maps.app.goo.gl') ||
      url.includes('g.co/maps')
    ) {
      try {
        const response = await fetch(url, { method: 'GET', redirect: 'follow' });
        resolvedUrl = response.url;
      } catch {
        resolvedUrl = url;
      }
    }

    return parseGoogleMapsUrl(resolvedUrl);
  } catch {
    return null;
  }
}

export function parseGoogleMapsUrl(url: string): ParsedLocation | null {
  try {
    // Format nou: !3d<lat>!4d<lng>  (cel mai comun în URL-urile share moderne)
    const newFormatMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (newFormatMatch) {
      const name = extractNameFromUrl(url);
      return {
        lat: parseFloat(newFormatMatch[1]),
        lng: parseFloat(newFormatMatch[2]),
        name,
        address: name,
      };
    }

    // Format: /maps/place/Name/@lat,lng,zoom
    const placeMatch = url.match(/maps\/place\/([^/@]+)\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      const rawName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      const cleanName = rawName.replace(/\//g, '').trim();
      return {
        lat: parseFloat(placeMatch[2]),
        lng: parseFloat(placeMatch[3]),
        name: cleanName,
        address: cleanName,
      };
    }

    // Format: ?q=lat,lng sau ?q=Place+Name
    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const q = decodeURIComponent(qMatch[1]);
      const coords = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      if (coords) {
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[2]),
          name: `Locație (${parseFloat(coords[1]).toFixed(4)}, ${parseFloat(coords[2]).toFixed(4)})`,
          address: q,
        };
      }
      return { lat: 0, lng: 0, name: q, address: q };
    }

    // Format: /@lat,lng
    const atCoordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atCoordsMatch) {
      const name = extractNameFromUrl(url);
      return {
        lat: parseFloat(atCoordsMatch[1]),
        lng: parseFloat(atCoordsMatch[2]),
        name,
        address: name,
      };
    }

    // Format: ?ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2]),
        name: 'Locație Google Maps',
        address: '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Extrage numele din URL-ul de place
function extractNameFromUrl(url: string): string {
  try {
    // /maps/place/Nume+Locatie/
    const placeSegment = url.match(/maps\/place\/([^/@?&]+)/);
    if (placeSegment) {
      return decodeURIComponent(placeSegment[1].replace(/\+/g, ' ')).replace(/\//g, '').trim();
    }
  } catch {}
  return 'Locație Google Maps';
}

// ... restul funcțiilor rămân la fel
export function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function optimizeRoute(locations: { id: string; lat: number; lng: number }[]): string[] {
  if (locations.length <= 1) return locations.map(l => l.id);
  const remaining = [...locations];
  const ordered: string[] = [];
  let current = remaining.shift()!;
  ordered.push(current.id);
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((loc, idx) => {
      const dist = distanceBetween(current.lat, current.lng, loc.lat, loc.lng);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = idx; }
    });
    current = remaining.splice(nearestIdx, 1)[0];
    ordered.push(current.id);
  }
  return ordered;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins} min`;
}

export function formatStayDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export async function fetchPlacePhotos(
  lat: number,
  lng: number,
  name: string,
  apiKey: string,
): Promise<{ photos: string[]; placeId: string; address: string }> {
  try {
    // 1. Find Place — obține placeId după coordonate + nume
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,name,formatted_address,photos&key=${apiKey}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();

    const candidate = findData.candidates?.[0];
    if (!candidate) return { photos: [], placeId: '', address: '' };

    const placeId = candidate.place_id ?? '';
    const address = candidate.formatted_address ?? '';
    const photoRefs: string[] = (candidate.photos ?? [])
      .slice(0, 5)
      .map((p: any) => p.photo_reference);

    // 2. Construiește URL-urile pentru poze
    const photoUrls = photoRefs.map(
      ref =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ref}&key=${apiKey}`,
    );

    return { photos: photoUrls, placeId, address };
  } catch {
    return { photos: [], placeId: '', address: '' };
  }
}