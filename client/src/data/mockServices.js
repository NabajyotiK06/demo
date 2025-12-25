export const MOCK_SERVICES = [
    // Hospitals (EMS)
    { id: "h1", type: "hospital", name: "Apollo Gleneagles Hospital", address: "58, Canal Circular Rd", lat: 22.5735, lng: 88.4011 },
    { id: "h2", type: "hospital", name: "SSKM Hospital", address: "244, AJC Bose Rd", lat: 22.5393, lng: 88.3426 },
    { id: "h3", type: "hospital", name: "AMRI Hospital", address: "Salt Lake Sector 3", lat: 22.5647, lng: 88.4116 },
    { id: "h4", type: "hospital", name: "Fortis Hospital", address: "Anandapur, EM Bypass", lat: 22.5195, lng: 88.4026 },
    { id: "h5", type: "hospital", name: "Ruby General Hospital", address: "Kasba Golpark", lat: 22.5133, lng: 88.4016 },
    { id: "h6", type: "hospital", name: "Desun Hospital", address: "Kasba", lat: 22.5160, lng: 88.4020 },
    { id: "h7", type: "hospital", name: "CMRI", address: "Diamond Harbour Rd", lat: 22.5398, lng: 88.3283 },
    { id: "h8", type: "hospital", name: "Woodlands Hospital", address: "Alipore", lat: 22.5350, lng: 88.3300 },
    { id: "h9", type: "hospital", name: "RG Kar Medical College", address: "Belgachia", lat: 22.6047, lng: 88.3751 },
    { id: "h10", type: "hospital", name: "Calcutta Medical College", address: "College Street", lat: 22.5745, lng: 88.3630 },

    // Police Stations (Police)
    { id: "p1", type: "police", name: "Lalbazar Police HQ", address: "Lalbazar", lat: 22.5714, lng: 88.3524 },
    { id: "p2", type: "police", name: "Bidhannagar South PS", address: "Sector 3, Salt Lake", lat: 22.5726, lng: 88.4030 },
    { id: "p3", type: "police", name: "Park Street PS", address: "Park Street", lat: 22.5550, lng: 88.3550 },
    { id: "p4", type: "police", name: "Shakespeare Sarani PS", address: "Theater Rd", lat: 22.5480, lng: 88.3580 },
    { id: "p5", type: "police", name: "Alipore PS", address: "Belvedere Rd", lat: 22.5300, lng: 88.3350 },
    { id: "p6", type: "police", name: "Ballygunge PS", address: "Hazra Rd", lat: 22.5250, lng: 88.3650 },
    { id: "p7", type: "police", name: "New Market PS", address: "Lindsay St", lat: 22.5600, lng: 88.3520 },
    { id: "p8", type: "police", name: "Ultadanga PS", address: "Ultadanga", lat: 22.5900, lng: 88.3850 },

    // Fire Stations (Fire)
    { id: "fs1", type: "fire_station", name: "Fire Station HQ", address: "Free School St", lat: 22.5590, lng: 88.3530 },
    { id: "fs2", type: "fire_station", name: "Maniktala Fire Station", address: "Maniktala", lat: 22.5850, lng: 88.3680 },
    { id: "fs3", type: "fire_station", name: "Salt Lake Fire Station", address: "Sector 5", lat: 22.5750, lng: 88.4300 },
    { id: "fs4", type: "fire_station", name: "Kalighat Fire Station", address: "Kalighat", lat: 22.5200, lng: 88.3450 },
    { id: "fs5", type: "fire_station", name: "Garia Fire Station", address: "Garia", lat: 22.4700, lng: 88.3800 },
    { id: "fs6", type: "fire_station", name: "Chittaranjan Fire Station", address: "Chittaranjan Ave", lat: 22.5780, lng: 88.3600 },

    // Parking
    { id: "pk1", type: "parking", name: "Park Street Parking", address: "Park Street", lat: 22.5539, lng: 88.3533 },
    { id: "pk2", type: "parking", name: "Salt Lake Stadium", address: "Salt Lake", lat: 22.5700, lng: 88.4060 },
    { id: "pk3", type: "parking", name: "City Centre 1", address: "Salt Lake", lat: 22.5900, lng: 88.4100 },
    { id: "pk4", type: "parking", name: "South City Mall", address: "Prince Anwar Shah Rd", lat: 22.5000, lng: 88.3600 },
    { id: "pk5", type: "parking", name: "Quest Mall", address: "Syed Amir Ali Ave", lat: 22.5400, lng: 88.3700 },
    { id: "pk6", type: "parking", name: "Esplanade Parking", address: "Esplanade", lat: 22.5650, lng: 88.3500 },
    { id: "pk7", type: "parking", name: "Acropolis Mall", address: "Kasba", lat: 22.5130, lng: 88.3950 },

    // Fuel / EV
    { id: "f1", type: "fuel", name: "HP Petrol Pump", address: "Sector 5, Salt Lake", lat: 22.5726, lng: 88.4320 },
    { id: "f2", type: "fuel", name: "Tata Power EV Charging", address: "New Town", lat: 22.5800, lng: 88.4600 },
    { id: "f3", type: "fuel", name: "Indian Oil", address: "EM Bypass", lat: 22.5500, lng: 88.4000 },
    { id: "f4", type: "fuel", name: "Bharat Petroleum", address: "Ballygunge", lat: 22.5300, lng: 88.3700 },
    { id: "f5", type: "fuel", name: "Shell Petrol Pump", address: "Kasba", lat: 22.5100, lng: 88.3900 },
    { id: "f6", type: "fuel", name: "Ather Grid Charging", address: "Park Street", lat: 22.5540, lng: 88.3520 }
];

// Calculate Distance Helper (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

export const getNearestService = (targetLat, targetLng, serviceType) => {
    const candidates = MOCK_SERVICES.filter(s => s.type === serviceType);

    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    let minDistance = getDistance(targetLat, targetLng, nearest.lat, nearest.lng);

    for (let i = 1; i < candidates.length; i++) {
        const d = getDistance(targetLat, targetLng, candidates[i].lat, candidates[i].lng);
        if (d < minDistance) {
            minDistance = d;
            nearest = candidates[i];
        }
    }

    return { ...nearest, distance: minDistance };
};
