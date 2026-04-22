import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { locations, keywords } = await request.json();

    if (!locations || !locations.length || !keywords || !keywords.length) {
      return NextResponse.json({ error: 'Missing locations or keywords' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API Key is missing on the server.' }, { status: 500 });
    }

    const allLeadsMap = new Map();

    // We fetch combinations sequentially to avoid rate limiting and overloading
    for (const location of locations) {
      for (const keyword of keywords) {
        const query = `${keyword} in ${location}`;
        
        try {
          const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
          
          const res = await fetch(searchUrl);
          const data = await res.json();
          
          if (!res.ok || data.status !== 'OK') {
            console.error(`Google API Error for "${query}":`, data.error_message || data.status);
            continue; // Skip this combination and try the next
          }

          if (data.results && data.results.length > 0) {
            // Process the first page of results (up to 20)
            const placeIds = data.results.map(place => place.place_id);
            
            // Filter out ones we've already fetched
            const newPlaceIds = placeIds.filter(id => !allLeadsMap.has(id));

            // Fetch details for each new place concurrently
            const detailsPromises = newPlaceIds.map(async (placeId) => {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,formatted_address,rating,user_ratings_total,website,types,url&key=${apiKey}`;
              const detailsRes = await fetch(detailsUrl);
              const detailsData = await detailsRes.json();
              
              if (detailsData.status === 'OK' && detailsData.result) {
                const placeDetails = detailsData.result;
                
                let industry = keyword;
                if (placeDetails.types && placeDetails.types.length > 0) {
                  // Clean up the type string (e.g., 'hardware_store' -> 'Hardware Store')
                  industry = placeDetails.types[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }

                allLeadsMap.set(placeId, {
                  id: placeId,
                  name: placeDetails.name || 'Unknown',
                  industry: industry,
                  phone: placeDetails.formatted_phone_number || '',
                  address: placeDetails.formatted_address || '',
                  rating: placeDetails.rating || 0,
                  reviewsCount: placeDetails.user_ratings_total || 0,
                  website: placeDetails.website || '',
                  googleMapsLink: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
                  searchKeyword: keyword,
                  searchLocation: location
                });
              }
            });

            await Promise.all(detailsPromises);
          }
        } catch (fetchError) {
          console.error(`Fetch error for "${query}":`, fetchError);
        }
      }
    }

    const results = Array.from(allLeadsMap.values());

    return NextResponse.json({ leads: results });
  } catch (error) {
    console.error('Extraction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
