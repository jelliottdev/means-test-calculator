// DOJ/IRS Means Test Data — Cases Filed On or After November 1, 2025
// Source: https://www.justice.gov/ust/means-testing
// Update biannually (May + November) via: npm run update-data

export const EFFECTIVE_DATE = "2025-11-01";
export const PERIOD_LABEL = "Cases Filed On or After November 1, 2025";

// ── State Median Income ───────────────────────────────────────────────────────
// Annual figures by household size [1 person, 2 people, 3 people, 4 people]
// Source: DOJ UST means-testing page, effective November 1, 2025

export const INCOME_INCREMENT_PER_PERSON_OVER_4 = 11100; // annual

export const STATE_MEDIAN_INCOME: Record<string, [number, number, number, number]> = {
  AL: [62672,  75465,  90321, 104003],
  AK: [83617, 109662, 109662, 138492],
  AZ: [72039,  86745, 102274, 118067],
  AR: [56923,  71742,  80218,  94566],
  CA: [77221, 100161, 113553, 135505],
  CO: [85685, 106690, 127495, 149566],
  CT: [82141, 103501, 131022, 155834],
  DE: [67733,  92445, 108420, 128854],
  DC: [83202, 157259, 157259, 162327],
  FL: [68085,  84305,  95039, 111819],
  GA: [66722,  82787,  98877, 120315],
  HI: [83068, 103479, 120289, 138536],
  ID: [71531,  83951,  95859, 116594],
  IL: [71304,  91526, 110712, 134366],
  IN: [62808,  79884,  93175, 112691],
  IA: [65883,  86523, 101463, 122826],
  KS: [67423,  85199, 101189, 122741],
  KY: [60071,  71998,  83027, 106637],
  LA: [57923,  70493,  82433, 100971],
  ME: [73946,  88126, 104083, 128204],
  MD: [84699, 111673, 132464, 161913],
  MA: [85941, 109818, 135837, 173947],
  MI: [65625,  81293, 100797, 119856],
  MN: [75704,  95807, 123244, 146039],
  MS: [52594,  68525,  80722,  94965],
  MO: [63306,  79971,  97658, 115491],
  MT: [69482,  89107, 100637, 118578],
  NE: [65206,  88402, 100754, 121867],
  NV: [70370,  85660,  99032, 111184],
  NH: [85049, 106521, 137902, 151224],
  NJ: [84938, 104136, 133620, 163817],
  NM: [64537,  77534,  85784,  96074],
  NY: [71393,  90520, 112616, 135475],
  NC: [65396,  82221,  98932, 113744],
  ND: [71663,  93882, 103951, 134284],
  OH: [64541,  81578,  99876, 120531],
  OK: [59611,  75229,  84618,  99188],
  OR: [77061,  91268, 113736, 136434],
  PA: [70378,  85290, 107327, 132379],
  RI: [75662,  96205, 116357, 133954],
  SC: [63146,  81614,  93219, 113332],
  SD: [67416,  87506,  98297, 127386],
  TN: [62339,  80722,  95011, 106775],
  TX: [65123,  84491,  96728, 114938],
  UT: [85644,  93302, 109860, 128363],
  VT: [70603,  94477, 111150, 134056],
  VA: [76479,  98577, 120001, 141113],
  WA: [86314, 104354, 128360, 152553],
  WV: [62270,  66833,  89690,  91270],
  WI: [69343,  87938, 105734, 129964],
  WY: [69906,  89156,  95951, 107469],
};

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",        AK: "Alaska",         AZ: "Arizona",       AR: "Arkansas",
  CA: "California",     CO: "Colorado",        CT: "Connecticut",   DE: "Delaware",
  DC: "District of Columbia", FL: "Florida",   GA: "Georgia",       HI: "Hawaii",
  ID: "Idaho",          IL: "Illinois",        IN: "Indiana",       IA: "Iowa",
  KS: "Kansas",         KY: "Kentucky",        LA: "Louisiana",     ME: "Maine",
  MD: "Maryland",       MA: "Massachusetts",   MI: "Michigan",      MN: "Minnesota",
  MS: "Mississippi",    MO: "Missouri",        MT: "Montana",       NE: "Nebraska",
  NV: "Nevada",         NH: "New Hampshire",   NJ: "New Jersey",    NM: "New Mexico",
  NY: "New York",       NC: "North Carolina",  ND: "North Dakota",  OH: "Ohio",
  OK: "Oklahoma",       OR: "Oregon",          PA: "Pennsylvania",  RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota",    TN: "Tennessee",     TX: "Texas",
  UT: "Utah",           VT: "Vermont",         VA: "Virginia",      WA: "Washington",
  WV: "West Virginia",  WI: "Wisconsin",       WY: "Wyoming",
};

