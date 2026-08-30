window.SIR_CONFIG = {
  brand: "SIR Rens & Pleie",
  location: "Kongsberg",
  radiusKm: 40,
  phonePrimary: "+4793953581",
  phoneSecondary: "+4748689164",
  supabaseUrl: "https://twahxojwxxxzwapotdst.supabase.co",
  supabasePublishableKey: "sb_publishable_Sn-js7Zv4AngBQdon4e9Ng_VM9b_6Zt",
  vehicleLookupUrl: "",
  photoUploadUrl: "https://twahxojwxxxzwapotdst.supabase.co/functions/v1/order-photo-upload",
  masterQrPath: "./q/",
  reviewUrl: "",
  languages: ["no", "en", "ru"],
  pricing: {
    fullInterior: {
      "5": { light: 1690, medium: 1990, heavy: 2390 },
      "7": { light: 1990, medium: 2390, heavy: 2890 },
      "9": { light: 2290, medium: 2790, heavy: 3390 }
    },
    seat: { light: 250, medium: 300, heavy: 350, discountedSeatBase: 150, discountedPositions: [4, 7, 8] },
    ceiling: {
      "5": { light: 590, medium: 750, heavy: 950 },
      "7": { light: 690, medium: 850, heavy: 1050 },
      "9": { light: 790, medium: 950, heavy: 1150 }
    },
    sofa: {
      "2": { light: 500, medium: 600, heavy: 700 },
      "3": { light: 750, medium: 900, heavy: 1050 },
      "4": { light: 900, medium: 1100, heavy: 1300 },
      "5": { light: 1150, medium: 1400, heavy: 1650 }
    },
    armchair: { light: 400, medium: 500, heavy: 650 },
    mattressSingle: { light: 450, medium: 550, heavy: 700 },
    mattressDouble: { light: 650, medium: 800, heavy: 1000 },
    travel: [
      { maxKm: 10, price: 0 },
      { maxKm: 20, price: 150 },
      { maxKm: 30, price: 250 },
      { maxKm: 40, price: 350 }
    ],
    minimumMobileOrder: 750
  },
  referral: {
    referrerCredit: 200,
    newCustomerDiscount: 100,
    minimumOrder: 750
  }
};
