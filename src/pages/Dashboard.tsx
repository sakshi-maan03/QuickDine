/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.tsx";

import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import RestaurantCard from "../components/RestaurantCard.tsx";
import AuthModal from "../components/AuthModal.tsx";

import {
    CalendarIcon,
    UsersIcon,
    ClockIcon,
    MapPinIcon,
    CalendarDaysIcon,
} from "lucide-react";

import toast from "react-hot-toast";

import { dummyFeaturedRestaurants } from "../assets/assets.ts";
import api from "../lib/api";

export default function Dashboard() {
    const { user } = useAppContext();

    const [bookings, setBookings] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);

    const [loadingBookings, setLoadingBookings] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    // Get today's date in local YYYY-MM-DD format.
    const getTodayDate = () => {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    // Convert a date into YYYY-MM-DD without timezone shifting.
    const getDateKey = (date: string) => {
        return date ? date.substring(0, 10) : "";
    };

    // Format booking time correctly.
    const formatTime = (time: string) => {
        if (!time) return "Time unavailable";

        const [hours, minutes] = time.split(":").map(Number);

        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;

        return `${formattedHours}:${String(minutes).padStart(2, "0")} ${period}`;
    };

    // Fetch bookings from MongoDB through backend.
    const fetchBookings = async () => {
        try {
            setLoadingBookings(true);

            const response = await api.get("/bookings");

            const fetchedBookings = response.data?.bookings;

            if (!Array.isArray(fetchedBookings)) {
                throw new Error("Invalid bookings response from server.");
            }

            setBookings(fetchedBookings);
        } catch (error: any) {
            console.error("Failed to fetch bookings:", error);

            toast.error(
                error?.response?.data?.message ||
                "Unable to load your bookings."
            );

            setBookings([]);
        } finally {
            setLoadingBookings(false);
        }
    };

    // Fetch bookings whenever logged-in user changes.
    useEffect(() => {
        if (user) {
            fetchBookings();
        } else {
            setBookings([]);
            setLoadingBookings(false);
        }
    }, [user]);

    // Recommendations.
    useEffect(() => {
        setRecommendations(dummyFeaturedRestaurants);
    }, []);

    // Cancel booking through backend.
    const handleCancelBooking = async (bookingId: string) => {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this booking?"
        );

        if (!confirmed) return;

        try {
            setCancellingId(bookingId);

            await api.delete(`/bookings/${bookingId}`);

            setBookings((previousBookings) =>
                previousBookings.map((booking) =>
                    booking._id === bookingId
                        ? { ...booking, status: "cancelled" }
                        : booking
                )
            );

            toast.success("Reservation cancelled successfully.");
        } catch (error: any) {
            console.error("Booking cancellation failed:", error);

            toast.error(
                error?.response?.data?.message ||
                "Unable to cancel reservation."
            );
        } finally {
            setCancellingId(null);
        }
    };

    if (!user) return null;

    const today = getTodayDate();

    // Upcoming confirmed bookings.
    const upcomingBookings = bookings.filter((booking) => {
        return (
            getDateKey(booking.date) >= today &&
            booking.status === "confirmed"
        );
    });

    // Past and cancelled bookings.
    const pastBookings = bookings.filter((booking) => {
        return (
            getDateKey(booking.date) < today ||
            booking.status !== "confirmed"
        );
    });

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">
            <Navbar />
            <AuthModal />

            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">

                <div className="grow space-y-10">

                    {/* Welcome Header */}
                    <div className="pb-4 border-b border-outline-variant/10">
                        <h2 className="font-display text-2xl md:text-3xl font-semibold text-primary">
                            Welcome back, {user.name.split(" ")[0]}
                        </h2>

                        <p className="text-xs text-black/55 mt-1.5">
                            Manage your upcoming dining experiences.
                        </p>
                    </div>

                    <div className="space-y-10">

                        {/* Upcoming Reservations */}
                        <div className="space-y-4">

                            <h3 className="font-display text-lg font-medium text-primary">
                                Upcoming Bookings
                            </h3>

                            {loadingBookings ? (
                                <div className="bg-white border border-outline-variant/10 p-12 text-center flex justify-center">
                                    <div className="w-6 h-6 border-2 border-outline-variant/30 border-t-secondary rounded-full animate-spin"></div>
                                </div>
                            ) : upcomingBookings.length === 0 ? (
                                <div className="bg-white border border-outline-variant/10 p-12 text-center rounded-md">

                                    <CalendarDaysIcon
                                        size={36}
                                        className="mx-auto text-outline-variant mb-2"
                                    />

                                    <p className="text-xs text-black/55 italic">
                                        No upcoming reservations scheduled.
                                    </p>

                                    <Link
                                        to="/search"
                                        className="inline-block mt-4 bg-primary hover:bg-secondary text-white text-[10px] font-medium tracking-widest uppercase px-6 py-2.5 transition-colors"
                                    >
                                        Book a Table
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">

                                    {upcomingBookings.map((booking) => {
                                        const restaurant = booking.restaurant;

                                        return (
                                            <div
                                                key={booking._id}
                                                className="bg-white border border-outline-variant/20 rounded-md p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                                            >

                                                {/* Restaurant Information */}
                                                <div className="flex gap-4">

                                                    <div className="w-16 h-16 rounded-sm overflow-hidden shrink-0 bg-surface">

                                                        {restaurant?.image ? (
                                                            <img
                                                                src={restaurant.image}
                                                                alt={restaurant.name || "Restaurant"}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                                No image
                                                            </div>
                                                        )}

                                                    </div>

                                                    <div className="space-y-1">

                                                        <span className="text-[9px] font-medium text-secondary tracking-widest uppercase">
                                                            {restaurant?.cuisine || "Restaurant"}
                                                        </span>

                                                        <h4 className="font-display text-base font-medium text-primary">
                                                            {restaurant?.name || "Restaurant details unavailable"}
                                                        </h4>

                                                        <p className="text-xs text-black/55 flex items-center gap-1">
                                                            <MapPinIcon size={12} />
                                                            {restaurant?.location || restaurant?.address || "Location unavailable"}
                                                        </p>

                                                    </div>
                                                </div>

                                                {/* Booking Details */}
                                                <div className="flex flex-wrap items-center gap-6 text-xs text-on-surface bg-surface-container-low p-4 rounded-md border border-outline-variant/10 w-full md:w-auto">

                                                    <div className="flex items-center gap-2 pr-4 md:border-r border-outline-variant/20">
                                                        <CalendarIcon size={14} className="text-secondary" />

                                                        <span className="font-medium">
                                                            {new Date(
                                                                `${getDateKey(booking.date)}T00:00:00`
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 pr-4 md:border-r border-outline-variant/20">
                                                        <ClockIcon size={14} className="text-secondary" />

                                                        <span className="font-medium">
                                                            {formatTime(booking.time)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <UsersIcon size={14} className="text-secondary" />

                                                        <span className="font-medium">
                                                            {booking.guests} Guests
                                                        </span>
                                                    </div>

                                                </div>

                                                {/* Cancel Button */}
                                                <div className="flex gap-3 w-full md:w-auto justify-end">

                                                    <button
                                                        onClick={() =>
                                                            handleCancelBooking(booking._id)
                                                        }
                                                        disabled={cancellingId === booking._id}
                                                        className="px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase text-error hover:bg-error-container/20 border border-outline-variant/40 rounded-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {cancellingId === booking._id
                                                            ? "Cancelling..."
                                                            : "Cancel"}
                                                    </button>

                                                </div>

                                            </div>
                                        );
                                    })}

                                </div>
                            )}

                        </div>

                        {/* Dining History */}
                        {!loadingBookings && pastBookings.length > 0 && (
                            <div className="space-y-4">

                                <h3 className="font-display text-lg font-medium text-primary">
                                    Dining History
                                </h3>

                                <div className="bg-white border border-outline-variant/20 rounded-md overflow-hidden shadow-sm">

                                    <div className="overflow-x-auto">

                                        <table className="w-full text-left text-xs border-collapse">

                                            <thead>
                                                <tr className="bg-surface-container-low border-b border-outline-variant/10 text-[10px] font-medium tracking-wider text-black/55 uppercase">
                                                    <th className="p-4">Restaurant</th>
                                                    <th className="p-4">Date & Time</th>
                                                    <th className="p-4">Party</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-outline-variant/10">

                                                {pastBookings.map((booking) => {
                                                    const restaurant = booking.restaurant;

                                                    return (
                                                        <tr
                                                            key={booking._id}
                                                            className="hover:bg-surface/50"
                                                        >

                                                            <td className="p-4 font-medium text-primary">
                                                                {restaurant?.slug ? (
                                                                    <Link
                                                                        to={`/restaurant/${restaurant.slug}`}
                                                                        className="hover:text-secondary"
                                                                    >
                                                                        {restaurant.name}
                                                                    </Link>
                                                                ) : (
                                                                    restaurant?.name || "Restaurant unavailable"
                                                                )}
                                                            </td>

                                                            <td className="p-4">
                                                                {new Date(
                                                                    `${getDateKey(booking.date)}T00:00:00`
                                                                ).toLocaleDateString()}{" "}
                                                                at {formatTime(booking.time)}
                                                            </td>

                                                            <td className="p-4">
                                                                {booking.guests}{" "}
                                                                {booking.guests === 1
                                                                    ? "Guest"
                                                                    : "Guests"}
                                                            </td>

                                                            <td className="p-4">
                                                                <span
                                                                    className={`inline-block py-0.5 px-2 text-[9px] font-medium tracking-wider uppercase rounded-sm ${
                                                                        booking.status === "confirmed"
                                                                            ? "bg-secondary-container/30 text-on-secondary-container"
                                                                            : booking.status === "completed"
                                                                                ? "bg-green-100 text-green-800"
                                                                                : "bg-error-container text-on-error-container"
                                                                    }`}
                                                                >
                                                                    {booking.status}
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    );
                                                })}

                                            </tbody>
                                        </table>

                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="space-y-4 pt-10 border-t border-outline-variant/10">

                            <h3 className="font-display text-lg font-medium text-primary">
                                Recommended for You
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {recommendations.slice(0, 3).map((restaurant) => (
                                    <RestaurantCard
                                        key={restaurant._id}
                                        restaurant={restaurant}
                                    />
                                ))}

                            </div>
                        </div>
                    )}

                </div>
            </main>

            <Footer />
        </div>
    );
}