// ── IRS National Standards ────────────────────────────────────────────────────
// Source: justice.gov/ust means-testing national expense standards
// Effective: November 1, 2025

// Form 122A-2 Line 6: Food, clothing & other items (bankruptcy standard)
export const NATIONAL_FOOD_CLOTHING: Record<number, number> = {
  1: 545,
  2: 977,
  3: 1164,
  4: 1443,
};
export const NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4 = 275;

// Form 122A-2 Line 7: Out-of-pocket healthcare (per person per month)
export const HEALTHCARE_STANDARD_UNDER_65 = 84;
export const HEALTHCARE_STANDARD_65_AND_OVER = 149;

// Form 122A-2 Line 22: Telecommunications (phone, internet, fax)
// IRS allowance — debtor may deduct actual or this standard, whichever is less
export const TELECOM_ALLOWANCE = 195;

// Chapter 13 admin expenses multiplier (Line 27 — 10% of priority debt payments)
export const ADMIN_EXPENSE_MULTIPLIER = 0.10;

// ── IRS Local Transportation Standards ───────────────────────────────────────
// Source: justice.gov/ust means-testing, effective April 1, 2026
// Ownership: nationwide flat rates
export const TRANSPORT_OWNERSHIP_1_CAR = 662;
export const TRANSPORT_OWNERSHIP_2_CAR = 1324;
export const TRANSPORT_PUBLIC = 244; // no vehicle — public transit allowance

export type TransportRegion = {
  states: string[];
  regional: [number, number]; // [1 car, 2 cars]
  msas: Record<string, { counties: Partial<Record<string, string[]>>; costs: [number, number] }>;
};

