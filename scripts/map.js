import mapboxgl from 'mapbox-gl';
import { features, FOCUS_AREAS, FUNDED_STATUS } from './features';
import '../styles/style.css';
mapboxgl.accessToken = 'YOUR PUBLIC ACCESS TOKEN HERE';

/**
 * @type {GeoJSON}
 * @see {@link https://www.gps-coordinates.net/} for converting addresses to coordinates.
 */
const geojson = {
    'type': 'FeatureCollection',
    'features': decompressFeatures(features)
};

/**
 * Turns a compressed feature into a GeoJSON feature. Used to reduce the number of boilerplate code, the number of characters, and to simplify the process of adding new points.
 * @param {Object[]} compressedFeatures An array of JSON objects that represent the features.
 * @param {string} compressedFeatures[].title The title of the feature.
 * @param {number[]} compressedFeatures[].coordinates The coordinates of the feature. In the form `[LONGITUDE, LATITUDE]`.
 * @param {string=} compressedFeatures[].description The description of the feature.
 * @param {string=} compressedFeatures[].websiteURL The website URL of the feature.
 * @param {FOCUS_AREAS=} compressedFeatures[].focusArea The focus area of the feature. Is one of {@linkcode FOCUS_AREAS}.
 * @param {FUNDED_STATUS=} compressedFeatures[].fundedStatus The funded status of the feature. Is one of {@linkcode FUNDED_STATUS}.
 * @returns {JSON[]} A decompressed list of JSON objects, representing the features in a {@link GeoJSON} object.
 */
