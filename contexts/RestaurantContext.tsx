import { RestaurantAccess, restaurantTeamService } from '@/services/restaurantTeamService';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface RestaurantContextType {
    restaurants: RestaurantAccess[];
    currentRestaurant: RestaurantAccess | null;
    isLoading: boolean;
    switchRestaurant: (restaurantId: string) => void;
    refreshRestaurants: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
    const [restaurants, setRestaurants] = useState<RestaurantAccess[]>([]);
    const [currentRestaurant, setCurrentRestaurant] = useState<RestaurantAccess | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadRestaurants = async () => {
        try {
            setIsLoading(true);
            const { data } = await restaurantTeamService.getMyRestaurants();
            if (data) {
                setRestaurants(data);
                // If no current restaurant or current one not in list, select first
                if (!currentRestaurant || !data.find(r => r.restaurant_id === currentRestaurant.restaurant_id)) {
                    if (data.length > 0) {
                        setCurrentRestaurant(data[0]);
                    } else {
                        setCurrentRestaurant(null);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load restaurants:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRestaurants();
    }, []);

    const switchRestaurant = (restaurantId: string) => {
        const restaurant = restaurants.find(r => r.restaurant_id === restaurantId);
        if (restaurant) {
            setCurrentRestaurant(restaurant);
        }
    };

    return (
        <RestaurantContext.Provider
            value={{
                restaurants,
                currentRestaurant,
                isLoading,
                switchRestaurant,
                refreshRestaurants: loadRestaurants,
            }}
        >
            {children}
        </RestaurantContext.Provider>
    );
}

export function useRestaurant() {
    const context = useContext(RestaurantContext);
    if (context === undefined) {
        throw new Error('useRestaurant must be used within a RestaurantProvider');
    }
    return context;
}