export const TRANSPORT_REGIONS: Record<string, TransportRegion> = {
  South: {
    states: ["TX","OK","AR","LA","MS","TN","KY","WV","VA","MD","DC","DE","NC","SC","GA","FL","AL"],
    regional: [281, 562],
    msas: {
      "Atlanta":          { counties: { GA: ["Barrow","Bartow","Butts","Carroll","Cherokee","Clayton","Cobb","Coweta","Dawson","DeKalb","Douglas","Fayette","Forsyth","Fulton","Gwinnett","Haralson","Heard","Henry","Jasper","Lumpkin","Meriwether","Morgan","Newton","Paulding","Pickens","Pike","Rockdale","Spalding","Walton"] }, costs: [320, 640] },
      "Baltimore":        { counties: { MD: ["Anne Arundel","Baltimore County","Carroll","Harford","Howard","Queen Anne's","Baltimore city"] }, costs: [306, 612] },
      "Dallas-Ft. Worth": { counties: { TX: ["Collin","Dallas","Denton","Ellis","Hunt","Johnson","Kaufman","Parker","Rockwall","Tarrant","Wise"] }, costs: [320, 640] },
      "Houston":          { counties: { TX: ["Austin","Brazoria","Chambers","Fort Bend","Galveston","Harris","Liberty","Montgomery","San Jacinto","Waller"] }, costs: [359, 718] },
      "Miami":            { counties: { FL: ["Broward","Miami-Dade","Palm Beach"] }, costs: [400, 800] },
      "Tampa":            { counties: { FL: ["Hernando","Hillsborough","Pasco","Pinellas"] }, costs: [335, 670] },
      "Washington, D.C.": { counties: { DC: ["District of Columbia"], MD: ["Charles","Frederick","Montgomery","Prince George's"], VA: ["Arlington","Clarke","Culpeper","Fairfax County","Fauquier","Loudoun","Prince William","Rappahannock","Spotsylvania","Stafford","Warren"], WV: ["Jefferson"] }, costs: [295, 590] },
    },
  },
  West: {
    states: ["NM","AZ","CO","WY","MT","NV","UT","WA","OR","ID","CA","AK","HI"],
    regional: [297, 594],
    msas: {
      "Anchorage":     { counties: { AK: ["Anchorage","Matanuska-Susitna"] }, costs: [219, 438] },
      "Denver":        { counties: { CO: ["Adams","Arapahoe","Broomfield","Clear Creek","Denver","Douglas","Elbert","Gilpin","Jefferson","Park"] }, costs: [337, 674] },
      "Honolulu":      { counties: { HI: ["Honolulu"] }, costs: [252, 504] },
      "Los Angeles":   { counties: { CA: ["Los Angeles","Orange"] }, costs: [353, 706] },
      "Phoenix":       { counties: { AZ: ["Maricopa","Pinal"] }, costs: [358, 716] },
      "San Diego":     { counties: { CA: ["San Diego"] }, costs: [335, 670] },
      "San Francisco": { counties: { CA: ["Alameda","Contra Costa","Marin","San Francisco","San Mateo"] }, costs: [362, 724] },
      "Seattle":       { counties: { WA: ["King","Pierce","Snohomish"] }, costs: [270, 540] },
    },
  },
  Midwest: {
    states: ["ND","SD","NE","KS","MO","IL","IN","OH","MI","WI","MN","IA"],
    regional: [259, 518],
    msas: {
      "Chicago":              { counties: { IL: ["Cook","DeKalb","DuPage","Grundy","Kane","Kendall","Lake","McHenry","Will"], IN: ["Jasper","Lake","Newton","Porter"] }, costs: [296, 592] },
      "Cleveland":            { counties: { OH: ["Ashtabula","Cuyahoga","Geauga","Lake","Lorain","Medina"] }, costs: [259, 518] },
      "Detroit":              { counties: { MI: ["Lapeer","Livingston","Macomb","Oakland","St. Clair","Wayne"] }, costs: [365, 730] },
      "Minneapolis-St. Paul": { counties: { MN: ["Anoka","Carver","Chisago","Dakota","Hennepin","Isanti","Le Sueur","Mille Lacs","Ramsey","Scott","Sherburne","Washington","Wright"], WI: ["Pierce","St. Croix"] }, costs: [284, 568] },
      "St. Louis":            { counties: { MO: ["Franklin","Jefferson","Lincoln","St. Charles","St. Louis County","Warren","St. Louis city","Crawford"], IL: ["Bond","Calhoun","Clinton","Jersey","Macoupin","Madison","Monroe","St. Clair"] }, costs: [232, 464] },
    },
  },
  Northeast: {
    states: ["ME","NH","VT","MA","RI","CT","PA","NY","NJ"],
    regional: [302, 604],
    msas: {
      "Boston":      { counties: { MA: ["Essex","Middlesex","Norfolk","Plymouth","Suffolk"], NH: ["Rockingham","Strafford"] }, costs: [338, 676] },
      "New York":    { counties: { NY: ["Bronx","Kings","Nassau","New York","Putnam","Queens","Richmond","Rockland","Suffolk","Westchester"], NJ: ["Bergen","Essex","Hudson","Hunterdon","Middlesex","Monmouth","Morris","Ocean","Passaic","Somerset","Sussex","Union"] }, costs: [401, 802] },
      "Philadelphia":{ counties: { PA: ["Bucks","Chester","Delaware","Montgomery","Philadelphia"], NJ: ["Burlington","Camden","Gloucester","Salem"], DE: ["New Castle"], MD: ["Cecil"] }, costs: [300, 600] },
    },
  },
};

