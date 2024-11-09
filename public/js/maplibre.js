/* eslint-disable */
 

 // This works because we added this in html
// dataset works with whatever starts with data-
//   section.section-map
//     #map(data-locations=`${JSON.stringify(tour.locations)}`)

const locations = JSON.parse(document.getElementById('map').dataset.locations);


// Map initialization
const map = new maplibregl.Map({
  container: 'map', // The ID of the div to render the map in
  style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', // Base map style
  center: locations[0].coordinates, // Initial center [lng, lat]
  zoom: 8, // Initial zoom level
});
 
// Loop through each location and add a marker
locations.forEach((location) => {
  // Create a new HTML element for the marker
  const el = document.createElement('div');
  el.className = 'marker';
 
  // Create a marker and add it to the map
  new maplibregl.Marker(el)
    .setLngLat(location.coordinates)
    .setPopup(
      new maplibregl.Popup({ offset: 25 }) // Add popups
        .setMaxWidth('25rem') // Set the max-width of the popup
        .setHTML(
          `<div class='maplibregl-popup-content'><h4>${location.description}</h4><p>Day: ${location.day}</p></div>`,
        ),
    )
    .addTo(map);
});
