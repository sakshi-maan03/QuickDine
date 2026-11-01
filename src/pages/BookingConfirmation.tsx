/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import type { FormEvent } from "react";

import {
    useParams,
    useSearchParams,
    useNavigate,
    Link,
} from "react-router-dom";

import { useAppContext } from "../context/AppContext.tsx";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import { ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../components/Loader.tsx";

import BookingSuccess from "../components/booking/BookingSuccess.tsx";
import BookingSummary from "../components/booking/BookingSummary.tsx";
import BookingForm from "../components/booking/BookingForm.tsx";

import api from "../lib/api";

export default function BookingConfirmation() {
    const { slug } = useParams<{ slug: string }>();

    const [searchParams] = useSearchParams();

    const { user } = useAppContext();

    const navigate = useNavigate();

    // Restaurant state
    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // Booking state
    const [confirming, setConfirming] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

    // Guest form state
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [occasion, setOccasion] = useState("");
    const [specialRequests, setSpecialRequests] = useState("");

    // Reservation details from URL
    const slot = searchParams.get("slot") || "";
    const date = searchParams.get("date") || "";
    const guests = searchParams.get("guests") || "2";

    // Fetch actual restaurant details from backend
    useEffect(() => {
        let cancelled = false;

        const fetchRestaurant = async () => {
            if (!slug) {
                setFetchError("Restaurant information is missing.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setFetchError("");

                const response = await api.get(
                    `/restaurants/slug/${encodeURIComponent(slug)}`
                );

                console.log(
                    "RESTAURANT API RESPONSE:",
                    response.data
                );

                const restaurantData =
                    response.data?.restaurant ??
                    response.data?.data?.restaurant ??
                    response.data?.data;

                if (!restaurantData?._id) {
                    throw new Error(
                        "Restaurant details were not found in the server response."
                    );
                }

                if (!cancelled) {
                    setRestaurant(restaurantData);
                }
            } catch (error: any) {
                console.error(
                    "Failed to fetch restaurant:",
                    error
                );

                if (!cancelled) {
                    setRestaurant(null);

                    setFetchError(
                        error?.response?.data?.message ||
                        error?.message ||
                        "Unable to load restaurant details."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchRestaurant();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    // Prefill guest details when user information loads
    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");

            if (user.phone) {
                setPhone(user.phone);
            }
        }
    }, [user]);

    // Confirm reservation through backend
    const handleConfirmSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!restaurant?._id) {
            toast.error("Restaurant details are unavailable.");
            return;
        }

        if (!slot || !date) {
            toast.error(
                "Reservation details are missing. Please return to the restaurant page."
            );
            return;
        }

        if (!user) {
            toast.error("Please log in before making a reservation.");
            navigate("/login");
            return;
        }

        if (!name.trim() || !email.trim() || !phone.trim()) {
            toast.error(
                "Please fill in your name, email, and phone number."
            );
            return;
        }

        const guestCount = Number(guests);

        if (
            !Number.isInteger(guestCount) ||
            guestCount < 1 ||
            guestCount > 20
        ) {
            toast.error("Please select a valid number of guests.");
            return;
        }

        try {
            setConfirming(true);

            const response = await api.post("/bookings", {
                restaurantId: restaurant._id,
                date,
                time: slot,
                guests: guestCount,
                occasion,
                specialRequests,
                guestName: name.trim(),
                guestEmail: email.trim(),
                guestPhone: phone.trim(),
            });

            if (!response.data?.booking) {
                throw new Error(
                    "The server did not return the confirmed booking."
                );
            }

            setConfirmedBooking(response.data.booking);

            toast.success(
                "Reservation confirmed successfully!"
            );

        } catch (error: any) {
            console.error(
                "Booking submission failed:",
                error
            );

            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Unable to confirm your reservation. Please try again.";

            toast.error(errorMessage);

        } finally {
            setConfirming(false);
        }
    };

    // Loading screen
    if (loading) {
        return (
            <Loader text="Retrieving Dining Details..." />
        );
    }

    // Restaurant loading error
    if (!restaurant) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <Navbar />

                <main className="grow flex flex-col items-center justify-center px-6 py-20 text-center">
                    <h2 className="text-2xl font-semibold mb-3">
                        Unable to Load Restaurant
                    </h2>

                    <p className="text-gray-500 mb-6">
                        {fetchError ||
                            "Restaurant details could not be found."}
                    </p>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-primary text-white rounded-lg"
                    >
                        Go Back
                    </button>
                </main>

                <Footer />
            </div>
        );
    }

    // Booking success screen
    if (confirmedBooking) {
        return (
            <div className="min-h-screen bg-surface flex flex-col pt-20">
                <Navbar />

                <main className="grow flex items-center justify-center py-12 px-6">
                    <BookingSuccess
                        confirmedBooking={confirmedBooking}
                        restaurant={restaurant}
                        date={date}
                        slot={slot}
                        guests={guests}
                    />
                </main>

                <Footer />
            </div>
        );
    }

    // Main booking page
    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">
            <Navbar />

            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">

                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-10 pb-4 border-b border-outline-variant/10 text-xs text-black/55">

                    <Link
                        to={`/restaurant/${restaurant.slug}`}
                        className="hover:text-primary transition-colors"
                    >
                        {restaurant.name}
                    </Link>

                    <ChevronRight size={14} />

                    <span className="text-primary">
                        Details & Confirmation
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                    {/* Reservation summary */}
                    <div className="lg:col-span-5">
                        <BookingSummary
                            restaurant={restaurant}
                            date={date}
                            slot={slot}
                            guests={guests}
                        />
                    </div>

                    {/* Guest details form */}
                    <div className="lg:col-span-7">
                        <BookingForm
                            name={name}
                            setName={setName}
                            email={email}
                            setEmail={setEmail}
                            phone={phone}
                            setPhone={setPhone}
                            occasion={occasion}
                            setOccasion={setOccasion}
                            specialRequests={specialRequests}
                            setSpecialRequests={setSpecialRequests}
                            confirming={confirming}
                            onSubmit={handleConfirmSubmit}
                        />
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}