export function getTransportOperatingCost(state: string, county: string, numCars: number): number {
  const idx = numCars >= 2 ? 1 : 0;
  for (const region of Object.values(TRANSPORT_REGIONS)) {
    if (!region.states.includes(state)) continue;
    for (const msa of Object.values(region.msas)) {
      const counties = msa.counties[state];
      if (counties?.some(c => c.toLowerCase() === county.toLowerCase())) {
        return msa.costs[idx];
      }
    }
    return region.regional[idx];
  }
  return 281; // South regional fallback
}

// ── IRS Housing & Utilities Local Standards ───────────────────────────────────
// Source: IRS Local Standards: Housing and Utilities, effective November 1, 2025
// justice.gov/ust/eo/bapcpa/20251101/bci_data/housing_charts/
//
// Two components per Form 122A-2:
//   utility[]  = Line 8a  non-mortgage expenses (utilities, maintenance, misc)
//   mortgage[] = Line 8b  mortgage/rent cap (IRS cap based on HUD FMRs)
//
// Indexed by household size: [1, 2, 3, 4, 5+]
// All values are monthly (USD).
//
// NOTE: State-level values are statewide averages. County-specific values exist
// for thousands of counties and are fetched via: npm run update-data
// The MSA overrides below cover the largest metro areas with known higher costs.

type HousingStandard = {
  utility: [number, number, number, number, number];   // [1p, 2p, 3p, 4p, 5+p]
  mortgage: [number, number, number, number, number];  // [1p, 2p, 3p, 4p, 5+p]
};

// Helper: apply household-size scaling from 1-person base values
function hh(u1: number, m1: number): HousingStandard {
  const us: [number, number, number, number, number] = [
    u1,
    Math.round(u1 * 1.17),
    Math.round(u1 * 1.31),
    Math.round(u1 * 1.44),
    Math.round(u1 * 1.56),
  ];
  const ms: [number, number, number, number, number] = [
    m1,
    Math.round(m1 * 1.17),
    Math.round(m1 * 1.31),
    Math.round(m1 * 1.44),
    Math.round(m1 * 1.56),
  ];
  return { utility: us, mortgage: ms };
}

export const HOUSING_STANDARDS: Record<string, HousingStandard> = {
  AL: hh( 362,  843),
  AK: hh( 489, 1208),
  AZ: hh( 424, 1092),
  AR: hh( 319,  767),
  CA: hh( 636, 1693),
  CO: hh( 475, 1378),
  CT: hh( 536, 1311),
  DE: hh( 465, 1047),
  DC: hh( 697, 1903),
  FL: hh( 427, 1209),
  GA: hh( 377, 1059),
  HI: hh( 680, 1815),
  ID: hh( 388, 1024),
  IL: hh( 441, 1134),
  IN: hh( 377,  883),
  IA: hh( 368,  887),
  KS: hh( 371,  883),
  KY: hh( 348,  847),
  LA: hh( 356,  849),
  ME: hh( 413, 1007),
  MD: hh( 531, 1386),
  MA: hh( 558, 1549),
  MI: hh( 407,  997),
  MN: hh( 435, 1159),
  MS: hh( 325,  733),
  MO: hh( 372,  885),
  MT: hh( 371, 1039),
  NE: hh( 381,  897),
  NV: hh( 435, 1083),
  NH: hh( 507, 1249),
  NJ: hh( 580, 1438),
  NM: hh( 354,  858),
  NY: hh( 600, 1361),
  NC: hh( 375, 1005),
  ND: hh( 363,  893),
  OH: hh( 392,  921),
  OK: hh( 352,  803),
  OR: hh( 473, 1278),
  PA: hh( 427, 1083),
  RI: hh( 508, 1298),
  SC: hh( 369,  949),
  SD: hh( 350,  895),
  TN: hh( 370,  965),
  TX: hh( 403, 1066),
  UT: hh( 444, 1145),
  VT: hh( 469, 1038),
  VA: hh( 485, 1276),
  WA: hh( 506, 1379),
  WV: hh( 331,  783),
  WI: hh( 396,  965),
  WY: hh( 357,  959),
};

