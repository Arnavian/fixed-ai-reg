let map;
let markers = [];
let markerColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'];
let trafficLayer;
let infoWindow;

function init() {
    const mapContainer = document.getElementById('canvas-container');

    map = new google.maps.Map(mapContainer, {
        zoom: 4,
        center: { lat: 20, lng: 0 },
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        heading: 0,
        tilt: 45
    });

    trafficLayer = new google.maps.TrafficLayer();
    infoWindow = new google.maps.InfoWindow();

    setupControls();

    map.addListener('click', (e) => {
        addMarkerAtLocation(e.latLng);
        getCountryFromLatLng(e.latLng);
    });

    map.addListener('center_changed', updateInfo);
    map.addListener('zoom_changed', updateInfo);

    updateInfo();
}

function setupControls() {
    document.getElementById('searchBtn').addEventListener('click', searchLocation);

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });

    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        const zoom = parseInt(e.target.value);
        map.setZoom(zoom);
        document.getElementById('zoomValue').textContent = zoom;
    });

    document.getElementById('show3D').addEventListener('change', (e) => {
        map.setTilt(e.target.checked ? 45 : 0);
    });

    document.getElementById('showSatellite').addEventListener('change', (e) => {
        map.setMapTypeId(
            e.target.checked
                ? google.maps.MapTypeId.SATELLITE
                : google.maps.MapTypeId.ROADMAP
        );
    });

    document.getElementById('showTraffic').addEventListener('change', (e) => {
        trafficLayer.setMap(e.target.checked ? map : null);
    });

    document.getElementById('addMarkerBtn').addEventListener('click', () => {
        const center = map.getCenter();
        addMarkerAtLocation(center);
        getCountryFromLatLng(center);
    });

    document.getElementById('resetBtn').addEventListener('click', resetView);

    const askBtn = document.getElementById("askRegulationBtn");
    if (askBtn) {
        askBtn.addEventListener("click", askRegulationQuestion);
    }
}

function searchLocation() {
    const searchInput = document.getElementById('searchInput').value;

    if (!searchInput) {
        alert('Please enter a location');
        return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: searchInput }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
            const location = results[0].geometry.location;

            map.setCenter(location);
            map.setZoom(12);

            addMarkerAtLocation(location);
            getCountryFromLatLng(location);
        } else {
            alert('Location not found: ' + status);
        }
    });
}

function getCountryFromLatLng(latLng) {
    console.log("Clicked coords:", latLng.lat(), latLng.lng());

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status !== "OK" || !results || results.length === 0) {
            updateRegulationSidebar(null);
            return;
        }

        let countryComponent = null;

        for (const result of results) {
            countryComponent = result.address_components.find(component =>
                component.types.includes("country")
            );

            if (countryComponent) break;
        }

        if (!countryComponent) {
            updateRegulationSidebar(null);
            return;
        }

        const country = {
            name: countryComponent.long_name,
            code: countryComponent.short_name
        };

        updateRegulationSidebar(country);
        loadTemporaryRegulationData(country);
    });
}

function updateRegulationSidebar(country) {
    if (!country) {
        document.getElementById("selectedCountry").textContent = "Country not found";
        document.getElementById("overallScore").textContent = "—";
        document.getElementById("businessScore").textContent = "—";
        document.getElementById("consumerScore").textContent = "—";
        document.getElementById("summaryCards").innerHTML = "";
        document.getElementById("regulationAnswer").textContent = "";
        return;
    }

    document.getElementById("selectedCountry").textContent =
        `${country.name} (${country.code})`;

    document.getElementById("overallScore").textContent = "Loading...";
    document.getElementById("businessScore").textContent = "Loading...";
    document.getElementById("consumerScore").textContent = "Loading...";
    document.getElementById("summaryCards").innerHTML = "";
    document.getElementById("regulationAnswer").textContent = "";
}

