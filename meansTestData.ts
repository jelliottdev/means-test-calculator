// DOJ Means Test Data — Cases Filed On or After November 1, 2025
// Source: https://www.justice.gov/ust/means-testing
// Update biannually (May + November) from justice.gov/ust/means-testing

export const EFFECTIVE_DATE = "2025-11-01";
export const PERIOD_LABEL = "Cases Filed On or After November 1, 2025";

// Per-person increment for household size > 4
export const INCOME_INCREMENT_PER_PERSON_OVER_4 = 11100;

// Annual median family income by state and household size
export const STATE_MEDIAN_INCOME: Record<string, [number, number, number, number]> = {
  // [1 person, 2 people, 3 people, 4 people]
  AL: [62672, 75465, 90321, 104003],
  AK: [83617, 109662, 109662, 138492],
  AZ: [72039, 86745, 102274, 118067],
  AR: [56923, 71742, 80218, 94566],
  CA: [77221, 100161, 113553, 135505],
  CO: [85685, 106690, 127495, 149566],
  CT: [82141, 103501, 131022, 155834],
  DE: [67733, 92445, 108420, 128854],
  DC: [83202, 157259, 157259, 162327],
  FL: [68085, 84305, 95039, 111819],
  GA: [66722, 82787, 98877, 120315],
  HI: [83068, 103479, 120289, 138536],
  ID: [71531, 83951, 95859, 116594],
  IL: [71304, 91526, 110712, 134366],
  IN: [62808, 79884, 93175, 112691],
  IA: [65883, 86523, 101463, 122826],
  KS: [67423, 85199, 101189, 122741],
  KY: [60071, 71998, 83027, 106637],
  LA: [57923, 70493, 82433, 100971],
  ME: [73946, 88126, 104083, 128204],
  MD: [84699, 111673, 132464, 161913],
  MA: [85941, 109818, 135837, 173947],
  MI: [65625, 81293, 100797, 119856],
  MN: [75704, 95807, 123244, 146039],
  MS: [52594, 68525, 80722, 94965],
  MO: [63306, 79971, 97658, 115491],
  MT: [69482, 89107, 100637, 118578],
  NE: [65206, 88402, 100754, 121867],
  NV: [70370, 85660, 99032, 111184],
  NH: [85049, 106521, 137902, 151224],
  NJ: [84938, 104136, 133620, 163817],
  NM: [64537, 77534, 85784, 96074],
  NY: [71393, 90520, 112616, 135475],
  NC: [65396, 82221, 98932, 113744],
  ND: [71663, 93882, 103951, 134284],
  OH: [64541, 81578, 99876, 120531],
  OK: [59611, 75229, 84618, 99188],
  OR: [77061, 91268, 113736, 136434],
  PA: [70378, 85290, 107327, 132379],
  RI: [75662, 96205, 116357, 133954],
  SC: [63146, 81614, 93219, 113332],
  SD: [67416, 87506, 98297, 127386],
  TN: [62339, 80722, 95011, 106775],
  TX: [65123, 84491, 96728, 114938],
  UT: [85644, 93302, 109860, 128363],
  VT: [70603, 94477, 111150, 134056],
  VA: [76479, 98577, 120001, 141113],
  WA: [86314, 104354, 128360, 152553],
  WV: [62270, 66833, 89690, 91270],
  WI: [69343, 87938, 105734, 129964],
  WY: [69906, 89156, 95951, 107469],
};

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// IRS National Standards — Cases Filed May 15, 2025+
// Source: justice.gov/ust/eo/bapcpa/20250401/bci_data/national_expense_standards.htm
export const NATIONAL_STANDARDS_FOOD_CLOTHING: Record<number, number> = {
  1: 808,   // Food + clothing + misc combined
  2: 1411,
  3: 1677,
  4: 2027,
};
export const NATIONAL_STANDARDS_PER_PERSON_OVER_4 = 386;

// Bankruptcy-specific food & clothing (Form 122A-2 line 6)
export const NATIONAL_FOOD_CLOTHING: Record<number, number> = {
  1: 545,
  2: 977,
  3: 1164,
  4: 1443,
};
export const NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4 = 275;

// IRS Out-of-Pocket Healthcare Standards (per person per month)
export const HEALTHCARE_STANDARD_UNDER_65 = 84;
export const HEALTHCARE_STANDARD_65_AND_OVER = 149;

