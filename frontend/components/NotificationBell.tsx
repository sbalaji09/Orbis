"use client";

import {useState, useEffect, useRef} from "react";
import {useAuth} from "@/hooks/useAuth";
import { fetchCostAnomalies, acknowledgeAnomaly, acknowledgeAllAnomalies, CostAnomaly} from "@/lib/cost-api-client";
import {Bell} from "lucide-react";

export default function NotificationBell() {
    const { session } = useAuth();
    const apiKey = session?.access_token ?? "";

    const [anomalies, setAnomalies] = useState<CostAnomaly[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!apiKey) {
            return;
        }

        let isMounted = true;

        const loadAnomalies = async () => {
            try {
                setIsLoading(true);
                const response = await fetchCostAnomalies(24, apiKey);
                if (!isMounted) {
                    return;
                }

                if (response && response.anomalies) {
                    setAnomalies(response.anomalies);
                } else {
                    setAnomalies([]);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setIsLoading(false);
            }
            
        };

        loadAnomalies();

        // loadAnomalies is scheduled to run every 60 seconds
        const intervalId = setInterval(loadAnomalies, 60000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        }

    }, [apiKey])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, []);

    return (
        <>
        </>
    )
};