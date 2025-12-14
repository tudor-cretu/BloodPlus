import { db } from "./firebaseConfig"; // Importăm db-ul de client, NU cel de admin
import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, SUBCOLLECTIONS } from "./firebaseCollections";

// Lista centrelor initiale
const Centers = [
  {
    center_id: "1",
    name: "Centrul de Transfuzie Sanguina Bucuresti",
    address: "Str. Constantin Caracas nr. 2, Sectorul 1, București",
    latitude: 44.387972,
    longitude: 26.081417,
    contact_phone: "031.405.36.60",
    contact_email: "secretariat@ctsbucuresti.ro",
    program: "L-V 07:30 - 13:30",
    stock: [
      { stock_id: "bg1", blood_group: "A+", quantity: 20 },
      { stock_id: "bg2", blood_group: "A-", quantity: 15 },
      { stock_id: "bg3", blood_group: "B+", quantity: 13 },
      { stock_id: "bg4", blood_group: "B-", quantity: 2 },
      { stock_id: "bg5", blood_group: "AB+", quantity: 7 },
      { stock_id: "bg6", blood_group: "AB-", quantity: 0 },
      { stock_id: "bg7", blood_group: "0+", quantity: 5 },
      { stock_id: "bg8", blood_group: "0-", quantity: 5 },
    ]
  },
  {
    center_id: "2",
    name: "Institutul Clinic Fundeni",
    address: "Soseaua Fundeni nr. 258, sector 2, Bucuresti,",
    latitude: 44.464792,
    longitude: 26.15417,
    contact_phone: "+40 21 275 0500",
    contact_email: "unitatetransfuziisanguine@icfundeni.ro",
    program: "L-V 07:30 - 13:30",
    stock: [
      { stock_id: "bg1", blood_group: "A+", quantity: 30 },
      { stock_id: "bg2", blood_group: "A-", quantity: 35 },
      { stock_id: "bg3", blood_group: "B+", quantity: 3 },
      { stock_id: "bg4", blood_group: "B-", quantity: 9 },
      { stock_id: "bg5", blood_group: "AB+", quantity: 1 },
      { stock_id: "bg6", blood_group: "AB-", quantity: 4 },
      { stock_id: "bg7", blood_group: "0+", quantity: 12},
      { stock_id: "bg8", blood_group: "0-", quantity: 0 },
    ]
  },
  {
    center_id: "3",
    name: "Spitalul Clinic de Urgenţă Floreasca",
    address: "Calea Floreasca nr. 8, Sector 1, Bucureşti",
    latitude: 44.45394241314453,
    longitude: 26.101618075887785,
    contact_phone: "021.599.23.00",
    contact_email: "spital@urgentafloreasca.ro",
    program: "L-V 07:30 - 13:30",
    stock: [
      { stock_id: "bg1", blood_group: "A+", quantity: 6 },
      { stock_id: "bg2", blood_group: "A-", quantity: 18 },
      { stock_id: "bg3", blood_group: "B+", quantity: 22 },
      { stock_id: "bg4", blood_group: "B-", quantity: 3 },
      { stock_id: "bg5", blood_group: "AB+", quantity: 30 },
      { stock_id: "bg6", blood_group: "AB-", quantity: 21 },
      { stock_id: "bg7", blood_group: "0+", quantity: 10 },
      { stock_id: "bg8", blood_group: "0-", quantity: 11 },
    ]
  },
  {
    center_id: "4",
    name: "Spitalul Universitar de Urgenţă Bucureşti",
    address: " Str. Splaiul Independenţei, nr. 169, Sector 5, Bucureşti",
    latitude: 44.436006,
    longitude: 26.072175,
    contact_phone: "021.318.05.23",
    contact_email: "secretariat@suub.ro",
    program: "L-V 08:00 - 13:00",
    stock: [
      { stock_id: "bg1", blood_group: "A+", quantity: 30 },
      { stock_id: "bg2", blood_group: "A-", quantity: 20 },
      { stock_id: "bg3", blood_group: "B+", quantity: 0 },
      { stock_id: "bg4", blood_group: "B-", quantity: 1 },
      { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
      { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
      { stock_id: "bg7", blood_group: "0+", quantity: 9 },
      { stock_id: "bg8", blood_group: "0-", quantity: 1 },
    ]
  }
  // {
  //   center_id: "5",
  //   name: "Centrul de Transfuzie Sanguină ''Col.Prof.Dr. Nicolae Nestorescu''",
  //   address: "Calea Plevnei 132a, 060011, Bucuresti, Romania",
  //   latitude: 44.442205,
  //   longitude: 26.073346,
  //   contact_phone: "+40 21 319 3051",
  //   contact_email: "UM_02379_Bucuresti@mapn.ro",
  //   program: "Luni- Vineri 07:00 - 15:00",
  //   stock: [
  //     { stock_id: "bg1", blood_group: "A+", quantity: 30 },
  //     { stock_id: "bg2", blood_group: "A-", quantity: 20 },
  //     { stock_id: "bg3", blood_group: "B+", quantity: 0 },
  //     { stock_id: "bg4", blood_group: "B-", quantity: 1 },
  //     { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
  //     { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
  //     { stock_id: "bg7", blood_group: "0+", quantity: 9 },
  //     { stock_id: "bg8", blood_group: "0-", quantity: 1 },
  //   ]
  // },
  // {
  //   center_id: "6",
  //   name: "Spitalul Clinic de Urgență Bagdasar - Arseni",
  //   address: "Șoseaua Berceni nr. 12, Sector 4, cod 041915, București",
  //   latitude: 44.384324,
  //   longitude: 26.130279,
  //   contact_phone: "+4021 334 73 50",
  //   contact_email: "directie@bagdasar-arseni.ro",
  //   program: "L-V 08:00-13:00",
  //   stock: [
  //     { stock_id: "bg1", blood_group: "A+", quantity: 30 },
  //     { stock_id: "bg2", blood_group: "A-", quantity: 20 },
  //     { stock_id: "bg3", blood_group: "B+", quantity: 0 },
  //     { stock_id: "bg4", blood_group: "B-", quantity: 1 },
  //     { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
  //     { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
  //     { stock_id: "bg7", blood_group: "0+", quantity: 9 },
  //     { stock_id: "bg8", blood_group: "0-", quantity: 1 },
  //   ]
  // },
  // {
  //   center_id: "7",
  //   name: "Spitalul de Urgență ''Prof. Dr. Dimitrie Gerota''",
  //   address: "Str. Vasile Vasilievici Stroescu nr. 29-31, Sector 2, Bucuresti",
  //   latitude: 44.44045868834815,
  //   longitude: 26.12350107858168,
  //   contact_phone: "(021) 303.70.80",
  //   contact_email: "dspital.gerota@mai.gov.ro",
  //   program: "L-V 08:00-13:00",
  //   stock: [
  //     { stock_id: "bg1", blood_group: "A+", quantity: 30 },
  //     { stock_id: "bg2", blood_group: "A-", quantity: 20 },
  //     { stock_id: "bg3", blood_group: "B+", quantity: 0 },
  //     { stock_id: "bg4", blood_group: "B-", quantity: 1 },
  //     { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
  //     { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
  //     { stock_id: "bg7", blood_group: "0+", quantity: 9 },
  //     { stock_id: "bg8", blood_group: "0-", quantity: 1 },
  //   ]
  // },
  // {
  //   center_id: "8",
  //   name: "Spitalul Universitar de Urgenţă Elias",
  //   address: "Bd. Marasti nr. 17, Sector 1, Bucuresti",
  //   latitude: 44.466074,
  //   longitude: 26.073602,
  //   contact_phone: "+40 21 316 1600",
  //   contact_email: "contact@spitalul-elias.ro",
  //   program: "L-V 08:00-13:00",
  //   stock: [
  //     { stock_id: "bg1", blood_group: "A+", quantity: 30 },
  //     { stock_id: "bg2", blood_group: "A-", quantity: 20 },
  //     { stock_id: "bg3", blood_group: "B+", quantity: 0 },
  //     { stock_id: "bg4", blood_group: "B-", quantity: 1 },
  //     { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
  //     { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
  //     { stock_id: "bg7", blood_group: "0+", quantity: 9 },
  //     { stock_id: "bg8", blood_group: "0-", quantity: 1 },
  //   ]
  // },
  // {
  //   center_id: "9",
  //   name: "Spitalul Clinic de Urgenta Chirurgie Plastica, Reparatorie si Arsuri",
  //   address: "Griviţei, Nr 218 218 010011 Bucureşti",
  //   latitude: 44.464063,
  //   longitude: 26.05598,
  //   contact_phone: "+40 21 316 1600",
  //   contact_email: "secretariat@arsuri.ro",
  //   program: "L-V 08:00-13:00",
  //   stock: [
  //     { stock_id: "bg1", blood_group: "A+", quantity: 30 },
  //     { stock_id: "bg2", blood_group: "A-", quantity: 20 },
  //     { stock_id: "bg3", blood_group: "B+", quantity: 0 },
  //     { stock_id: "bg4", blood_group: "B-", quantity: 1 },
  //     { stock_id: "bg5", blood_group: "AB+", quantity: 10 },
  //     { stock_id: "bg6", blood_group: "AB-", quantity: 5 },
  //     { stock_id: "bg7", blood_group: "0+", quantity: 9 },
  //     { stock_id: "bg8", blood_group: "0-", quantity: 1 },
  //   ]
  // }
];

export const seedCenters = async () => {
  try {
    console.log("Începe popularea...");
    for (const center of Centers) {
      // 1. Referința către documentul centrului (folosind sintaxa modulară v9)
      const centerRef = doc(db, COLLECTIONS.CENTERS, center.center_id);

      // Separăm datele centrului de stoc
      const { stock, ...centerData } = center;

      // 2. Salvăm datele centrului
      await setDoc(centerRef, centerData);

      // 3. Salvăm subcolecția blood_stock
      if (stock) {
        for (const s of stock) {
          const stockRef = doc(db, COLLECTIONS.CENTERS, center.center_id, SUBCOLLECTIONS.BLOOD_STOCK, s.stock_id);
          await setDoc(stockRef, s);
        }
      }
    }
    console.log("✅ Centrele au fost încărcate cu succes în Firestore!");
    alert("Datele au fost populate! Verifică Firebase Console.");
  } catch (e) {
    console.error("❌ Eroare la populare:", e);
  }
};