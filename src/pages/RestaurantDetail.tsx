// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useAppContext } from "../context/AppContext.tsx";
// import Navbar from "../components/Navbar.tsx";
// import Footer from "../components/Footer.tsx";
// import AuthModal from "../components/AuthModal.tsx";
// import toast from "react-hot-toast";
// import Loader from "../components/Loader.tsx";
// import RestaurantHero from "../components/restaurant/RestaurantHero.tsx";
// import RestaurantInfo from "../components/restaurant/RestaurantInfo.tsx";
// import RestaurantReviews from "../components/restaurant/RestaurantReviews.tsx";
// import BookingWidget from "../components/restaurant/BookingWidget.tsx";
// import { dummyAvailability, dummyRestaurant } from "../assets/assets.ts";

// export default function RestaurantDetail() {
//     const { slug } = useParams<{ slug: string }>();
//     const { isAuthenticated, setAuthModalOpen } = useAppContext();
//     const navigate = useNavigate();

//     const [restaurant, setRestaurant] = useState<any>(null);
//     const [loading, setLoading] = useState(true);

//     // Booking Widget states
//     const [selectedDate, setSelectedDate] = useState("");
//     const [selectedGuests, setSelectedGuests] = useState("2");
//     const [selectedSlot, setSelectedSlot] = useState("");
//     const [slotsAvailability, setSlotsAvailability] = useState<any[]>([]);
//     const [loadingSlots, setLoadingSlots] = useState(false);

//     useEffect(() => {
//         const fetchRestaurant = async () => {
//             setRestaurant(dummyRestaurant.find((r) => r.slug === slug));
//             setLoading(false);
//         };

//         if (slug) {
//             fetchRestaurant();
//         }
//     }, [slug, navigate]);

//     useEffect(() => {
//         const fetchAvailability = async () => {
//             setSlotsAvailability(dummyAvailability);
//             setLoadingSlots(false);
//         };
//         fetchAvailability();
//     }, [restaurant?._id, selectedDate]);

//     if (loading) {
//         return <Loader text="Loading Restaurant Details..." />;
//     }

//     if (!restaurant) return null;

//     const handleReserveClick = () => {
//         if (!selectedSlot) {
//             toast.error("Please select a dining time slot.");
//             return;
//         }

//         if (!isAuthenticated) {
//             setAuthModalOpen(true);
//             return;
//         }

//         // Redirect to confirmation page with query params
//         navigate(`/booking/${restaurant.slug}?slot=${selectedSlot}&date=${selectedDate}&guests=${selectedGuests}`);
//     };

//     return (
//         <div className="min-h-screen bg-surface flex flex-col pt-20">
//             <Navbar />
//             <AuthModal />

//             {/* Hero Image Section */}
//             <RestaurantHero restaurant={restaurant} />

//             {/* Split Content Section */}
//             <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
//                     {/* Left Column (Details, Menu, Reviews) */}
//                     <div className="lg:col-span-8 space-y-12">
//                         <RestaurantInfo restaurant={restaurant} />
//                         <RestaurantReviews />
//                     </div>

//                     {/* Right Column (Sticky Reservation Widget) */}
//                     <div className="lg:col-span-4 lg:sticky lg:top-36">
//                         <BookingWidget
//                             restaurant={restaurant}
//                             selectedDate={selectedDate}
//                             setSelectedDate={setSelectedDate}
//                             selectedGuests={selectedGuests}
//                             setSelectedGuests={setSelectedGuests}
//                             selectedSlot={selectedSlot}
//                             setSelectedSlot={setSelectedSlot}
//                             slotsAvailability={slotsAvailability}
//                             loadingSlots={loadingSlots}
//                             isAuthenticated={isAuthenticated}
//                             handleReserveClick={handleReserveClick}
//                         />
//                     </div>
//                 </div>
//             </main>

//             <Footer />
//         </div>
//     );
// }







/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext.tsx";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import AuthModal from "../components/AuthModal.tsx";
import toast from "react-hot-toast";
import Loader from "../components/Loader.tsx";
import RestaurantHero from "../components/restaurant/RestaurantHero.tsx";
import RestaurantInfo from "../components/restaurant/RestaurantInfo.tsx";
import RestaurantReviews from "../components/restaurant/RestaurantReviews.tsx";
import BookingWidget from "../components/restaurant/BookingWidget.tsx";
import api from "../lib/api.ts";