async function loadTemporaryRegulationData(country) {
    document.getElementById("overallScore").textContent = "Loading...";
    document.getElementById("businessScore").textContent = "Loading...";
    document.getElementById("consumerScore").textContent = "Loading...";

    renderSummaryCards([
        {
            title: "Analyzing AI Regulation...",
            summary: `Generating business and consumer AI regulation analysis for ${country.name}.`
        }
    ]);

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "score",
                country: {
                    name: country.name,
                    code: country.code
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Backend error");
        }

        document.getElementById("overallScore").textContent = `${data.overallScore}/100`;
        document.getElementById("businessScore").textContent = `${data.businessScore}/100`;
        document.getElementById("consumerScore").textContent = `${data.consumerScore}/100`;

        renderSummaryCards([
            { title: "AI Regulation Overview", summary: data.overview },
            { title: "Named Policies / Frameworks", summary: data.namedPolicies },
            { title: "Regulation Style", summary: data.regulationStyle },
            { title: "Business Friendliness", summary: data.businessImpact },
            { title: "Consumer & Data Protection", summary: data.consumerImpact },
            { title: "Political Impact", summary: data.politicalImpact },
            { title: "Key Strengths", summary: data.keyStrengths },
            { title: "Main Weaknesses", summary: data.mainWeaknesses },
            { title: "Score Reasoning", summary: data.reasoning }
        ]);

    } catch (error) {
        console.error(error);

        document.getElementById("overallScore").textContent = "Error";
        document.getElementById("businessScore").textContent = "Error";
        document.getElementById("consumerScore").textContent = "Error";

        renderSummaryCards([
            {
                title: "AI Request Failed",
                summary: "Check your Vercel environment variable (OPENAI_API_KEY)."
            }
        ]);
    }
}

function renderSummaryCards(cards) {
    const container = document.getElementById("summaryCards");
    container.innerHTML = "";

    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.className = "summary-card";

        cardElement.innerHTML = `
            <h4>${card.title}</h4>
            <p>${card.summary}</p>
        `;

        container.appendChild(cardElement);
    });
}

async function askRegulationQuestion() {
    const countryText = document.getElementById("selectedCountry").textContent;
    const question = document.getElementById("regulationSearch").value.trim();
    const answerBox = document.getElementById("regulationAnswer");

    if (
        !countryText ||
        countryText === "Click a country on the map" ||
        countryText === "Country not found"
    ) {
        alert("Click a country first.");
        return;
    }

    if (!question) {
        alert("Ask a regulation question first.");
        return;
    }

    answerBox.textContent = "Thinking...";

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "question",
                country: countryText,
                question: question
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Backend error");
        }

        answerBox.textContent = data.answer;

    } catch (error) {
        console.error(error);
        answerBox.textContent = "Error getting answer.";
    }
}

function addMarkerAtLocation(latLng) {
    const colorIndex = markers.length % markerColors.length;
    const color = markerColors[colorIndex];

    const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        title: `Location ${markers.length + 1}`,
        icon: createMarkerIcon(color)
    });

    marker.markerData = {
        id: markers.length + 1,
        name: `Location ${markers.length + 1}`,
        lat: latLng.lat().toFixed(4),
        lng: latLng.lng().toFixed(4),
        color: color
    };

    marker.addListener('click', () => {
        infoWindow.setContent(`
            <div style="padding: 10px; font-family: Arial; font-size: 12px;">
                <strong>${marker.markerData.name}</strong><br/>
                Lat: ${marker.markerData.lat}<br/>
                Lng: ${marker.markerData.lng}
            </div>
        `);

        infoWindow.open(map, marker);
    });

    markers.push(marker);
    updateMarkerList();
}

function createMarkerIcon(color) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2
    };
}

function updateMarkerList() {
    const list = document.getElementById('markerList');
    list.innerHTML = '';

    markers.forEach((marker, index) => {
        const item = document.createElement('div');
        item.className = 'marker-item';

        item.innerHTML = `
            <span>
                <span class="marker-dot" style="background: ${marker.markerData.color}"></span>
                ${marker.markerData.name}
            </span>
            <button class="marker-delete" onclick="deleteMarker(${index})">×</button>
        `;

        list.appendChild(item);
    });

    document.getElementById('objectCount').textContent = `Locations: ${markers.length}`;
}

function deleteMarker(index) {
    markers[index].setMap(null);
    markers.splice(index, 1);
    updateMarkerList();
}

function updateInfo() {
    const center = map.getCenter();
    const zoom = map.getZoom();

    document.getElementById('currentLocation').textContent =
        `Lat: ${center.lat().toFixed(4)}, Lng: ${center.lng().toFixed(4)}`;

    document.getElementById('zoomInfo').textContent = zoom;
    document.getElementById('zoomSlider').value = zoom;
}

function resetView() {
    map.setCenter({ lat: 20, lng: 0 });
    map.setZoom(4);
    map.setTilt(45);

    document.getElementById('zoomSlider').value = 4;
    document.getElementById('zoomValue').textContent = 4;
}

window.addEventListener('load', init);