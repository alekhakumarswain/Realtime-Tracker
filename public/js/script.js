// Initialize socket connection
const socket = io();

// Map initialization
const map = L.map("map", { zoomControl: false }).setView([0, 0], 16); // Set the center of the map and initial zoom level

// Set tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// User markers (each user will be identified by their unique ID)
const markers = {};
let userLocationCircle = null; // To store the user's location circle (will not be shown)
let userMarker = null; // To store the user's marker (rabbit icon only)

// Set user status message
const statusMessage = document.getElementById("user-status");

const userIcon = new L.Icon({
    iconUrl: 'https://png.pngtree.com/png-vector/20240204/ourmid/pngtree-cute-rabbit-bunny-png-image_11606964.png',
    iconSize: [40, 40],  // Custom size for the rabbit icon
    iconAnchor: [20, 40], // Anchor point for positioning
    popupAnchor: [0, -40] // Popup appears above the marker
});

const otherUserIcon = new L.Icon({
    iconUrl: 'https://static.vecteezy.com/system/resources/thumbnails/027/687/964/small_2x/red-location-marker-icon-on-transparent-background-free-png.png',
    iconSize: [40, 40], // Standard size for location marker icon
    iconAnchor: [20, 40], // Center the icon
    popupAnchor: [0, -40] // Popup appears above the marker
});

// Handle Geolocation (getting the user's location)
if (navigator.geolocation) {
    document.getElementById("loading").style.display = "block"; // Show loading message
    navigator.geolocation.getCurrentPosition((position) => {
        centerMapOnMyLocation(position); // Center the map on the user's location
        document.getElementById("loading").style.display = "none"; // Hide loading message
    }, (error) => {
        console.error("Error getting your location:", error);
        document.getElementById("loading").style.display = "none"; // Hide loading message if there's an error
    });
} else {
    console.error("Geolocation is not supported by this browser.");
    document.getElementById("loading").style.display = "none"; // Hide loading if geolocation is unsupported
}

// Function to center the map on user's current location and create the user's marker
function centerMapOnMyLocation(position) {
    const { latitude, longitude } = position.coords;
    map.setView([latitude, longitude], 16);

    // Create the user's marker with the rabbit icon, no circle around it
    if (!userMarker) {
        userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
            .bindPopup(`<strong>Your Location</strong><br>Latitude: ${latitude}<br>Longitude: ${longitude}`);
    }
}

// Create a marker for other users using the location pin icon
function createOtherUserMarker(id, latitude, longitude) {
    // Create a marker for another user using the location icon
    const otherMarker = L.marker([latitude, longitude], { icon: otherUserIcon }).addTo(map)
        .bindPopup(`<strong>User ID:</strong> ${id}<br>Latitude: ${latitude}<br>Longitude: ${longitude}`);
    markers[id] = otherMarker;

    // Create a circle for other users with a 10 km radius
    L.circle([latitude, longitude], {
        color: "red",
        fillColor: "rgba(255, 0, 0, 0.4)",
        fillOpacity: 0.4,
        radius: 5000 // 10km radius around other users' location
    }).addTo(map);
}

// When the server sends new location data (user has moved)
socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;

    // Only create a marker and circle for other users (not for the current user)
    if (id !== socket.id) {
        if (!markers[id]) {
            createOtherUserMarker(id, latitude, longitude);
        } else {
            markers[id].setLatLng([latitude, longitude]); // Update the location if the user is already on the map
        }
    }
});

// When a user disconnects, remove their marker and circle from the map
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});

// Handling user connection to display status (Online)
socket.on("connect", () => {
    statusMessage.classList.add("active");  // Set the "online" status as active when connected to socket
});

// Handle send-location event: Send current location to server every 5 seconds
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", { latitude, longitude });
    }, (error) => {
        console.error("Error retrieving location:", error);
    }, {
        enableHighAccuracy: true,  // Use high accuracy to get better location
        timeout: 5000,             // Timeout after 5 seconds
        maximumAge: 0              // No cached location
    });
}

// Set up Locate control to allow the user to locate themselves
const locateControl = L.control.locate({
    strings: {
        title: "Show my location"
    },
    locateOptions: {
        enableHighAccuracy: true
    }
}).addTo(map);