function decompressFeatures(compressedFeatures) {
    return compressedFeatures.map(compressedFeature => {
        let decompressed = {
            'type': 'Feature',
            'properties': {
                'title': compressedFeature.title
            },
            'geometry': {
                'type': 'Point',
                'coordinates': compressedFeature.coordinates
            }
        };
        if (compressedFeature.description !== undefined) decompressed.properties["description"] = compressedFeature.description;
        if (compressedFeature.websiteURL !== undefined && compressedFeature.websiteURL !== "") decompressed.properties["websiteURL"] = compressedFeature.websiteURL;
        if (compressedFeature.focusArea !== undefined) decompressed.properties["focusArea"] = compressedFeature.focusArea;
        if (compressedFeature.fundedStatus !== undefined) decompressed.properties["fundedStatus"] = compressedFeature.fundedStatus;
        // Remember to add a new line here for every new property added to the features
        return decompressed;
    });
}

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-98.5795, 39.8283],
    zoom: 3,
    maxZoom: 8,
    minZoom: 3,
    interactive: true,
});
const filterGroup = document.getElementById("filter-group");
const defaultSize = 15;
map.on('load', () => {
    /**
     * @type {mapboxgl.Popup[]}
     */
    const popups = [];
    // Add a mask layer to hide everything outside the US
    const stateColor = '#85283B';
    const INCLUDE_STATE_BORDERS = true;
    const stateBoundaryColor = '#F8FDFB';
    addUSMask(stateColor, INCLUDE_STATE_BORDERS, stateBoundaryColor);
    addUSRegions();

    map.addSource('places', {
        'type': 'geojson',
        'data': geojson,
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 50,
    });

    // Add clusters
    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6', 10,
                '#f1f075', 20,
                '#f28cb1' // Default color
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                20, 5,
                25, 10,
                30, 15,
                35, 20,
                40, 25,
                45, 30,
                40 // Default size
            ]
        }
    });

    // Add the count to the clusters
    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    // Add individual points
    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'match',
                ['get', 'focusArea'],
                FOCUS_AREAS.COMMUNITY, '#FF6347',
                FOCUS_AREAS.EDUCATION, '#FFD700',
                FOCUS_AREAS.ENVRIONMENT, '#32CD32',
                FOCUS_AREAS.HEALTH, '#1E90FF',
                '#51bbd6' // default color
            ],
            'circle-radius': [
                'coalesce',
                ['get', 'size'],
                defaultSize // Default
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });
    /**
     * @param {mapboxgl.GeoJSONFeature} feature The feature to create a popup for.
     * @returns {mapboxgl.Popup} The pop up, not added to a map.
     */
    function createPopupForFeature(feature) {
        const coordinates = feature.geometry.coordinates;
        const title = `<strong>${feature.properties.title}</strong>`;
        const description = feature.properties.description ? `<p>${feature.properties.description}</p>` : "";
        const website = feature.properties.websiteURL ? `<p><a href="${feature.properties.websiteURL}">Website</a></p>` : "";
        const popup = new mapboxgl.Popup().setLngLat(coordinates).setHTML(title + description + website).addTo(map);
        popups.push(popup);
        return popup;
    }

    /**
     * Clears all the popups in {@link popups}
     */
    function clearAllPopups() {
        popups.forEach(popup => popup.remove());
    }

    function updateLayerFilter() {
        const checkedSymbols = [...document.getElementById("filter-group").getElementsByTagName('input')]
            .filter((input) => input.checked)
            .map((input) => input.id);

        const propertiesToFilter = ['fundedStatus', 'focusArea'];

        const filteredData = {
            ...geojson,
            features: geojson.features.filter(feature => {
                return propertiesToFilter.every(property => {
                    const value = feature.properties[property];
                    return value === undefined || checkedSymbols.includes(value);
                });
            })
        };

        // Update the data source with the filtered data
        map.getSource('places').setData(filteredData);

        // Force a re-clustering by resetting the source
        map.getSource('places').cluster = true;
        map.getSource('places').clusterMaxZoom = 4;
        map.getSource('places').clusterRadius = 50;

        setTimeout(updateVisibleFeatures, 20);
    }

    // Get all the unique focus areas
    createFilterNavbar(updateLayerFilter);

    function updateVisibleFeatures() {
        let visibleFeatures = map.queryRenderedFeatures({
            layers: ['unclustered-point']
        });

        // Use a Set to track unique feature identifiers (coordinates + title)
        const uniqueFeatureKeys = new Set();
        const uniqueFeatures = visibleFeatures.filter(feature => {
            const key = `${feature.geometry.coordinates}-${feature.properties.title}`;
            if (uniqueFeatureKeys.has(key)) {
                return false;
            } else {
                uniqueFeatureKeys.add(key);
                return true;
            }
        });

        // Update the feature listing
        const featureListing = document.getElementById('feature-listing');
        featureListing.innerHTML = ''; // Clear previous listings

        uniqueFeatures.forEach(feature => {
            if (feature.properties.title === undefined) return;
            const featureItem = document.createElement('a');
            featureItem.href = '#';
            featureItem.textContent = feature.properties.title;

            featureItem.addEventListener('click', () => {
                map.easeTo({
                    center: feature.geometry.coordinates,
                    duration: 1000
                });
                clearAllPopups();
                createPopupForFeature(feature);
            });
            featureListing.appendChild(featureItem);
        });
    }

    createMapEventListeners(createPopupForFeature, updateVisibleFeatures);
});

/**
 * Creates the event listeners for {@link map}
 * @param {Function} createPopupForFeature
 * @param {Function} updateVisibleFeatures 
 */
function createMapEventListeners(createPopupForFeature, updateVisibleFeatures) {
    map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });

        const clusterID = features[0].properties.cluster_id;
        map.getSource('places').getClusterExpansionZoom(clusterID, (err, zoom) => {
            if (err) return;
            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom,
            });
        });
    });

    map.on('click', 'unclustered-point', (e) => {
        createPopupForFeature(e.features[0]);
    });

    map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('movestart', () => {
        document.getElementById('feature-listing').innerHTML = '';
    });

    map.on('moveend', () => {
        setTimeout(updateVisibleFeatures, 10);
    });
}

/**
 * Adds a mask with the color {@linkcode stateColor}. Also adds state boundaries (with the color being {@linkcode stateBoundaryColor})
 * if {@linkcode includeStateBorders} is `true`.
 * @param {string} [stateColor = '#85283B'] The fill color of the states in the map.
 * @param {boolean} [includeStateBorders = true] A flag representing if the state borders should be included.
 * @param {string} [stateBoundaryColor = '#F8FDFB'] The color between the states on the map.
 */
