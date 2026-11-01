// Sample restaurants for `npm run seed`.
// Generated from the demo data in the frontend (src/assets/assets.ts) so the
// server does not depend on the frontend folder. Edit freely.
//
// `ownerKey` decides which demo owner account runs the restaurant
// (owner001 → owner001@quickdine.example).

export interface SeedRestaurant {
    ownerKey: string;
    name: string;
    slug: string;
    description: string;
    cuisine: string;
    priceRange: "$" | "$$" | "$$$" | "$$$$";
    rating: number;
    reviewCount: number;
    location: string;
    address: string;
    image: string;
    chef: string;
    tags: string[];
    availableSlots: string[];
    totalSeats: number;
    featured: boolean;
    exclusive: boolean;
    status: "pending" | "approved" | "rejected";
}

export const seedRestaurants: SeedRestaurant[] = [
    {
        "ownerKey": "owner001",
        "name": "Amrik Sukhdev",
        "slug": "amrik-sukhdev",
        "description": "One of Murthal's most famous highway dining destinations, known for traditional North Indian food, stuffed parathas, dal makhani, and lassi.",
        "cuisine": "North Indian",
        "priceRange": "$$",
        "rating": 4.3,
        "reviewCount": 1200,
        "location": "Murthal, Sonipat",
        "address": "52nd Milestone, Grand Trunk Road, Murthal, Sonipat, Haryana 131039",
        "image": "/restaurants/amrik-sukhdev.jpg",
        "chef": "Traditional Indian Kitchen",
        "tags": [
            "Parathas",
            "Punjabi Food",
            "Highway Restaurant"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 100,
        "featured": true,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner004",
        "name": "Neelkanth Star",
        "slug": "neelkanth-star",
        "description": "A large highway restaurant in the Murthal area offering North Indian meals and a spacious dining experience for families and travellers.",
        "cuisine": "North Indian",
        "priceRange": "$$",
        "rating": 4.3,
        "reviewCount": 3400,
        "location": "Murthal, Sonipat",
        "address": "Kurar Ibrahimpur, Sonipat, Haryana 131039",
        "image": "/restaurants/neelkanth-star.jpg",
        "chef": "Neelkanth Kitchen",
        "tags": [
            "North Indian",
            "Family Restaurant",
            "Highway Dining"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 100,
        "featured": false,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner005",
        "name": "Bella Nosh Cafe & Lounge",
        "slug": "bella-nosh-cafe-lounge",
        "description": "A contemporary cafe and lounge on Murthal Road offering a multi-cuisine menu, starters, Indian dishes, Chinese food, and desserts.",
        "cuisine": "Multi-Cuisine",
        "priceRange": "$$$",
        "rating": 4.5,
        "reviewCount": 1150,
        "location": "Murthal Road, Sonipat",
        "address": "Murthal Road, Rajiv Gandhi Colony, Sonipat, Haryana 131001",
        "image": "/restaurants/bella-nosh-cafe-lounge.jpg",
        "chef": "Bella Nosh Kitchen",
        "tags": [
            "Cafe",
            "Lounge",
            "Multi-Cuisine"
        ],
        "availableSlots": [
            "14:00",
            "15:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 60,
        "featured": true,
        "exclusive": true,
        "status": "approved"
    },
    {
        "ownerKey": "owner002",
        "name": "Gulshan Dhaba",
        "slug": "gulshan-dhaba",
        "description": "A popular vegetarian dhaba on the Murthal highway, serving Punjabi favourites, stuffed parathas, traditional curries, and Indian breads.",
        "cuisine": "North Indian",
        "priceRange": "$$",
        "rating": 4.1,
        "reviewCount": 25000,
        "location": "Murthal, Sonipat",
        "address": "49-50 Milestone, Grand Trunk Road, Murthal, Sonipat, Haryana 131039",
        "image": "/restaurant_2.jpg",
        "chef": "Traditional Punjabi Kitchen",
        "tags": [
            "Vegetarian",
            "Parathas",
            "Punjabi Cuisine"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 80,
        "featured": true,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner003",
        "name": "Sindhu Pahalwan Dhaba",
        "slug": "sindhu-pahalwan-dhaba",
        "description": "A well-known vegetarian restaurant in Murthal, famous for stuffed parathas served with white butter, curd, and traditional Punjabi accompaniments.",
        "cuisine": "North Indian",
        "priceRange": "$$",
        "rating": 4.3,
        "reviewCount": 31000,
        "location": "Murthal, Sonipat",
        "address": "49th Milestone, Grand Trunk Road, Murthal, Sonipat, Haryana 131039",
        "image": "/restaurant_3.jpg",
        "chef": "Pahalwan Kitchen",
        "tags": [
            "Vegetarian",
            "Stuffed Parathas",
            "Family Dining"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 100,
        "featured": true,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner006",
        "name": "5Monkey Bistro",
        "slug": "5monkey-bistro",
        "description": "A modern bistro in Sector 15, Sonipat, offering a cafe-style dining experience with continental-inspired dishes, beverages, and desserts.",
        "cuisine": "Continental",
        "priceRange": "$$",
        "rating": 4.8,
        "reviewCount": 1190,
        "location": "Sector 15, Sonipat",
        "address": "SCO 150C, Near Cut and Style Salon, Sector 15, Sonipat, Haryana 131001",
        "image": "/restaurant_6.jpg",
        "chef": "5Monkey Kitchen",
        "tags": [
            "Bistro",
            "Continental",
            "Cafe"
        ],
        "availableSlots": [
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 45,
        "featured": true,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner007",
        "name": "Rasoi Dhaba",
        "slug": "rasoi-dhaba",
        "description": "A vegetarian highway restaurant near Badh Khalsa, Sonipat, serving traditional North Indian and Punjabi meals, curries, and Indian breads.",
        "cuisine": "Punjabi",
        "priceRange": "$$",
        "rating": 4,
        "reviewCount": 6400,
        "location": "Badh Khalsa, Sonipat",
        "address": "Grand Trunk Road, Sector 39, Badh Khalsa, Sonipat, Haryana 131029",
        "image": "/restaurant_7.jpg",
        "chef": "Rasoi Kitchen",
        "tags": [
            "Vegetarian",
            "Punjabi Food",
            "Dhaba"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 80,
        "featured": false,
        "exclusive": false,
        "status": "approved"
    },
    {
        "ownerKey": "owner008",
        "name": "Haldiram's Murthal",
        "slug": "haldirams-murthal",
        "description": "A vegetarian family restaurant and sweets destination on GT Karnal Road, serving Indian snacks, chaat, North Indian meals, and desserts.",
        "cuisine": "Indian Vegetarian",
        "priceRange": "$$",
        "rating": 4.8,
        "reviewCount": 4600,
        "location": "Murthal, Sonipat",
        "address": "Ground Floor, GT Karnal Road, Murthal, Sonipat, Haryana 131039",
        "image": "/restaurants/haldirams-murthal.jpg",
        "chef": "Haldiram's Kitchen",
        "tags": [
            "Vegetarian",
            "Indian Snacks",
            "Sweets"
        ],
        "availableSlots": [
            "09:00",
            "10:00",
            "12:00",
            "13:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
        ],
        "totalSeats": 70,
        "featured": false,
        "exclusive": false,
        "status": "approved"
    },
];
