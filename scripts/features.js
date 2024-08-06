/**
 * @enum {string}
 */
export const FOCUS_AREAS = Object.freeze({
    ENVRIONMENT: "ENVIRONMENT",
    HEALTH: "HEALTH",
    COMMUNITY: "COMMUNITY",
    EDUCATION: "EDUCATION"
});

/**
 * @enum {string}
 */
export const FUNDED_STATUS = Object.freeze({
    INCUBATOR: "INCUBATOR",
    PITCHED: "PITCHED",
    FUNDED: "FUNDED"
});

/**
 * Only required features are `title` and `coordinates`. Note that `coordinates` is in the form `[LONGITUDE, LATITUDE]`
 * @see {@link https://www.gps-coordinates.net/} for converting addresses to coordinates.
 * @see {@link decompressFeatures} Whenever adding a new property to the features, remember to add it to the decompressor.
 */
export const features = [
    {
        'title': 'White House',
        'description': "This is the white house",
        'websiteURL': 'https://www.whitehouse.gov/',
        'focusArea': FOCUS_AREAS.EDUCATION,
        'fundedStatus': FUNDED_STATUS.FUNDED,
        'coordinates': [-77.036560, 38.897957],
    },
    {
        'title': 'The Pentagon',
        'description': "This is the pentagon",
        'websiteURL': 'https://www.defense.gov/',
        'focusArea': FOCUS_AREAS.EDUCATION,
        'fundedStatus': FUNDED_STATUS.FUNDED,
        'coordinates': [-77.031959, 38.89037],
    },
]