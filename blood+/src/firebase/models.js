
// MODEL: Center
// Collection: centers
/*
{
  center_id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  contact_phone: string,
  contact_email: string,
  program: string
}
*/

// MODEL: Blood Stock (subcollection)
// Subcollection: blood_stock
/*
{
  stock_id: string,
  blood_group: string,  // A+, A-, B+, etc.
  quantity: number
}
*/

// MODEL: User
// Collection: users
/*
{
  user_id: string,
  name: string,
  email: string,
  role: "donor" | "admin",
  blood_group: string
}
*/
