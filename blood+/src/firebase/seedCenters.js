import { db } from "./firebaseConfig";
import { collection, doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, SUBCOLLECTIONS } from "./firebaseCollections";

// Lista centrelor inițiale
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
];

export const seedCenters = async () => {
  for (const center of Centers) {
    const centerRef = doc(collection(db, COLLECTIONS.CENTERS), center.center_id);

    // Creăm documentul centru
    await setDoc(centerRef, {
      center_id: center.center_id,
      name: center.name,
      address: center.address,
      latitude: center.latitude,
      longitude: center.longitude,
      contact_phone: center.contact_phone,
      contact_email: center.contact_email,
      program: center.program
    });

    // Creăm subcolecția blood_stock
    for (const s of center.stock) {
      const stockRef = doc(collection(centerRef, SUBCOLLECTIONS.BLOOD_STOCK), s.stock_id);
      await setDoc(stockRef, s);
    }
  }

  console.log("Centerele au fost încărcate în Firestore!");
};