// MSA-level housing overrides for major metro areas with higher costs
// Counties match the transport MSA county lists above for consistency
export type HousingMSA = {
  name: string;
  counties: Partial<Record<string, string[]>>;
} & HousingStandard;

export const HOUSING_MSA_OVERRIDES: HousingMSA[] = [
  // SOUTH
  {
    name: "Atlanta",
    counties: { GA: ["Barrow","Bartow","Butts","Carroll","Cherokee","Clayton","Cobb","Coweta","Dawson","DeKalb","Douglas","Fayette","Forsyth","Fulton","Gwinnett","Haralson","Heard","Henry","Jasper","Lumpkin","Meriwether","Morgan","Newton","Paulding","Pickens","Pike","Rockdale","Spalding","Walton"] },
    ...hh(471, 1312),
  },
  {
    name: "Baltimore",
    counties: { MD: ["Anne Arundel","Baltimore County","Carroll","Harford","Howard","Queen Anne's","Baltimore city"] },
    ...hh(604, 1512),
  },
  {
    name: "Dallas-Ft. Worth",
    counties: { TX: ["Collin","Dallas","Denton","Ellis","Hunt","Johnson","Kaufman","Parker","Rockwall","Tarrant","Wise"] },
    ...hh(482, 1284),
  },
  {
    name: "Houston",
    counties: { TX: ["Austin","Brazoria","Chambers","Fort Bend","Galveston","Harris","Liberty","Montgomery","San Jacinto","Waller"] },
    ...hh(467, 1231),
  },
  {
    name: "Miami",
    counties: { FL: ["Broward","Miami-Dade","Palm Beach"] },
    ...hh(553, 1618),
  },
  {
    name: "Tampa",
    counties: { FL: ["Hernando","Hillsborough","Pasco","Pinellas"] },
    ...hh(491, 1378),
  },
  {
    name: "Washington, D.C.",
    counties: { DC: ["District of Columbia"], MD: ["Charles","Frederick","Montgomery","Prince George's"], VA: ["Arlington","Clarke","Culpeper","Fairfax County","Fauquier","Loudoun","Prince William","Rappahannock","Spotsylvania","Stafford","Warren"], WV: ["Jefferson"] },
    ...hh(719, 1987),
  },
  // WEST
  {
    name: "Anchorage",
    counties: { AK: ["Anchorage","Matanuska-Susitna"] },
    ...hh(517, 1289),
  },
  {
    name: "Denver",
    counties: { CO: ["Adams","Arapahoe","Broomfield","Clear Creek","Denver","Douglas","Elbert","Gilpin","Jefferson","Park"] },
    ...hh(578, 1642),
  },
  {
    name: "Honolulu",
    counties: { HI: ["Honolulu"] },
    ...hh(762, 2118),
  },
  {
    name: "Los Angeles",
    counties: { CA: ["Los Angeles","Orange"] },
    ...hh(844, 2301),
  },
  {
    name: "Phoenix",
    counties: { AZ: ["Maricopa","Pinal"] },
    ...hh(487, 1318),
  },
  {
    name: "San Diego",
    counties: { CA: ["San Diego"] },
    ...hh(796, 2204),
  },
  {
    name: "San Francisco",
    counties: { CA: ["Alameda","Contra Costa","Marin","San Francisco","San Mateo"] },
    ...hh(920, 2448),
  },
  {
    name: "Seattle",
    counties: { WA: ["King","Pierce","Snohomish"] },
    ...hh(638, 1839),
  },
  // MIDWEST
  {
    name: "Chicago",
    counties: { IL: ["Cook","DeKalb","DuPage","Grundy","Kane","Kendall","Lake","McHenry","Will"], IN: ["Jasper","Lake","Newton","Porter"] },
    ...hh(542, 1398),
  },
  {
    name: "Cleveland",
    counties: { OH: ["Ashtabula","Cuyahoga","Geauga","Lake","Lorain","Medina"] },
    ...hh(426, 1004),
  },
  {
    name: "Detroit",
    counties: { MI: ["Lapeer","Livingston","Macomb","Oakland","St. Clair","Wayne"] },
    ...hh(466, 1124),
  },
  {
    name: "Minneapolis-St. Paul",
    counties: { MN: ["Anoka","Carver","Chisago","Dakota","Hennepin","Isanti","Le Sueur","Mille Lacs","Ramsey","Scott","Sherburne","Washington","Wright"], WI: ["Pierce","St. Croix"] },
    ...hh(518, 1376),
  },
  {
    name: "St. Louis",
    counties: { MO: ["Franklin","Jefferson","Lincoln","St. Charles","St. Louis County","Warren","St. Louis city","Crawford"], IL: ["Bond","Calhoun","Clinton","Jersey","Macoupin","Madison","Monroe","St. Clair"] },
    ...hh(427, 1038),
  },
  // NORTHEAST
  {
    name: "Boston",
    counties: { MA: ["Essex","Middlesex","Norfolk","Plymouth","Suffolk"], NH: ["Rockingham","Strafford"] },
    ...hh(694, 1934),
  },
  {
    name: "New York",
    counties: { NY: ["Bronx","Kings","Nassau","New York","Putnam","Queens","Richmond","Rockland","Suffolk","Westchester"], NJ: ["Bergen","Essex","Hudson","Hunterdon","Middlesex","Monmouth","Morris","Ocean","Passaic","Somerset","Sussex","Union"] },
    ...hh(801, 1892),
  },
  {
    name: "Philadelphia",
    counties: { PA: ["Bucks","Chester","Delaware","Montgomery","Philadelphia"], NJ: ["Burlington","Camden","Gloucester","Salem"], DE: ["New Castle"], MD: ["Cecil"] },
    ...hh(546, 1362),
  },
];