// IRS Local Transportation Standards — Cases Filed April 1, 2026+
// Ownership: nationwide
export const TRANSPORT_OWNERSHIP_1_CAR = 662;
export const TRANSPORT_OWNERSHIP_2_CAR = 1324;
export const TRANSPORT_PUBLIC = 244; // nationwide public transit allowance

// Operating costs by region/MSA { region: [1 car, 2 cars] }
export type TransportRegion = {
  states: string[];
  regional: [number, number];
  msas: Record<string, { counties: Partial<Record<string, string[]>>; costs: [number, number] }>;
};

export const TRANSPORT_REGIONS: Record<string, TransportRegion> = {
  South: {
    states: ["TX","OK","AR","LA","MS","TN","KY","WV","VA","MD","DC","DE","NC","SC","GA","FL","AL"],
    regional: [281, 562],
    msas: {
      "Atlanta":        { counties: { GA: ["Barrow","Bartow","Butts","Carroll","Cherokee","Clayton","Cobb","Coweta","Dawson","DeKalb","Douglas","Fayette","Forsyth","Fulton","Gwinnett","Haralson","Heard","Henry","Jasper","Lumpkin","Meriwether","Morgan","Newton","Paulding","Pickens","Pike","Rockdale","Spalding","Walton"] }, costs: [320, 640] },
      "Baltimore":      { counties: { MD: ["Anne Arundel","Baltimore County","Carroll","Harford","Howard","Queen Anne's","Baltimore city"] }, costs: [306, 612] },
      "Dallas-Ft. Worth": { counties: { TX: ["Collin","Dallas","Denton","Ellis","Hunt","Johnson","Kaufman","Parker","Rockwall","Tarrant","Wise"] }, costs: [320, 640] },
      "Houston":        { counties: { TX: ["Austin","Brazoria","Chambers","Fort Bend","Galveston","Harris","Liberty","Montgomery","San Jacinto","Waller"] }, costs: [359, 718] },
      "Miami":          { counties: { FL: ["Broward","Miami-Dade","Palm Beach"] }, costs: [400, 800] },
      "Tampa":          { counties: { FL: ["Hernando","Hillsborough","Pasco","Pinellas"] }, costs: [335, 670] },
      "Washington, D.C.": { counties: { DC: ["District of Columbia"], MD: ["Charles","Frederick","Montgomery","Prince George's"], VA: ["Arlington","Clarke","Culpeper","Fairfax County","Fauquier","Loudoun","Prince William","Rappahannock","Spotsylvania","Stafford","Warren"], WV: ["Jefferson"] }, costs: [295, 590] },
    },
  },
  West: {
    states: ["NM","AZ","CO","WY","MT","NV","UT","WA","OR","ID","CA","AK","HI"],
    regional: [297, 594],
    msas: {
      "Anchorage":    { counties: { AK: ["Anchorage","Matanuska-Susitna"] }, costs: [219, 438] },
      "Denver":       { counties: { CO: ["Adams","Arapahoe","Broomfield","Clear Creek","Denver","Douglas","Elbert","Gilpin","Jefferson","Park"] }, costs: [337, 674] },
      "Honolulu":     { counties: { HI: ["Honolulu"] }, costs: [252, 504] },
      "Los Angeles":  { counties: { CA: ["Los Angeles","Orange"] }, costs: [353, 706] },
      "Phoenix":      { counties: { AZ: ["Maricopa","Pinal"] }, costs: [358, 716] },
      "San Diego":    { counties: { CA: ["San Diego"] }, costs: [335, 670] },
      "San Francisco":{ counties: { CA: ["Alameda","Contra Costa","Marin","San Francisco","San Mateo"] }, costs: [362, 724] },
      "Seattle":      { counties: { WA: ["King","Pierce","Snohomish"] }, costs: [270, 540] },
    },
  },
  Midwest: {
    states: ["ND","SD","NE","KS","MO","IL","IN","OH","MI","WI","MN","IA"],
    regional: [259, 518],
    msas: {
      "Chicago":          { counties: { IL: ["Cook","DeKalb","DuPage","Grundy","Kane","Kendall","Lake","McHenry","Will"], IN: ["Jasper","Lake","Newton","Porter"] }, costs: [296, 592] },
      "Cleveland":        { counties: { OH: ["Ashtabula","Cuyahoga","Geauga","Lake","Lorain","Medina"] }, costs: [259, 518] },
      "Detroit":          { counties: { MI: ["Lapeer","Livingston","Macomb","Oakland","St. Clair","Wayne"] }, costs: [365, 730] },
      "Minneapolis-St. Paul": { counties: { MN: ["Anoka","Carver","Chisago","Dakota","Hennepin","Isanti","Le Sueur","Mille Lacs","Ramsey","Scott","Sherburne","Washington","Wright"], WI: ["Pierce","St. Croix"] }, costs: [284, 568] },
      "St. Louis":        { counties: { MO: ["Franklin","Jefferson","Lincoln","St. Charles","St. Louis County","Warren","St. Louis city","Crawford"], IL: ["Bond","Calhoun","Clinton","Jersey","Macoupin","Madison","Monroe","St. Clair"] }, costs: [232, 464] },
    },
  },
  Northeast: {
    states: ["ME","NH","VT","MA","RI","CT","PA","NY","NJ"],
    regional: [302, 604],
    msas: {
      "Boston":       { counties: { MA: ["Essex","Middlesex","Norfolk","Plymouth","Suffolk"], NH: ["Rockingham","Strafford"] }, costs: [338, 676] },
      "New York":     { counties: { NY: ["Bronx","Kings","Nassau","New York","Putnam","Queens","Richmond","Rockland","Suffolk","Westchester"], NJ: ["Bergen","Essex","Hudson","Hunterdon","Middlesex","Monmouth","Morris","Ocean","Passaic","Somerset","Sussex","Union"] }, costs: [401, 802] },
      "Philadelphia": { counties: { PA: ["Bucks","Chester","Delaware","Montgomery","Philadelphia"], NJ: ["Burlington","Camden","Gloucester","Salem"], DE: ["New Castle"], MD: ["Cecil"] }, costs: [300, 600] },
    },
  },
};