function addUSMask(stateColor = '#85283B', includeStateBorders = true, stateBoundaryColor = '#F8FDFB') {
    map.addSource('us-mask', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
    });

    map.addLayer({
        'id': 'us-mask',
        'type': 'fill',
        'source': 'us-mask',
        'paint': {
            'fill-color': (includeStateBorders ? '#fff' : stateColor), // Mask color
            'fill-opacity': 1
        }
    });

    if (includeStateBorders) {
        // Redundant as this is exactly what the us-mask layer does, but this allows for
        // the changing of opacity
        map.addLayer({
            'id': 'state-fills',
            'type': 'fill',
            'source': 'us-mask',
            'paint': {
                'fill-color': stateColor, // Solid color for states
                'fill-opacity': 1
            }
        });

        map.addLayer({
            'id': 'state-borders',
            'type': 'line',
            'source': 'us-mask',
            'paint': {
                'line-color': stateBoundaryColor, // Color of boundary lines
                'line-width': 1
            }
        });
    }
}


function createFilterNavbar(updateLayerFilter) {
    addOptionsToNavbar(FOCUS_AREAS, updateLayerFilter);
    addOptionsToNavbar(FUNDED_STATUS, updateLayerFilter);
}

/**
 * @param {Object.<string, string>} optionsObj An object representing the options, with their values as strings.
 * @param {Function} onChangeFn The function to call when a change is made.
 * @returns {HTMLInputElement[]} A list of the elements added.
 */
function addOptionsToNavbar(optionsObj, onChangeFn) {
    /**
     * @type {string[]}
     */
    const symbols = [...new Set(Object.values(optionsObj))];
    const addedInputs = [];

    const containerDiv = document.createElement('div');
    containerDiv.className = "filterGroupContainer";
    for (const symbol of symbols) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = symbol;
        input.checked = true;
        containerDiv.appendChild(input);

        const label = document.createElement('label');
        label.setAttribute('for', symbol);
        label.textContent = symbol;
        containerDiv.appendChild(label);

        input.addEventListener('change', onChangeFn);
        addedInputs.push(input);
    }
    if (filterGroup.childElementCount > 0) {
        const hr = document.createElement('hr');
        filterGroup.appendChild(hr);
    }
    filterGroup.appendChild(containerDiv);
    return addedInputs;
}

function addUSRegions() {
    map.addSource('midwest', {
        'type': 'geojson',
        'data': 'https://raw.githubusercontent.com/scdoshi/us-geojson/1ab3109e8585a21f59b942045b15da015f157c9c/geojson/region/Midwest.geojson'
    });
    map.addSource('northeast', {
        'type': 'geojson',
        'data': 'https://raw.githubusercontent.com/scdoshi/us-geojson/1ab3109e8585a21f59b942045b15da015f157c9c/geojson/region/Northeast.geojson'
    });
    map.addSource('south', {
        'type': 'geojson',
        'data': 'https://raw.githubusercontent.com/scdoshi/us-geojson/1ab3109e8585a21f59b942045b15da015f157c9c/geojson/region/South.geojson'
    });
    map.addSource('west', {
        'type': 'geojson',
        'data': 'https://raw.githubusercontent.com/scdoshi/us-geojson/1ab3109e8585a21f59b942045b15da015f157c9c/geojson/region/West.geojson'
    });

    map.addLayer({
        id: 'midwestMask',
        source: 'midwest',
        type: 'fill',
        paint: {
            'fill-color': '#BC3853',
            'fill-opacity': 0.9
        }
    });
    map.addLayer({
        id: 'northeastMask',
        source: 'northeast',
        type: 'fill',
        paint: {
            'fill-color': '#CB526A',
            'fill-opacity': 0.9
        }
    });
    map.addLayer({
        id: 'southMask',
        source: 'south',
        type: 'fill',
        paint: {
            'fill-color': '#D57285',
            'fill-opacity': 0.9
        }
    });
    map.addLayer({
        id: 'westMask',
        source: 'west',
        type: 'fill',
        paint: {
            'fill-color': '#8D2A3E',
            'fill-opacity': 0.9
        }
    });
}