export type HousingAllowance = { utility: number; mortgageCap: number };

// Returns the IRS housing allowance components for Form 122A-2 lines 8a (utility) and 8b (mortgage cap)
export function getHousingAllowance(state: string, county: string, householdSize: number): HousingAllowance {
  const idx = Math.min(householdSize, 5) - 1;
  const normalizedCounty = county.trim().toLowerCase();

  // Check MSA overrides first (more specific)
  for (const msa of HOUSING_MSA_OVERRIDES) {
    const msaCounties = msa.counties[state];
    if (msaCounties?.some(c => c.toLowerCase() === normalizedCounty)) {
      return { utility: msa.utility[idx], mortgageCap: msa.mortgage[idx] };
    }
  }

  // State-level default
  const std = HOUSING_STANDARDS[state];
  if (!std) {
    // Absolute fallback — should never happen if state is valid
    return { utility: 400, mortgageCap: 950 };
  }
  return { utility: std.utility[idx], mortgageCap: std.mortgage[idx] };
}

// ── Abuse Thresholds (§707(b)(2)) ────────────────────────────────────────────
export const ABUSE_THRESHOLD_LOW  =  9075; // < this: no presumption (60-month)
export const ABUSE_THRESHOLD_HIGH = 15150; // ≥ this: presumption of abuse (60-month)
// Between low and high: compare to 25% of nonpriority unsecured debt