// Get transport operating cost for a state/county
export function getTransportOperatingCost(state: string, county: string, numCars: number): number {
  const carsIdx = numCars >= 2 ? 1 : 0;
  for (const [, region] of Object.entries(TRANSPORT_REGIONS)) {
    if (!region.states.includes(state)) continue;
    // Check MSAs first
    for (const [, msa] of Object.entries(region.msas)) {
      const stateCounties = msa.counties[state];
      if (stateCounties && stateCounties.some(c => c.toLowerCase() === county.toLowerCase())) {
        return msa.costs[carsIdx];
      }
    }
    return region.regional[carsIdx];
  }
  return 281; // fallback to South regional
}

// Housing stub — TODO: load from full county data file
// Returns monthly housing + utilities allowance
export function getHousingAllowance(state: string, _county: string, householdSize: number): number {
  // Placeholder averages by state (to be replaced with real county data)
  // Real data source: justice.gov/ust/eo/bapcpa/20250515/bci_data/housing_charts/
  const STATE_HOUSING_AVERAGES: Record<string, number[]> = {
    // [1, 2, 3, 4, 5+] person monthly allowances — approximate state averages
    CA: [2200, 2500, 2800, 3100, 3400],
    NY: [2100, 2400, 2700, 3000, 3300],
    TX: [1600, 1800, 2000, 2200, 2400],
    FL: [1700, 1900, 2100, 2300, 2500],
    WA: [1900, 2200, 2400, 2700, 2900],
    MA: [2100, 2400, 2700, 3000, 3200],
    CO: [1900, 2200, 2400, 2700, 2900],
    IL: [1600, 1800, 2000, 2200, 2400],
    // Default for other states
    DEFAULT: [1400, 1600, 1800, 2000, 2200],
  };
  const allowances = STATE_HOUSING_AVERAGES[state] || STATE_HOUSING_AVERAGES["DEFAULT"];
  const idx = Math.min(householdSize - 1, 4);
  return allowances[idx];
}

// 707(b)(2) abuse thresholds (§ 707(b)(2)(A)(i))
export const ABUSE_THRESHOLD_LOW = 9075;   // < this: no presumption (60-month)
export const ABUSE_THRESHOLD_HIGH = 15150; // >= this: presumption of abuse (60-month)
// Between low and high: compare to 25% of nonpriority unsecured debt