export default function RestaurantDetail() {
    const { slug } = useParams<{ slug: string }>();
    const { isAuthenticated, setAuthModalOpen } = useAppContext();
    const navigate = useNavigate();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Booking Widget states
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedGuests, setSelectedGuests] = useState("2");
    const [selectedSlot, setSelectedSlot] = useState("");
    const [slotsAvailability, setSlotsAvailability] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const fetchRestaurant = async () => {
            if (!slug) {
                setError("Restaurant not found.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");
            setRestaurant(null);

            try {
                const response = await api.get(
                    `/restaurants/slug/${encodeURIComponent(slug)}`,
                    { signal: controller.signal }
                );

                const restaurantData =
                    response.data.restaurant ?? response.data.data ?? response.data;

                if (!restaurantData?._id) {
                    throw new Error("Restaurant not found.");
                }

                setRestaurant(restaurantData);
            } catch (err: any) {
                if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
                    return;
                }

                console.error("Restaurant fetch error:", err);
                setError(
                    err.response?.status === 404
                        ? "Restaurant not found."
                        : "Unable to load restaurant details. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchRestaurant();

        return () => controller.abort();
    }, [slug]);

    // Availability will be connected to the backend in our next step.
    // useEffect(() => {
    //     setSlotsAvailability([]);
    //     setSelectedSlot("");
    //     setLoadingSlots(false);
    // }, [restaurant?._id, selectedDate]);
useEffect(() => {
    if (!restaurant?._id || !selectedDate) {
        setSlotsAvailability([]);
        setSelectedSlot("");
        setLoadingSlots(false);
        return;
    }

    const controller = new AbortController();

    const fetchAvailability = async () => {
        setLoadingSlots(true);
        setSelectedSlot("");

        try {
            const response = await api.get(
                `/availability/${restaurant._id}`,
                {
                    params: { date: selectedDate },
                    signal: controller.signal,
                }
            );

            setSlotsAvailability(response.data.slots || []);
        } catch (error: any) {
            if (error.code === "ERR_CANCELED") return;

            console.error("Availability error:", error);
            setSlotsAvailability([]);
            toast.error("Unable to load available time slots.");
        } finally {
            if (!controller.signal.aborted) {
                setLoadingSlots(false);
            }
        }
    };

    fetchAvailability();

    return () => controller.abort();
}, [restaurant?._id, selectedDate]);


    if (loading) {
        return <Loader text="Loading Restaurant Details..." />;
    }

    if (error || !restaurant) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <Navbar />
                <main className="grow flex flex-col items-center justify-center px-6 text-center">
                    <h2 className="text-2xl font-semibold mb-3">
                        {error || "Restaurant not found."}
                    </h2>
                    <button
                        onClick={() => navigate("/search")}
                        className="px-6 py-3 rounded-lg bg-primary text-white"
                    >
                        Browse Restaurants
                    </button>
                </main>
                <Footer />
            </div>
        );
    }

    const handleReserveClick = () => {
        if (!selectedDate) {
            toast.error("Please select a dining date.");
            return;
        }

        if (!selectedSlot) {
            toast.error("Please select a dining time slot.");
            return;
        }

        if (!isAuthenticated) {
            setAuthModalOpen(true);
            return;
        }

        navigate(
            `/booking/${restaurant.slug}?slot=${encodeURIComponent(selectedSlot)}&date=${encodeURIComponent(selectedDate)}&guests=${encodeURIComponent(selectedGuests)}`
        );
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">
            <Navbar />
            <AuthModal />

            <RestaurantHero restaurant={restaurant} />

            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-8 space-y-12">
                        <RestaurantInfo restaurant={restaurant} />
                        <RestaurantReviews />
                    </div>

                    <div className="lg:col-span-4 lg:sticky lg:top-36">
                        <BookingWidget
                            restaurant={restaurant}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            selectedGuests={selectedGuests}
                            setSelectedGuests={setSelectedGuests}
                            selectedSlot={selectedSlot}
                            setSelectedSlot={setSelectedSlot}
                            slotsAvailability={slotsAvailability}
                            loadingSlots={loadingSlots}
                            isAuthenticated={isAuthenticated}
                            handleReserveClick={handleReserveClick}
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}